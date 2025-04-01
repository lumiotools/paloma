import mongoose from "mongoose";

const chatHistorySchema = new mongoose.Schema(
  {
    userIP: {
      type: String,
      required: true,
    },
    messages: [{ role: String, content: String }],
  },
  {
    timestamps: true,
  }
);

const ChatHistory = mongoose.models.ChatHistory || mongoose.model("ChatHistory", chatHistorySchema);

export default ChatHistory;