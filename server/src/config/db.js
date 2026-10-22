require("dotenv").config({
  path: require("node:path").resolve(__dirname, "../../.env"),
  quiet: true,
});

const { Pool } = require("pg");

const databaseUrl = process.env.DATABASE_URL;
const pool = new Pool({
  ...(databaseUrl
    ? { connectionString: databaseUrl }
    : {
        host: process.env.DB_HOST || "localhost",
        port: Number(process.env.DB_PORT || 5432),
        user: process.env.DB_USER || "postgres",
        password: process.env.DB_PASSWORD || "",
        database: process.env.DB_NAME || "teamflow_db",
      }),
  ...(process.env.DB_SSL === "true"
    ? { ssl: { rejectUnauthorized: false } }
    : {}),
  max: 10,
});
const queryPool = pool.query.bind(pool);

function toPostgresPlaceholders(sql) {
  let index = 0;
  return sql.replace(/\?/g, () => `$${++index}`);
}

async function executeWith(client, sql, values = []) {
  const query = client === pool ? queryPool : client.query.bind(client);
  const response = await query(toPostgresPlaceholders(sql), values);
  const result = Array.isArray(response)
    ? response[response.length - 1]
    : response;
  if (result.command === "SELECT") {
    return [result.rows, result.fields];
  }

  return [
    {
      insertId: result.rows?.[0]?.id,
      affectedRows: result.rowCount,
    },
    result.fields,
  ];
}

pool.query = (sql, values) => executeWith(pool, sql, values);
pool.execute = pool.query;
pool.getConnection = async () => {
  const client = await pool.connect();
  return {
    query: (sql, values) => executeWith(client, sql, values),
    execute: (sql, values) => executeWith(client, sql, values),
    beginTransaction: () => client.query("BEGIN"),
    commit: () => client.query("COMMIT"),
    rollback: () => client.query("ROLLBACK"),
    ping: () => client.query("SELECT 1"),
    release: () => client.release(),
  };
};

module.exports = pool;
