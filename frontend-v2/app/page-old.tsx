"use client";

import type React from "react";

import { useState, useEffect, useRef } from "react";
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
  const [isLoaded, setIsLoaded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Adjust container height based on viewport
  useEffect(() => {
    const adjustHeight = () => {
      if (containerRef.current) {
        const viewportHeight = window.innerHeight;
        const statusBarHeight = 40; // Approximate status bar height
        containerRef.current.style.height = `${
          viewportHeight - statusBarHeight
        }px`;
      }
    };

    // Initial adjustment
    adjustHeight();

    // Trigger animations after component mounts
    setIsLoaded(true);

    // Adjust on resize
    window.addEventListener("resize", adjustHeight);

    return () => {
      window.removeEventListener("resize", adjustHeight);
    };
  }, []);

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
    <main className="flex min-h-screen flex-col items-center px-6 py-0 relative bg-[#faf7f2] overflow-hidden">
      <StatusBar />

      <div ref={containerRef} className="w-full max-w-md flex flex-col">
        <div className="flex-1 flex flex-col justify-evenly">
          <div
            className={`transition-all duration-700 ease-out transform ${
              isLoaded
                ? "opacity-100 translate-y-0"
                : "opacity-0 -translate-y-8"
            }`}
          >
            <PalomaLogo className="mx-auto" />
          </div>

          <div
            className={`text-center mt-3 transition-all duration-700 delay-300 ease-out transform ${
              isLoaded
                ? "opacity-100 translate-y-0"
                : "opacity-0 -translate-y-8"
            }`}
          >
            <h1
              className={`font-normal ${marcellusSC.className}`}
              style={{ fontSize: "28px" }}
            >
              Welcome to the Paloma Concierge
            </h1>

            <p className={`${manuale.className}`} style={{ fontSize: "17px" }}>
              Ask any question about Paloma The Grandeur
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className={`w-full space-y-4 mt-8 transition-all duration-700 delay-500 ease-out transform ${
              isLoaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            }`}
          >
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
              className={`w-full p-4 rounded-lg border border-gray-200 bg-white resize-none ${manuale.className} shadow-sm`}
              style={{ fontSize: "16px", height: "100px" }}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
            />

            <button
              type="submit"
              className={`w-full px-4 py-2 rounded-lg bg-[#d4b978] text-white font-medium ${
                manuale.className
              } shadow-sm ${
                isSubmitting ? "opacity-70" : ""
              } transition-all duration-300 hover:bg-[#c9ad6e]`}
              style={{ fontSize: "24px" }}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Processing..." : "Begin Chat"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
