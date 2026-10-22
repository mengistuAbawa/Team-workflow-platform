
require("dotenv").config();

const app = require("./app");
const pool = require("./config/db");

const PORT = Number(process.env.PORT || 5000);

async function startServer() {
  try {
    const connection = await pool.getConnection();
    try {
      await connection.ping();
    } finally {
      connection.release();
    }

    const migrate = require("./config/migrate");
    await migrate();

    app.listen(PORT, () => {
      console.log(`TeamFlow API: http://localhost:${PORT}`);
      console.log(`Health check: http://localhost:${PORT}/api/health`);
    });
  } catch (error) {
    const details = error instanceof Error
      ? `${error.name}: ${error.message || "No error message provided."}\n${error.stack || ""}`
      : String(error);
    console.error(`Unable to start TeamFlow:\n${details}`);
    await pool.end().catch((closeError) => {
      console.error("Unable to close database pool after startup failure:", closeError.message);
    });
    process.exit(1);
  }
}

startServer();
