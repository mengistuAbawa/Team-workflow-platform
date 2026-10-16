const pool = require("./db");

async function migrate() {
  console.log("Starting database check and migration...");

  // 1. Add missing columns to tasks table if not existing
  const [taskCols] = await pool.query("DESCRIBE tasks");
  const taskColNames = taskCols.map((c) => c.Field);

  if (!taskColNames.includes("review_status")) {
    await pool.query(
      "ALTER TABLE tasks ADD COLUMN review_status ENUM('pending', 'approved', 'changes_requested') NULL DEFAULT NULL AFTER status"
    );
    console.log("Added review_status to tasks");
  }
  if (!taskColNames.includes("review_comment")) {
    await pool.query(
      "ALTER TABLE tasks ADD COLUMN review_comment TEXT NULL AFTER review_status"
    );
    console.log("Added review_comment to tasks");
  }
  if (!taskColNames.includes("reviewed_by")) {
    await pool.query(
      "ALTER TABLE tasks ADD COLUMN reviewed_by BIGINT UNSIGNED NULL AFTER review_comment"
    );
    console.log("Added reviewed_by to tasks");
  }
  if (!taskColNames.includes("reviewed_at")) {
    await pool.query(
      "ALTER TABLE tasks ADD COLUMN reviewed_at TIMESTAMP NULL DEFAULT NULL AFTER reviewed_by"
    );
    console.log("Added reviewed_at to tasks");
  }

  // 2. Notifications table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS notifications (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      user_id BIGINT UNSIGNED NOT NULL,
      title VARCHAR(255) NOT NULL,
      message TEXT NOT NULL,
      link VARCHAR(500) NULL,
      is_read TINYINT(1) NOT NULL DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      INDEX idx_notifications_user_read (user_id, is_read, created_at)
    ) ENGINE=InnoDB;
  `);
  console.log("Verified notifications table");

  // 3. Conversations table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS conversations (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      project_id BIGINT UNSIGNED NULL,
      conversation_type ENUM('project', 'group', 'private') NOT NULL DEFAULT 'project',
      name VARCHAR(150) NULL,
      created_by BIGINT UNSIGNED NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT fk_conversations_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
      CONSTRAINT fk_conversations_creator FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
      INDEX idx_conversations_project (project_id)
    ) ENGINE=InnoDB;
  `);
  console.log("Verified conversations table");

  // 4. Conversation members
  await pool.query(`
    CREATE TABLE IF NOT EXISTS conversation_members (
      conversation_id BIGINT UNSIGNED NOT NULL,
      user_id BIGINT UNSIGNED NOT NULL,
      joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      last_read_at TIMESTAMP NULL DEFAULT NULL,
      PRIMARY KEY (conversation_id, user_id),
      CONSTRAINT fk_conversation_members_conv FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
      CONSTRAINT fk_conversation_members_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      INDEX idx_conversation_members_user (user_id)
    ) ENGINE=InnoDB;
  `);
  console.log("Verified conversation_members table");

  // 5. Messages table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS messages (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      conversation_id BIGINT UNSIGNED NOT NULL,
      sender_id BIGINT UNSIGNED NOT NULL,
      message_type ENUM('text', 'file', 'system') NOT NULL DEFAULT 'text',
      content TEXT NULL,
      attachment_url VARCHAR(500) NULL,
      reply_to_message_id BIGINT UNSIGNED NULL,
      is_edited BOOLEAN NOT NULL DEFAULT FALSE,
      edited_at TIMESTAMP NULL DEFAULT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT fk_messages_conversation FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
      CONSTRAINT fk_messages_sender FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
      CONSTRAINT fk_messages_reply FOREIGN KEY (reply_to_message_id) REFERENCES messages(id) ON DELETE SET NULL,
      INDEX idx_messages_conversation_created (conversation_id, created_at),
      INDEX idx_messages_sender (sender_id)
    ) ENGINE=InnoDB;
  `);
  console.log("Verified messages table");

  // 6. Message reads table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS message_reads (
      message_id BIGINT UNSIGNED NOT NULL,
      user_id BIGINT UNSIGNED NOT NULL,
      read_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (message_id, user_id),
      CONSTRAINT fk_message_reads_msg FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE,
      CONSTRAINT fk_message_reads_usr FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      INDEX idx_message_reads_user (user_id)
    ) ENGINE=InnoDB;
  `);
  console.log("Verified message_reads table");

  // 7. Task attachments
  await pool.query(`
    CREATE TABLE IF NOT EXISTS task_attachments (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      task_id BIGINT UNSIGNED NOT NULL,
      uploaded_by BIGINT UNSIGNED NOT NULL,
      file_name VARCHAR(255) NOT NULL,
      file_url VARCHAR(500) NOT NULL,
      mime_type VARCHAR(150) NULL,
      file_size BIGINT UNSIGNED NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_task_attachments_task FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
      CONSTRAINT fk_task_attachments_user FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE CASCADE,
      INDEX idx_task_attachments_task (task_id)
    ) ENGINE=InnoDB;
  `);
  console.log("Verified task_attachments table");

  // 8. Task dependencies
  await pool.query(`
    CREATE TABLE IF NOT EXISTS task_dependencies (
      task_id BIGINT UNSIGNED NOT NULL,
      depends_on_task_id BIGINT UNSIGNED NOT NULL,
      created_by BIGINT UNSIGNED NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (task_id, depends_on_task_id),
      CONSTRAINT fk_task_dependencies_task FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
      CONSTRAINT fk_task_dependencies_parent FOREIGN KEY (depends_on_task_id) REFERENCES tasks(id) ON DELETE CASCADE,
      CONSTRAINT fk_task_dependencies_creator FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
      CONSTRAINT chk_task_dependency_not_self CHECK (task_id <> depends_on_task_id),
      INDEX idx_task_dependencies_parent (depends_on_task_id)
    ) ENGINE=InnoDB;
  `);
  console.log("Verified task_dependencies table");

  console.log("All database migrations applied successfully!");
}

module.exports = migrate;

if (require.main === module) {
  migrate()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("Migration error:", err);
      process.exit(1);
    });
}
