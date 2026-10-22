const { readFile } = require("node:fs/promises");
const path = require("node:path");
const pool = require("./db");

async function migrate() {
  console.log("Applying PostgreSQL schema...");
  const schemaPath = path.resolve(__dirname, "../../../database/schema.sql");
  const schema = await readFile(schemaPath, "utf8");
  await pool.query(schema);
  console.log("PostgreSQL schema is up to date.");
}

module.exports = migrate;

if (require.main === module) {
  migrate()
    .then(() => pool.end())
    .catch(async (err) => {
      console.error("Migration error:", err);
      await pool.end();
      process.exitCode = 1;
    });
}
