
function notFound(req, res, next) {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`
  });
}

function errorHandler(err, req, res, next) {
  console.error(err);

  if (res.headersSent) {
    return next(err);
  }

  const statusCode = Number(err.statusCode || err.status) || 500;

  res.status(statusCode).json({
    success: false,
    message:
      statusCode >= 500 && process.env.NODE_ENV === "production"
        ? "Internal server error"
        : err.message || "Internal server error"
  });
}

module.exports = { notFound, errorHandler };
