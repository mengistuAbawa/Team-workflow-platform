const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const pool = require("../config/db");

function createToken(user) {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is not configured.");
  }

  return jwt.sign({ sub: String(user.id) }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "1h",
  });
}

async function register(req, res, next) {
  try {
    const fullName = req.body.fullName?.trim();
    const email = req.body.email?.trim().toLowerCase();
    const password = req.body.password;
    const role = req.body.role || "member";

    if (!fullName || fullName.length > 120) {
      return res.status(400).json({
        success: false,
        message: "Full name is required and must be at most 120 characters.",
      });
    }

    if (!email || email.length > 190) {
      return res.status(400).json({
        success: false,
        message: "Enter a valid email address.",
      });
    }

    if (typeof password !== "string" || password.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must contain at least 8 characters.",
      });
    }

    if (password.length > 72) {
      return res.status(400).json({
        success: false,
        message: "Password must not exceed 72 characters.",
      });
    }

    if (!["admin", "manager", "member"].includes(role)) {
      return res.status(400).json({
        success: false,
        message: "Role must be admin, manager, or member.",
      });
    }

    const [existing] = await pool.execute(
      "SELECT id FROM users WHERE email = ? LIMIT 1",
      [email],
    );

    if (existing.length) {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists.",
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const [result] = await pool.execute(
      `INSERT INTO users (full_name, email, password_hash, role)
       VALUES (?, ?, ?, ?)
       RETURNING id`,
      [fullName, email, passwordHash, role],
    );

    const user = {
      id: result.insertId,
      full_name: fullName,
      email,
      avatar: null,
      role,
    };

    const token = createToken(user);

    return res.status(201).json({
      success: true,
      message: "Account created successfully.",
      data: { user, token },
    });
  } catch (error) {
    if (error.code === "23505") {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists.",
      });
    }

    next(error);
  }
}

async function createUser(req, res, next) {
  try {
    const fullName =
      typeof req.body.fullName === "string" ? req.body.fullName.trim() : "";
    const email =
      typeof req.body.email === "string"
        ? req.body.email.trim().toLowerCase()
        : "";
    const password = req.body.password;
    const role = req.body.role;

    if (!fullName || fullName.length > 120) {
      return res
        .status(400)
        .json({
          success: false,
          message: "Full name is required and must be at most 120 characters.",
        });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 190) {
      return res
        .status(400)
        .json({ success: false, message: "Enter a valid email address." });
    }
    if (
      typeof password !== "string" ||
      password.length < 8 ||
      password.length > 72
    ) {
      return res
        .status(400)
        .json({
          success: false,
          message: "Password must be 8 to 72 characters.",
        });
    }
    if (!["admin", "manager", "member"].includes(role)) {
      return res
        .status(400)
        .json({ success: false, message: "Choose a valid account role." });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const [result] = await pool.execute(
      `INSERT INTO users (full_name, email, password_hash, role)
       VALUES (?, ?, ?, ?)
       RETURNING id`,
      [fullName, email, passwordHash, role],
    );

    res.status(201).json({
      success: true,
      message: "Team account created successfully.",
      data: { user: { id: result.insertId, full_name: fullName, email, role } },
    });
  } catch (error) {
    if (error.code === "23505") {
      return res
        .status(409)
        .json({
          success: false,
          message: "An account with this email already exists.",
        });
    }
    next(error);
  }
}
async function login(req, res, next) {
  try {
    const email = req.body.email?.trim().toLowerCase();
    const password = req.body.password;

    if (!email || typeof password !== "string" || password.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required.",
      });
    }

    const [users] = await pool.execute(
      `SELECT id, full_name, email, password_hash, avatar, role, is_active
       FROM users
       WHERE email = ?
       LIMIT 1`,
      [email],
    );

    const user = users[0];

    // Use a generic message to avoid revealing which emails exist.
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    if (!user.is_active) {
      return res.status(403).json({
        success: false,
        message: "This account has been deactivated.",
      });
    }

    const safeUser = {
      id: user.id,
      full_name: user.full_name,
      email: user.email,
      avatar: user.avatar,
      role: user.role,
    };

    const token = createToken(safeUser);

    return res.status(200).json({
      success: true,
      message: "Login successful.",
      data: { user: safeUser, token },
    });
  } catch (error) {
    next(error);
  }
}

async function me(req, res) {
  return res.status(200).json({
    success: true,
    data: { user: req.user },
  });
}

async function updateProfile(req, res, next) {
  try {
    const fullName = (req.body.full_name || req.body.fullName || "").trim();
    const email = (req.body.email || "").trim().toLowerCase();

    if (!fullName || fullName.length > 120) {
      return res.status(400).json({
        success: false,
        message: "Full name is required and must be at most 120 characters.",
      });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 190) {
      return res.status(400).json({
        success: false,
        message: "Enter a valid email address.",
      });
    }

    const [existing] = await pool.execute(
      "SELECT id FROM users WHERE email = ? AND id <> ? LIMIT 1",
      [email, req.user.id],
    );

    if (existing.length) {
      return res.status(409).json({
        success: false,
        message: "This email address is already in use by another account.",
      });
    }

    await pool.execute(
      "UPDATE users SET full_name = ?, email = ? WHERE id = ?",
      [fullName, email, req.user.id],
    );

    const updatedUser = {
      ...req.user,
      full_name: fullName,
      email,
    };

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully.",
      data: { user: updatedUser },
    });
  } catch (error) {
    next(error);
  }
}

async function changePassword(req, res, next) {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || typeof currentPassword !== "string") {
      return res.status(400).json({
        success: false,
        message: "Current password is required.",
      });
    }

    if (
      !newPassword ||
      typeof newPassword !== "string" ||
      newPassword.length < 8 ||
      newPassword.length > 72
    ) {
      return res.status(400).json({
        success: false,
        message: "New password must be between 8 and 72 characters.",
      });
    }

    const [users] = await pool.execute(
      "SELECT password_hash FROM users WHERE id = ? LIMIT 1",
      [req.user.id],
    );

    if (!users.length) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    const validPassword = await bcrypt.compare(
      currentPassword,
      users[0].password_hash,
    );
    if (!validPassword) {
      return res.status(400).json({
        success: false,
        message: "Incorrect current password.",
      });
    }

    const newHash = await bcrypt.hash(newPassword, 12);
    await pool.execute("UPDATE users SET password_hash = ? WHERE id = ?", [
      newHash,
      req.user.id,
    ]);

    return res.status(200).json({
      success: true,
      message: "Password changed successfully.",
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  register,
  createUser,
  login,
  me,
  updateProfile,
  changePassword,
};
