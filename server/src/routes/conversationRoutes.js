const express = require("express");
const { authenticate } = require("../middleware/auth");
const {
  listConversations,
  createConversation,
  getMessages,
  sendMessage,
  addConversationMembers,
} = require("../controllers/conversationController");

const router = express.Router();
router.use(authenticate);
router.get("/", listConversations);
router.post("/", createConversation);
router.get("/:id/messages", getMessages);
router.post("/:id/messages", sendMessage);
router.post("/:id/members", addConversationMembers);
module.exports = router;
