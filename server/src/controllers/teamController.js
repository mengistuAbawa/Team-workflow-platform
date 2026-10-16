
const pool = require("../config/db");

const getTeamMembers = async (req, res, next) => {
  try {
    // Ensure the authenticated user exists
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    const [members] = await pool.execute(
      `SELECT id, full_name, email, avatar, role, is_active
       FROM users
       WHERE is_active = 1 AND id <> ?
       ORDER BY full_name ASC`,
      [req.user.id]
    );

    return res.status(200).json({
      success: true,
      data: {
        members,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getTeamMembers,
};
