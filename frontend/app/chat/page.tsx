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
import { ChatMessage, sendChatMessage, updateChatHistory } from "@/lib/api";

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
  id?: string;
};

export default function ChatPage() {
  const router = useRouter();
  const [userName, setUserName] = useState("");
  const [userPhone, setUserPhone] = useState("");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [chatId, setChatId] = useState<string | null>(null);

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
        { text: userMessage, isUser: true, id: `msg-${Date.now()}` },
      ]);

      // Then send the API request
      handleInitialQuestion(initialQuestion);

      // Clear the stored question
      localStorage.removeItem("initialQuestion");
    }

    // Trigger animations after component mounts
    setTimeout(() => {
      setIsLoaded(true);
    }, 100);
  }, [router]);

  // Handle initial question
  const handleInitialQuestion = async (question: string) => {
    setIsLoading(true);
    setIsTyping(true);

    try {
      const request = {
        message: question,
        first_name: userName || localStorage.getItem("userName") || "",
        phone_number: userPhone || localStorage.getItem("userPhone") || "",
      };

      const userMessage = {
        text: question,
        isUser: true,
        id: `msg-${Date.now()}`,
      }

      const streamingResponse = await sendChatMessage(request);

      const reader = streamingResponse.getReader();
      let newConversationId: string | null = null;
      let fullMessage = "";

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          // Convert the chunk to text
          const chunk = new TextDecoder().decode(value);

          // Split by newlines in case multiple JSON objects arrived
          const lines = chunk.split("\n").filter((line) => line.trim());

          for (const line of lines) {
              const data = JSON.parse(line);

              if (data.conversation_id) {
                newConversationId = data.conversation_id;
                if (!conversationId) {
                  setConversationId(newConversationId);
                  localStorage.setItem(
                    "conversationId",
                    newConversationId as string
                  );
                }

                
                setIsLoading(false);
              }

              if (data.message) {
                fullMessage += data.message;

                setMessages([
                  ...messages,
                  userMessage,
                  { text: fullMessage, isUser: false, id: `msg-${Date.now()}` },
                ]);
              }

              if (data.error) {
                throw new Error(data.error);
              }
          }
        }
      } finally {
        reader.releaseLock();
      }

      setMessages([
        ...messages,
        userMessage,
        { text: fullMessage, isUser: false, id: `msg-${Date.now()}` },
      ]);

      const chatMessages: ChatMessage[] = messages.map((message) => {
        return {
          role: message.isUser ? "user" : "assistant",
          content: message.text,
        };
      });

      chatMessages.push({
        role: "user",
        content: question,
      });
      chatMessages.push({
        role: "assistant",
        content: fullMessage,
      });

      const newChatId = await updateChatHistory(chatId, chatMessages);

      setChatId(newChatId);
    } catch (error) {
      console.error("Error sending initial message:", error);

      setMessages((currentMessages) => [
        ...currentMessages,
        {
          text: "I'm sorry, I encountered an error. Please try again later.",
          isUser: false,
          id: `msg-${Date.now()}`,
        },
      ]);
    } finally {
      setIsLoading(false);
      setIsTyping(false);
    }
  };

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Handle sending a new message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || isLoading || isTyping) return;

    const userMessage = { text: newMessage, isUser: true, id: `msg-${Date.now()}` };
    setMessages([
      ...messages,
      userMessage
    ]);
    setNewMessage("");
    setIsLoading(true);
    setIsTyping(true);

    try {
      const request = {
        message: newMessage,
        ...(conversationId
          ? { conversation_id: conversationId }
          : {
              first_name: userName,
              phone_number: userPhone,
            }),
      };

      const streamingResponse = await sendChatMessage(request);

      const reader = streamingResponse.getReader();
      let newConversationId: string | null = null;
      let fullMessage = "";

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          // Convert the chunk to text
          const chunk = new TextDecoder().decode(value);

          // Split by newlines in case multiple JSON objects arrived
          const lines = chunk.split("\n").filter((line) => line.trim());

          for (const line of lines) {
              const data = JSON.parse(line);

              if (data.conversation_id) {
                newConversationId = data.conversation_id;
                if (!conversationId) {
                  setConversationId(newConversationId);
                  localStorage.setItem(
                    "conversationId",
                    newConversationId as string
                  );
                }

                
                setIsLoading(false);
              }

              if (data.message) {
                fullMessage += data.message;

                setMessages([
                  ...messages,
                  userMessage,
                  { text: fullMessage, isUser: false, id: `msg-${Date.now()}` },
                ]);
              }

              if (data.error) {
                throw new Error(data.error);
              }
          }
        }
      } finally {
        reader.releaseLock();
      }

      setMessages([
        ...messages,
        userMessage,
        { text: fullMessage, isUser: false, id: `msg-${Date.now()}` },
      ]);

      const chatMessages: ChatMessage[] = messages.map((message) => {
        return {
          role: message.isUser ? "user" : "assistant",
          content: message.text,
        };
      });

      chatMessages.push({
        role: "user",
        content: newMessage,
      });
      chatMessages.push({
        role: "assistant",
        content: fullMessage,
      });

      const newChatId = await updateChatHistory(chatId, chatMessages)
      setChatId(newChatId)      
    } catch (error) {
      console.error("Error sending message:", error);

      setMessages((currentMessages) => [
        ...currentMessages,
        {
          text: "I'm sorry, I encountered an error. Please try again later.",
          isUser: false,
          id: `msg-${Date.now()}`,
        },
      ]);
    } finally {
      setIsLoading(false);
      setIsTyping(false);
    }
  };

  return (
    <main className="flex min-h-[90vh] flex-col items-center px-6 py-0 relative bg-[#faf7f2] overflow-hidden">
      <StatusBar />

      <div className="w-full max-w-md pt-12 pb-24 flex-1 flex flex-col">
        <h1
          className={`font-normal mb-6 ${
            marcellusSC.className
          } transition-all duration-700 ease-out transform ${
            isLoaded ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-8"
          }`}
          style={{ fontSize: "24px" }}
        >
          Hello, {userName}
        </h1>

        <div
          className={`transition-all duration-700 delay-200 ease-out transform ${
            isLoaded ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-8"
          }`}
        >
          <PalomaLogo className="mx-auto mb-8" />
        </div>

        <div
          className={`flex-1 overflow-y-auto mb-6 transition-all duration-700 delay-400 ease-out transform ${
            isLoaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          {messages.map((message, index) => (
            <div
              key={message.id || index}
              className={`mb-4 ${
                message.isUser ? "text-right" : "text-left"
              } animate-fadeIn`}
              style={{ animationDelay: `${index * 150}ms` }}
            >
              <div
                className={`inline-block rounded-3xl py-4 ${
                  manuale.className
                } ${
                  message.isUser
                    ? "bg-[#fdf6e3] text-left shadow-[0_2px_8px_rgba(0,0,0,0.06)] max-w-[80%] px-6"
                    : "text-left px-2"
                }`}
                style={{
                  textShadow: "0 0.2px 0.3px rgba(0,0,0,0.02)",
                }}
              >
                {message.isUser ? (
                  <div>{message.text}</div>
                ) : (
                  <div className="prose">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        h1: ({ node, ...props }) => (
                          <h1 className={`text-3xl font-bold`} {...props} />
                        ),
                      }}
                    >
                      {message.text}
                    </ReactMarkdown>
                  </div>
                )}
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="mb-4 text-left animate-fadeIn">
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

          {/* {messages.length === 0 && !isLoading && !isTyping && (
            <div className="flex-1 flex items-center justify-center text-gray-400 text-center animate-fadeIn">
              <p>Ask a question to get started</p>
            </div>
          )} */}

          <div ref={messagesEndRef} />
        </div>

        <form
          onSubmit={handleSendMessage}
          className={`fixed bottom-6 left-6 right-6 max-w-md mx-auto transition-all duration-700 delay-600 ease-out transform ${
            isLoaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <div className="relative flex items-center">
            <div className={`w-full rounded-full border border-gray-200 !bg-white ${manuale.className} shadow-sm`}>
              <input
                type="text"
                placeholder="Type a message..."
                className={`w-full p-4 pr-16 rounded-full ${manuale.className}`}
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                disabled={isLoading|| isTyping}
              />
            </div>
            <button
              type="submit"
              className={`absolute right-1 p-3 rounded-full bg-[#d4b978] text-white flex items-center justify-center shadow-sm transition-all duration-300 hover:bg-[#c9ad6e] ${
                isLoading || isTyping ? "opacity-50 cursor-not-allowed" : ""
              }`}
              disabled={isLoading || isTyping}
            >
              <Send size={20} className="rotate-45" />
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
