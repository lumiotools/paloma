"use client";

import type React from "react";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Manuale, Marcellus_SC } from "next/font/google";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import StatusBar from "@/components/status-bar";
import PalomaLogo from "@/components/paloma-logo";
import { Send } from "lucide-react";
import { sendChatMessage } from "@/lib/api";

const manuale = Manuale({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-manuale",
});

const marcellusSC = Marcellus_SC({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-marcellus-sc",
});

type Source = {
  page: number;
  relevance: number;
  text: string;
};

type Message = {
  text: string;
  isUser: boolean;
  sources?: {
    [documentName: string]: Source[];
  };
};

export default function ChatPage() {
  const router = useRouter();
  const [userName, setUserName] = useState("");
  const [userPhone, setUserPhone] = useState("");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize user data and check for initial question
  useEffect(() => {
    const storedName = localStorage.getItem("userName");
    const storedPhone = localStorage.getItem("userPhone");
    const initialQuestion = localStorage.getItem("initialQuestion");
    const storedConversationId = localStorage.getItem("conversationId");

    if (!storedName || !storedPhone) {
      // If no user info in localStorage, redirect to home page
      router.push("/");
      return;
    }

    setUserName(storedName);
    setUserPhone(storedPhone);

    if (storedConversationId) {
      setConversationId(storedConversationId);
    }

    // If there's an initial question, add it to messages and send API request
    if (initialQuestion) {
      // First, update the messages state with the user's question
      const userMessage = initialQuestion;

      // Use a callback to ensure we have the latest state
      setMessages((currentMessages) => [
        ...currentMessages,
        { text: userMessage, isUser: true },
      ]);

      // Then send the API request
      handleInitialQuestion(initialQuestion);

      // Clear the stored question
      localStorage.removeItem("initialQuestion");
    }
  }, [router]);

  // Handle initial question
  const handleInitialQuestion = async (question: string) => {
    setIsLoading(true);

    try {
      const request = {
        message: question,
        first_name: userName || localStorage.getItem("userName") || "",
        phone_number: userPhone || localStorage.getItem("userPhone") || "",
      };

      const response = await sendChatMessage(request);

      // Save conversation ID
      setConversationId(response.conversation_id);
      localStorage.setItem("conversationId", response.conversation_id);

      // Add bot response to messages
      setMessages((currentMessages) => [
        ...currentMessages,
        {
          text: response.answer,
          isUser: false,
          sources: response.sources,
        },
      ]);
    } catch (error) {
      console.error("Error sending initial message:", error);

      setMessages((currentMessages) => [
        ...currentMessages,
        {
          text: "I'm sorry, I encountered an error. Please try again later.",
          isUser: false,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Handle sending a new message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || isLoading) return;

    const userMessage = newMessage;
    setMessages((currentMessages) => [
      ...currentMessages,
      { text: userMessage, isUser: true },
    ]);
    setNewMessage("");
    setIsLoading(true);

    try {
      const request = {
        message: userMessage,
        ...(conversationId
          ? { conversation_id: conversationId }
          : {
              first_name: userName,
              phone_number: userPhone,
            }),
      };

      const response = await sendChatMessage(request);

      // Save conversation ID if it's new
      if (!conversationId) {
        setConversationId(response.conversation_id);
        localStorage.setItem("conversationId", response.conversation_id);
      }

      setMessages((currentMessages) => [
        ...currentMessages,
        {
          text: response.answer,
          isUser: false,
          sources: response.sources,
        },
      ]);
    } catch (error) {
      console.error("Error sending message:", error);

      setMessages((currentMessages) => [
        ...currentMessages,
        {
          text: "I'm sorry, I encountered an error. Please try again later.",
          isUser: false,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // Debug function to log messages
  useEffect(() => {
    console.log("Current messages:", messages);
  }, [messages]);

  return (
    <main className="flex min-h-screen flex-col items-center px-6 py-0 relative bg-[#faf7f2]">
      <StatusBar />

      <div className="w-full max-w-md pt-12 pb-24 flex-1 flex flex-col">
        <h1
          className={`font-normal mb-6 ${marcellusSC.className}`}
          style={{ fontSize: "24px" }}
        >
          Hello, {userName}
        </h1>

        <PalomaLogo className="mx-auto mb-8" />

        <div className="flex-1 overflow-y-auto mb-6">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`mb-4 ${message.isUser ? "text-right" : "text-left"}`}
            >
              <div
                className={`inline-block rounded-3xl px-6 py-4 max-w-[80%] ${
                  manuale.className
                } ${
                  message.isUser
                    ? "bg-[#fdf6e3] text-left shadow-[0_2px_8px_rgba(0,0,0,0.06)]"
                    : "bg-white text-left shadow-[0_2px_10px_rgba(0,0,0,0.08)]"
                }`}
                style={{
                  textShadow: "0 0.2px 0.3px rgba(0,0,0,0.02)",
                }}
              >
                {message.isUser ? (
                  <div>{message.text}</div>
                ) : (
                  <div className="markdown-content">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {message.text}
                    </ReactMarkdown>
                  </div>
                )}
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="mb-4 text-left">
              <div className="inline-block rounded-3xl px-6 py-4 bg-white text-left shadow-[0_2px_10px_rgba(0,0,0,0.08)]">
                <div className="flex space-x-2">
                  <div className="w-2 h-2 rounded-full bg-gray-300 animate-pulse"></div>
                  <div
                    className="w-2 h-2 rounded-full bg-gray-300 animate-pulse"
                    style={{ animationDelay: "0.2s" }}
                  ></div>
                  <div
                    className="w-2 h-2 rounded-full bg-gray-300 animate-pulse"
                    style={{ animationDelay: "0.4s" }}
                  ></div>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        <form
          onSubmit={handleSendMessage}
          className="fixed bottom-6 left-6 right-6 max-w-md mx-auto"
        >
          <div className="relative flex items-center">
            <input
              type="text"
              placeholder="Type a message..."
              className={`w-full p-4 pr-16 rounded-full border border-gray-200 bg-white ${manuale.className} shadow-sm`}
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              disabled={isLoading}
            />
            <button
              type="submit"
              className={`absolute right-1 p-3 rounded-full bg-[#d4b978] text-white flex items-center justify-center shadow-sm ${
                isLoading ? "opacity-50 cursor-not-allowed" : ""
              }`}
              disabled={isLoading}
            >
              <Send size={20} className="rotate-45" />
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
