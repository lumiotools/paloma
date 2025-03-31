"use client";

import type React from "react";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Marcellus_SC, Manuale } from "next/font/google";
import StatusBar from "@/components/status-bar";
import PalomaLogo from "@/components/paloma-logo";

const marcellusSC = Marcellus_SC({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-marcellus-sc",
});

const manuale = Manuale({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-manuale",
});

export default function WelcomePage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [question, setQuestion] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name && phone && !isSubmitting) {
      setIsSubmitting(true);

      // Store user information in localStorage
      localStorage.setItem("userName", name);
      localStorage.setItem("userPhone", phone);

      // Store initial question if provided
      if (question.trim()) {
        localStorage.setItem("initialQuestion", question.trim());
      }

      // Clear any existing conversation
      localStorage.removeItem("conversationId");

      // Navigate to chat page
      router.push("/chat");
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center px-6 py-0 relative bg-[#faf7f2]">
      <StatusBar />

      <div className="flex-1 flex flex-col items-center justify-center w-full max-w-md py-8">
        <PalomaLogo className="mb-12" />

        <h1
          className={`text-center font-normal mb-5 ${marcellusSC.className}`}
          style={{ fontSize: "28px" }}
        >
          Welcome to the Paloma Concierge
        </h1>

        <p
          className={`text-center mb-8 ${manuale.className}`}
          style={{ fontSize: "17px" }}
        >
          Ask any question about Paloma The Grandeur
        </p>

        <form onSubmit={handleSubmit} className="w-full space-y-4">
          <input
            type="text"
            placeholder="Enter your name"
            className={`w-full p-4 rounded-lg border border-gray-200 bg-white ${manuale.className} shadow-sm`}
            style={{ fontSize: "16px" }}
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

          <input
            type="tel"
            placeholder="Enter your phone number"
            className={`w-full p-4 rounded-lg border border-gray-200 bg-white ${manuale.className} shadow-sm`}
            style={{ fontSize: "16px" }}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
          />

          <textarea
            placeholder='Ask me something, like "who&apos;s the architect of Paloma The Grandeur?"'
            className={`w-full p-4 rounded-lg border border-gray-200 bg-white min-h-[120px] resize-none ${manuale.className} shadow-sm`}
            style={{ fontSize: "16px" }}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
          />

          <button
            type="submit"
            className={`w-full px-4 py-2 rounded-lg bg-[#d4b978] text-white font-medium ${
              manuale.className
            } shadow-sm ${isSubmitting ? "opacity-70" : ""}`}
            style={{ fontSize: "24px" }}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Processing..." : "Begin Chat"}
          </button>
        </form>
      </div>
    </main>
  );
}
