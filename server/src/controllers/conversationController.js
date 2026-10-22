const pool = require("../config/db");
const { isValidId } = require("../utils/validators");

function fail(res, status, message) {
  return res.status(status).json({ success: false, message });
}

function handle(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

async function isConversationMember(conversationId, userId) {
  const [rows] = await pool.execute(
    "SELECT 1 FROM conversation_members WHERE conversation_id = ? AND user_id = ? LIMIT 1",
    [conversationId, userId]
  );
  return rows.length > 0;
}

async function getConversations(req, res) {
  const queryParams = [req.user.id, req.user.id, req.user.id, req.user.id];
  let projectFilter = "";
  if (req.query.project_id !== undefined) {
    if (!isValidId(req.query.project_id)) return fail(res, 400, "Invalid project ID.");
    projectFilter = " AND c.project_id = ?";
    queryParams.push(req.query.project_id);
  }

  const [conversations] = await pool.execute(
    `SELECT c.id, c.project_id, c.conversation_type, c.name, c.updated_at,
            p.name AS project_name,
            (SELECT m.content FROM messages m
             WHERE m.conversation_id = c.id ORDER BY m.id DESC LIMIT 1) AS last_message,
            (SELECT m.created_at FROM messages m
             WHERE m.conversation_id = c.id ORDER BY m.id DESC LIMIT 1) AS last_message_at,
            (SELECT COUNT(*) FROM messages m
             WHERE m.conversation_id = c.id AND m.sender_id <> ?
               AND NOT EXISTS (
                 SELECT 1 FROM message_reads mr
                 WHERE mr.message_id = m.id AND mr.user_id = ?
               )) AS unread_count,
            (SELECT u.full_name FROM conversation_members cm
             JOIN users u ON u.id = cm.user_id
             WHERE cm.conversation_id = c.id AND cm.user_id <> ?
             ORDER BY cm.joined_at LIMIT 1) AS other_user_name
     FROM conversations c
     JOIN conversation_members mine
       ON mine.conversation_id = c.id AND mine.user_id = ?
     LEFT JOIN projects p ON p.id = c.project_id
     WHERE 1 = 1${projectFilter}
     ORDER BY c.updated_at DESC`,
    queryParams
  );

  res.json({ success: true, data: { conversations } });
}

const listConversations = handle(getConversations);

const createConversation = handle(async (req, res) => {
  const { conversation_type: type = "private", project_id: projectId, recipient_id: recipientId, name } = req.body;
  if (!["project", "group", "private"].includes(type)) return fail(res, 400, "Invalid conversation type.");

  if (type === "private") {
    if (!isValidId(recipientId) || Number(recipientId) === Number(req.user.id)) return fail(res, 400, "Choose another active user to contact.");
    const [users] = await pool.execute("SELECT id FROM users WHERE id = ? AND is_active = 1 LIMIT 1", [recipientId]);
    if (!users.length) return fail(res, 404, "User not found.");

    const [existing] = await pool.execute(
      `SELECT c.id FROM conversations c
       JOIN conversation_members mine ON mine.conversation_id = c.id AND mine.user_id = ?
       JOIN conversation_members other ON other.conversation_id = c.id AND other.user_id = ?
       WHERE c.conversation_type = 'private' AND c.project_id IS NULL
         AND (SELECT COUNT(*) FROM conversation_members cm WHERE cm.conversation_id = c.id) = 2
       LIMIT 1`,
      [req.user.id, recipientId]
    );
    if (existing.length) {
      return res.json({ success: true, data: { conversation_id: existing[0].id } });
    }

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const [result] = await connection.execute(
        "INSERT INTO conversations (conversation_type, created_by) VALUES ('private', ?) RETURNING id",
        [req.user.id]
      );
      await connection.execute(
        "INSERT INTO conversation_members (conversation_id, user_id) VALUES (?, ?), (?, ?)",
        [result.insertId, req.user.id, result.insertId, recipientId]
      );
      await connection.commit();
      return res.status(201).json({ success: true, data: { conversation_id: result.insertId } });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  if (type === "project") {
    if (!isValidId(projectId)) return fail(res, 400, "A valid project_id is required.");
    const [projects] = await pool.execute(
      `SELECT p.id FROM projects p
       LEFT JOIN project_members pm ON pm.project_id = p.id AND pm.user_id = ?
       WHERE p.id = ? AND (p.owner_id = ? OR pm.user_id IS NOT NULL OR ? = 'admin') LIMIT 1`,
      [req.user.id, projectId, req.user.id, req.user.role]
    );
    if (!projects.length) return fail(res, 403, "Join this project before opening its conversation.");

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const [found] = await connection.execute(
        "SELECT id FROM conversations WHERE project_id = ? AND conversation_type = 'project' ORDER BY id LIMIT 1",
        [projectId]
      );
      let conversationId = found[0]?.id;
      if (!conversationId) {
        const [result] = await connection.execute(
          "INSERT INTO conversations (project_id, conversation_type, created_by) VALUES (?, 'project', ?) RETURNING id",
          [projectId, req.user.id]
        );
        conversationId = result.insertId;
      }
      await connection.execute(
        "INSERT INTO conversation_members (conversation_id, user_id) VALUES (?, ?) ON CONFLICT DO NOTHING",
        [conversationId, req.user.id]
      );
      await connection.execute(
        `INSERT INTO conversation_members (conversation_id, user_id)
         SELECT ?, p.owner_id FROM projects p WHERE p.id = ?
         ON CONFLICT DO NOTHING`,
        [conversationId, projectId]
      );
      await connection.execute(
        `INSERT INTO conversation_members (conversation_id, user_id)
         SELECT ?, pm.user_id FROM project_members pm WHERE pm.project_id = ?
         ON CONFLICT DO NOTHING`,
        [conversationId, projectId]
      );
      await connection.commit();
      return res.status(found.length ? 200 : 201).json({ success: true, data: { conversation_id: conversationId } });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  const cleanName = typeof name === "string" ? name.trim() : "";
  if (!cleanName || cleanName.length > 150) return fail(res, 400, "Group name is required (up to 150 characters).");
  const ids = [...new Set([req.user.id, ...(Array.isArray(req.body.member_ids) ? req.body.member_ids : [])].map(Number))];
  if (ids.some((id) => !isValidId(id))) return fail(res, 400, "Invalid group member ID.");
  const idPlaceholders = ids.map((_, index) => `$${index + 1}`).join(", ");
  const memberPlaceholders = ids
    .map((_, index) => `($1, $${index + 2})`)
    .join(", ");
  const [users] = await pool.execute(`SELECT id FROM users WHERE is_active = 1 AND id IN (${idPlaceholders})`, ids);
  if (users.length !== ids.length) return fail(res, 400, "All group members must be active users.");

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [result] = await connection.execute(
      "INSERT INTO conversations (conversation_type, name, created_by) VALUES ('group', ?, ?) RETURNING id",
      [cleanName, req.user.id]
    );
    await connection.query(
      `INSERT INTO conversation_members (conversation_id, user_id) VALUES ${memberPlaceholders}`,
      [result.insertId, ...ids]
    );
    await connection.commit();
    res.status(201).json({ success: true, data: { conversation_id: result.insertId } });
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
});

const getMessages = handle(async (req, res) => {
  const { id } = req.params;
  if (!isValidId(id)) return fail(res, 400, "Invalid conversation ID.");
  if (!(await isConversationMember(id, req.user.id))) return fail(res, 404, "Conversation not found.");
  const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 100, 1), 200);
  await pool.execute(
    `INSERT INTO message_reads (message_id, user_id)
     SELECT id, ? FROM messages
     WHERE conversation_id = ? AND sender_id <> ?
     ON CONFLICT (message_id, user_id) DO UPDATE SET read_at = CURRENT_TIMESTAMP`,
    [req.user.id, id, req.user.id]
  );
  const [messages] = await pool.execute(
    `SELECT m.id, m.conversation_id, m.sender_id, m.message_type, m.content,
            m.attachment_url, m.reply_to_message_id, m.is_edited, m.edited_at,
            m.created_at, u.full_name AS sender_name, u.avatar AS sender_avatar
     FROM messages m JOIN users u ON u.id = m.sender_id
     WHERE m.conversation_id = ? ORDER BY m.id DESC LIMIT ${limit}`,
    [id]
  );
  res.json({ success: true, data: { messages: messages.reverse() } });
});

const sendMessage = handle(async (req, res) => {
  const { id } = req.params;
  if (!isValidId(id)) return fail(res, 400, "Invalid conversation ID.");
  if (!(await isConversationMember(id, req.user.id))) return fail(res, 404, "Conversation not found.");
  const content = typeof req.body.content === "string" ? req.body.content.trim() : "";
  if (!content || content.length > 10000) return fail(res, 400, "Message is required and must be at most 10,000 characters.");
  const [result] = await pool.execute(
    "INSERT INTO messages (conversation_id, sender_id, message_type, content) VALUES (?, ?, 'text', ?) RETURNING id",
    [id, req.user.id, content]
  );
  await pool.execute("UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = ?", [id]);
  const [rows] = await pool.execute(
    `SELECT m.id, m.conversation_id, m.sender_id, m.message_type, m.content,
            m.created_at, u.full_name AS sender_name, u.avatar AS sender_avatar
     FROM messages m JOIN users u ON u.id = m.sender_id WHERE m.id = ?`,
    [result.insertId]
  );
  res.status(201).json({ success: true, data: { message: rows[0] } });
});

const addConversationMembers = handle(async (req, res) => {
  const { id } = req.params;
  const userIds = Array.isArray(req.body.user_ids) ? [...new Set(req.body.user_ids.map(Number))] : [];
  if (!isValidId(id) || !userIds.length || userIds.some((userId) => !isValidId(userId))) return fail(res, 400, "Provide valid user_ids.");
  const [rows] = await pool.execute("SELECT conversation_type, created_by, project_id FROM conversations WHERE id = ? LIMIT 1", [id]);
  if (!rows.length || !(await isConversationMember(id, req.user.id))) return fail(res, 404, "Conversation not found.");
  const conversation = rows[0];
  if (conversation.conversation_type === "private") return fail(res, 400, "Private conversations can only include two people.");
  if (conversation.conversation_type === "project") {
    const [projectMember] = await pool.execute(
      `SELECT 1 FROM projects p LEFT JOIN project_members pm ON pm.project_id = p.id AND pm.user_id = ?
       WHERE p.id = ? AND (p.owner_id = ? OR pm.user_id IS NOT NULL OR ? = 'admin') LIMIT 1`,
      [req.user.id, conversation.project_id, req.user.id, req.user.role]
    );
    if (!projectMember.length) return fail(res, 403, "Only project members can add collaborators.");
  } else if (Number(conversation.created_by) !== Number(req.user.id) && req.user.role !== "admin") {
    return fail(res, 403, "Only the group creator can add collaborators.");
  }
  const placeholders = userIds.map((_, index) => `$${index + 1}`).join(",");
  const [users] = await pool.execute(`SELECT id FROM users WHERE is_active = 1 AND id IN (${placeholders})`, userIds);
  if (users.length !== userIds.length) return fail(res, 400, "All collaborators must be active users.");
  const memberValues = userIds.map((userId, index) => `($1, $${index + 2})`).join(", ");
  await pool.query(
    `INSERT INTO conversation_members (conversation_id, user_id)
     VALUES ${memberValues} ON CONFLICT DO NOTHING`,
    [id, ...userIds]
  );
  res.status(201).json({ success: true, message: "Collaborators added." });
});

module.exports = { listConversations, createConversation, getMessages, sendMessage, addConversationMembers };


