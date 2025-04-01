import connectDB from "@/config/database";
import { NextRequest, NextResponse } from "next/server";
import ChatHistory from "@/models/chatHistory";
import { headers } from "next/headers";

export const POST = async (request: NextRequest) => {
  try {
    const userIP = (await headers()).get("x-forwarded-for");

    if (userIP?.split(".").length !== 4) {
      throw new Error("User IP not found");
    }

    const { id, messages } = await request.json();

    await connectDB();

    let chatHistory;

    if (id) {
      chatHistory = await ChatHistory.findById(id);
    }

    if (!chatHistory) {
      chatHistory = await ChatHistory.create({ userIP, messages });
    } else {
      await ChatHistory.findByIdAndUpdate(id, { userIP, messages });
    }

    return NextResponse.json({
      success: true,
      message: "Chat history updated successfully",
      data: {
        id: chatHistory._id,
      },
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      message: (error as Error).message,
    });
  }
};
