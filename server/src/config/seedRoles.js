const pool = require("./db");
const bcrypt = require("bcryptjs");

async function seedRoles() {
  console.log("Setting up role hierarchy and test users...");

  // Update existing user roles
  await pool.query("UPDATE users SET role = 'admin' WHERE id = 1");
  await pool.query("UPDATE users SET role = 'manager' WHERE id = 2");
  await pool.query("UPDATE users SET role = 'member' WHERE id = 3");

  // Create default admin user if not exists
  const [existingAdmin] = await pool.query(
    "SELECT id FROM users WHERE email = 'admin@teamflow.com'"
  );
  if (!existingAdmin.length) {
    const hash = await bcrypt.hash("Admin@123456", 12);
    await pool.query(
      "INSERT INTO users (full_name, email, password_hash, role, is_active) VALUES (?, ?, ?, 'admin', 1)",
      ["System Administrator", "admin@teamflow.com", hash]
    );
    console.log("Created default admin: admin@teamflow.com / Admin@123456");
  }

  // Create default manager user if not exists
  const [existingManager] = await pool.query(
    "SELECT id FROM users WHERE email = 'manager@teamflow.com'"
  );
  if (!existingManager.length) {
    const hash = await bcrypt.hash("Manager@123456", 12);
    await pool.query(
      "INSERT INTO users (full_name, email, password_hash, role, is_active) VALUES (?, ?, ?, 'manager', 1)",
      ["Project Manager", "manager@teamflow.com", hash]
    );
    console.log("Created default manager: manager@teamflow.com / Manager@123456");
  }

  // Create default team member user if not exists
  const [existingMember] = await pool.query(
    "SELECT id FROM users WHERE email = 'member@teamflow.com'"
  );
  if (!existingMember.length) {
    const hash = await bcrypt.hash("Member@123456", 12);
    await pool.query(
      "INSERT INTO users (full_name, email, password_hash, role, is_active) VALUES (?, ?, ?, 'member', 1)",
      ["Team Member", "member@teamflow.com", hash]
    );
    console.log("Created default member: member@teamflow.com / Member@123456");
  }

  const [users] = await pool.query(
    "SELECT id, full_name, email, role, is_active FROM users"
  );
  console.log("Current user list in database:");
  console.table(users);
}

module.exports = seedRoles;

if (require.main === module) {
  seedRoles()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
