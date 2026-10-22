
require("dotenv").config();

const app = require("./app");
const pool = require("./config/db");

const PORT = Number(process.env.PORT || 5000);

function formatStartupError(error, indent = "") {
  if (!(error instanceof Error)) return `${indent}${String(error)}`;

  const code = error.code ? ` [${error.code}]` : "";
  const location =
    error.address && error.port ? ` (${error.address}:${error.port})` : "";
  const message = error.message || "No error message provided.";
  const summary = `${indent}${error.name}${code}: ${message}${location}`;

  if (error instanceof AggregateError && error.errors.length) {
    return [
      summary,
      ...error.errors.map((cause) => formatStartupError(cause, `${indent}  `)),
    ].join("\n");
  }

  return summary;
}

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
    console.error(`Unable to start TeamFlow:\n${formatStartupError(error)}`);
    await pool.end().catch((closeError) => {
      console.error("Unable to close database pool after startup failure:", closeError.message);
    });
    process.exit(1);
  }
}

startServer();
