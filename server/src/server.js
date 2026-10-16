
require("dotenv").config();

const app = require("./app");
const pool = require("./config/db");

const PORT = Number(process.env.PORT || 5000);

async function startServer() {
  try {
    const connection = await pool.getConnection();

    await connection.ping();
    connection.release();

    const migrate = require("./config/migrate");
    await migrate();

    app.listen(PORT, () => {
      console.log(`TeamFlow API: http://localhost:${PORT}`);
      console.log(`Health check: http://localhost:${PORT}/api/health`);
    });
  } catch (error) {
    console.error("Unable to start TeamFlow:", error.message);
    process.exit(1);
  }
}

startServer();
