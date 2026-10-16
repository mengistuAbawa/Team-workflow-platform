
const jwt = require("jsonwebtoken");

function generateToken(userId) {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error("JWT_SECRET is missing from the server environment.");
  }

  return jwt.sign(
    { sub: String(userId) },
    secret,
    {
      expiresIn: process.env.JWT_EXPIRES_IN || "7d",
    }
  );
}

module.exports = generateToken;
