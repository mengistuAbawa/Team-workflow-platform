const express = require("express");
const { body, validationResult } = require("express-validator");

const {
  register,
  login,
  me,
  createUser,
  updateProfile,
  changePassword,
} = require("../controllers/authController");

const { authenticate, authorize } = require("../middleware/auth");

const router = express.Router();

function checkValidation(req, res, next) {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: "Please check the submitted information.",
      errors: errors.array().map((error) => ({
        field: error.path,
        message: error.msg,
      })),
    });
  }

  next();
}

// Register
router.post(
  "/register",
  [
    body("fullName")
      .isString()
      .withMessage("Full name must be text.")
      .trim()
      .notEmpty()
      .withMessage("Full name is required.")
      .isLength({ max: 120 })
      .withMessage("Full name is too long."),

    body("email")
      .isEmail()
      .withMessage("Enter a valid email.")
      .normalizeEmail()
      .isLength({ max: 190 })
      .withMessage("Email is too long."),

    body("password")
      .isString()
      .withMessage("Password must be text.")
      .isLength({ min: 8, max: 72 })
      .withMessage("Password must be 8-72 characters."),

    body("role")
      .optional()
      .isIn(["admin", "manager", "member"])
      .withMessage("Role must be admin, manager, or member."),
  ],
  checkValidation,
  register,
);

// Login
router.post(
  "/login",
  [
    body("email")
      .isEmail()
      .withMessage("Enter a valid email.")
      .normalizeEmail(),

    body("password").isString().withMessage("Password is required.").notEmpty(),
  ],
  checkValidation,
  login,
);

// Current authenticated user
router.get("/me", authenticate, me);

// Update user profile
router.patch("/profile", authenticate, updateProfile);

// Change user password
router.post("/change-password", authenticate, changePassword);

// Admin creates a user account
router.post("/users", authenticate, authorize("admin"), createUser);

module.exports = router;
