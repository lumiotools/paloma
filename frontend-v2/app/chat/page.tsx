"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Manuale, Marcellus_SC } from "next/font/google"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import StatusBar from "@/components/status-bar"
import PalomaLogo from "@/components/paloma-logo"
import { Info, Mic, Send, X } from "lucide-react"
import { type ChatMessage, sendChatMessage, updateChatHistory } from "@/lib/api"

const manuale = Manuale({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-manuale",
})

const marcellusSC = Marcellus_SC({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-marcellus-sc",
})

type Source = {
  page: number
  relevance: number
  text: string
}

type Message = {
  text: string
  isUser: boolean
  sources?: {
    [documentName: string]: Source[]
  }
  id?: string
}

interface VapiSDK {
  run: (config: VapiConfig) => VapiInstance
}

interface VapiConfig {
  apiKey: string
  assistant: string
  voice?: {
    voiceId: string
  }
  dailyConfig: {
    dailyJsVersion: string
  }
}

interface VapiInstance {
  on: (event: string, callback: (message?: VapiMessage) => void) => void
}

interface VapiMessage {
  type: string
  transcript?: string
  speech?: string
  role?: string
  transcriptType?: string
}

declare global {
  interface Window {
    vapiSDK: VapiSDK
  }
}

// Custom component for the waveform visualization
const WaveForm: React.FC<{ size: number; className?: string }> = ({ size, className }) => {
  return (
    <div className={`flex items-center justify-center h-${size} ${className || ""}`}>
      <div className="flex items-end space-x-1">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className="bg-white w-1 animate-sound-wave"
            style={{
              height: `${Math.random() * size * 0.6 + size * 0.2}px`,
              animationDelay: `${i * 0.1}s`,
            }}
          ></div>
        ))}
      </div>
    </div>
  )
}

export default function ChatPage() {
  const router = useRouter()
  const [userName, setUserName] = useState<string>("")
  const [userPhone, setUserPhone] = useState<string>("")
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([
    {
      text: "Feel free to ask me any questions about Paloma The Grandeur. To begin, what is your name?",
      isUser: false,
      id: "initial-message",
    },
  ])
  const [newMessage, setNewMessage] = useState<string>("")
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [isTyping, setIsTyping] = useState<boolean>(false)
  const [isLoaded, setIsLoaded] = useState<boolean>(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [isProcessing, setIsProcessing] = useState<boolean>(false)
  const [isVoiceMode, setIsVoiceMode] = useState<boolean>(false)
  const [isListening, setIsListening] = useState<boolean>(false)
  const [transcript, setTranscript] = useState<string>("")
  const [audioLevel, setAudioLevel] = useState<number>(0)
  const [apiError, setApiError] = useState<string | null>(null)
  const recognitionRef = useRef<any>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const [vapiReady, setVapiReady] = useState<boolean>(false)
  const [vapiError, setVapiError] = useState<string | null>(null)
  // Add a flag to track if AI is currently speaking
  const [isAiSpeaking, setIsAiSpeaking] = useState<boolean>(false)

  const vapiButtonRef = useRef<HTMLButtonElement | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const scriptLoadAttempted = useRef<boolean>(false)
  const vapiInstanceRef = useRef<VapiInstance | null>(null)
  const transcriptRef = useRef<string>("")
  const audioLevelInterval = useRef<NodeJS.Timeout | null>(null)

  const [chatId, setChatId] = useState<string | null>(null)

  // Initialize user data and check for initial question
  useEffect(() => {
    //   const storedName = localStorage.getItem("userName");
    //   const storedPhone = localStorage.getItem("userPhone");
    //   const initialQuestion = localStorage.getItem("initialQuestion");
    //   const storedConversationId = localStorage.getItem("conversationId");

    //   if (!storedName || !storedPhone) {
    //     // If no user info in localStorage, redirect to home page
    //     router.push("/");
    //     return;
    //   }

    //   setUserName(storedName);
    //   setUserPhone(storedPhone);

    //   if (storedConversationId) {
    //     setConversationId(storedConversationId);
    //   }

    //   // If there's an initial question, add it to messages and send API request
    //   if (initialQuestion) {
    //     // First, update the messages state with the user's question
    //     const userMessage = initialQuestion;

    //     // Use a callback to ensure we have the latest state
    //     setMessages((currentMessages) => [
    //       ...currentMessages,
    //       { text: userMessage, isUser: true, id: `msg-${Date.now()}` },
    //     ]);

    //     // Then send the API request
    //     handleInitialQuestion(initialQuestion);

    //     // Clear the stored question
    //     localStorage.removeItem("initialQuestion");
    //   }

    //   // Trigger animations after component mounts
    setTimeout(() => {
      setIsLoaded(true)
    }, 100)
  }, [router])

  // Handle initial question
  const handleInitialQuestion = async (question: string) => {
    setIsLoading(true)
    setIsTyping(true)

    try {
      const request = {
        message: question,
        first_name: userName || localStorage.getItem("userName") || "",
        phone_number: userPhone || localStorage.getItem("userPhone") || "",
      }

      const userMessage = {
        text: question,
        isUser: true,
        id: `msg-${Date.now()}`,
      }

      const streamingResponse = await sendChatMessage(request)

      const reader = streamingResponse.getReader()
      let newConversationId: string | null = null
      let fullMessage = ""

      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          // Convert the chunk to text
          const chunk = new TextDecoder().decode(value)

          // Split by newlines in case multiple JSON objects arrived
          const lines = chunk.split("\n").filter((line) => line.trim())

          for (const line of lines) {
            const data = JSON.parse(line)

            if (data.conversation_id) {
              newConversationId = data.conversation_id
              if (!conversationId) {
                setConversationId(newConversationId)
                localStorage.setItem("conversationId", newConversationId as string)
              }

              setIsLoading(false)
            }

            if (data.message) {
              fullMessage += data.message

              setMessages([...messages, userMessage, { text: fullMessage, isUser: false, id: `msg-${Date.now()}` }])
            }

            if (data.error) {
              throw new Error(data.error)
            }
          }
        }
      } finally {
        reader.releaseLock()
      }

      setMessages([...messages, userMessage, { text: fullMessage, isUser: false, id: `msg-${Date.now()}` }])

      const chatMessages: ChatMessage[] = messages.map((message) => {
        return {
          role: message.isUser ? "user" : "assistant",
          content: message.text,
        }
      })

      chatMessages.push({
        role: "user",
        content: question,
      })
      chatMessages.push({
        role: "assistant",
        content: fullMessage,
      })

      const newChatId = await updateChatHistory(chatId, chatMessages)

      setChatId(newChatId)
    } catch (error) {
      console.error("Error sending initial message:", error)

      setMessages((currentMessages) => [
        ...currentMessages,
        {
          text: "I'm sorry, I encountered an error. Please try again later.",
          isUser: false,
          id: `msg-${Date.now()}`,
        },
      ])
    } finally {
      setIsLoading(false)
      setIsTyping(false)
    }
  }

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  useEffect(() => {
    if (scriptLoadAttempted.current) return

    const loadVapiScript = () => {
      try {
        scriptLoadAttempted.current = true
        console.log("Loading Vapi script")

        // Create script element with the correct source
        const script = document.createElement("script")
        script.src = "https://cdn.jsdelivr.net/gh/VapiAI/html-script-tag@latest/dist/assets/index.js"
        script.async = true
        script.crossOrigin = "anonymous"

        // Add event listeners
        script.onload = () => {
          console.log("Vapi script loaded successfully")
          initVapi()
        }

        script.onerror = (error) => {
          console.error(`Error loading Vapi script:`, error)
          setVapiError("Failed to load voice recognition service")
        }

        // Append to document
        document.body.appendChild(script)
      } catch (error) {
        console.error(`Exception loading script:`, error)
        setVapiError("Failed to initialize voice recognition")
      }
    }

    loadVapiScript()

    // Cleanup function
    return () => {
      if (vapiInstanceRef.current) {
        try {
          // Clean up any event listeners or connections
          console.log("Cleaning up Vapi instance")
        } catch (e) {
          console.error(`Error during cleanup:`, e)
        }
      }

      // Clean up Vapi button
      const vapiButton = document.querySelector(".vapi-btn")
      if (vapiButton && vapiButton.parentNode) {
        vapiButton.parentNode.removeChild(vapiButton)
      }

      // Clear audio level interval
      if (audioLevelInterval.current) {
        clearInterval(audioLevelInterval.current)
        audioLevelInterval.current = null
      }
    }
  }, [])

  // Initialize Vapi
  const initVapi = () => {
    try {
      if (typeof window === "undefined" || !window.vapiSDK) {
        console.log("Vapi SDK not detected on window object")
        setTimeout(initVapi, 1000) // Retry after a delay
        return
      }

      console.log("Vapi SDK detected, initializing")

      // Use the provided credentials
      const apiKey = `9ed68d2a-e0fc-4632-9c4f-3452af3de262`
      const assistantId = `561353da-9dd0-4bb8-af5c-beb503fa46d5`

      console.log(`Using API Key: ${apiKey.substring(0, 8)}...`)
      console.log(`Using Assistant ID: ${assistantId.substring(0, 8)}...`)

      // Initialize Vapi with the API key
      try {
        const vapiInstance = window.vapiSDK.run({
          apiKey: apiKey,
          assistant: assistantId,
          // Add configuration for voice
          voice: {
            voiceId: "alloy", // You can choose different voices
          },
          // Add configuration for Daily.co (used by Vapi for audio)
          dailyConfig: {
            dailyJsVersion: "0.70.0", // Updated to newer supported version
          },
        })

        vapiInstanceRef.current = vapiInstance
        console.log("Vapi instance initialized")
        setVapiReady(true)

        // Set up event listeners
        setupVapiEventListeners(vapiInstance)

        // Find the Vapi button that the SDK creates
        setTimeout(() => {
          const vapiButton = document.querySelector(".vapi-btn") as HTMLButtonElement
          if (vapiButton) {
            console.log("Found Vapi button")
            vapiButtonRef.current = vapiButton

            // Move the button to our container
            if (containerRef.current) {
              containerRef.current.appendChild(vapiButton)
              // Hide the original button
              vapiButton.style.display = "none"
            }
          } else {
            console.log("Vapi button not found")
            setVapiError("Voice service not ready")
          }
        }, 1000)
      } catch (error) {
        console.error(`Error initializing Vapi:`, error)
        setVapiError(`Error initializing voice service`)
      }
    } catch (error) {
      console.error(`Error in initVapi:`, error)
      setVapiError(`Failed to initialize voice service`)
    }
  }

  // Set up event listeners for Vapi
  const setupVapiEventListeners = (vapiInstance: VapiInstance) => {
    vapiInstance.on("speech-start", () => {
      console.log("AI started speaking")
      setIsProcessing(false)
      setIsAiSpeaking(true)
    })

    vapiInstance.on("speech-end", () => {
      console.log("AI stopped speaking")
      setIsAiSpeaking(false)
    })

    vapiInstance.on("call-start", () => {
      console.log("Call started")
      setIsListening(true)
      setIsProcessing(false)
      setTranscript("")
      transcriptRef.current = ""
      setIsAiSpeaking(false)
    })

    vapiInstance.on("call-end", () => {
      console.log("Call ended")
      setIsListening(false)
      setIsProcessing(false)
      setIsAiSpeaking(false)

      // Only send the transcript if we have one AND the AI wasn't speaking
      // This prevents sending the transcript when stopping the AI's response
      if (transcript.trim() && !isAiSpeaking) {
        handleSendVoiceMessage(transcript)
      }
    })

    vapiInstance.on("error", (err: any) => {
      const errorMsg = `Vapi error: ${JSON.stringify(err)}`
      console.error(errorMsg)
      setVapiError(typeof err === "string" ? err : "Voice service error")
      setIsListening(false)
      setIsProcessing(false)
      setIsAiSpeaking(false)
    })

    vapiInstance.on("message", (message?: VapiMessage) => {
      if (!message) return

      console.log(`Received message: ${message.type}`)

      if (message.type === "transcript" && message.transcript) {
        // Only append transcript when role is user
        if (message.role === "user") {
          transcriptRef.current = message.transcript
          setTranscript(message.transcript)
          setIsListening(true)
          setIsProcessing(false)
          console.log(`User transcript: ${message.transcript}`)
        }
      } else if (message.type === "speech" && message.speech) {
        setIsProcessing(true)
        setIsAiSpeaking(true)
        console.log(`AI speech: ${message.speech}`)

        // Add AI response to messages, but don't affect the input field
        setMessages((prev) => [
          ...prev,
          {
            text: message.speech,
            isUser: false,
            id: `ai-speech-${Date.now()}`,
          },
        ])
      }
    })
  }

  // Simulate audio level changes for visualization
  useEffect(() => {
    if (isVoiceMode && isListening && !audioLevelInterval.current) {
      audioLevelInterval.current = setInterval(() => {
        setAudioLevel(Math.random() * 0.5 + 0.2) // Random value between 0.2 and 0.7
      }, 200)
    } else if ((!isVoiceMode || !isListening) && audioLevelInterval.current) {
      clearInterval(audioLevelInterval.current)
      audioLevelInterval.current = null
      setAudioLevel(0) // Reset to base level
    }

    return () => {
      if (audioLevelInterval.current) {
        clearInterval(audioLevelInterval.current)
        audioLevelInterval.current = null
      }
    }
  }, [isVoiceMode, isListening])

  // Reset state when voice mode opens/closes
  useEffect(() => {
    if (isVoiceMode) {
      setTranscript("")
      setVapiError(null)
      setIsProcessing(false)
      setAudioLevel(0)
      setIsAiSpeaking(false)
    }
  }, [isVoiceMode])

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // Toggle voice mode
  const toggleVoiceMode = () => {
    const newVoiceMode = !isVoiceMode;
  setIsVoiceMode(newVoiceMode);
  
  // If we're turning on voice mode, automatically start listening
  if (newVoiceMode) {
    // Add a small delay to ensure voice mode UI is fully mounted
    setTimeout(() => {
      startListening();
    }, 300);
  }
  }

  // Start listening for voice input
  const startListening = () => {
    console.log("Starting listening")
    setIsProcessing(true)

    // Click the Vapi button to start the call
    if (vapiButtonRef.current) {
      vapiButtonRef.current.click()
      console.log("Clicked Vapi button")
    } else {
      const errorMsg = "Vapi button not found"
      console.error(errorMsg)
      setVapiError(errorMsg)
      setIsProcessing(false)
    }
  }

  // Stop listening and process voice input
  const stopListening = () => {
    console.log("Stopping listening")

    // Click the Vapi button again to end the call
    if (vapiButtonRef.current) {
      vapiButtonRef.current.click()
      console.log("Clicked Vapi button to end call")
    }

    setIsListening(false)
    setIsProcessing(true)

    // If we have a transcript AND the AI wasn't speaking, send it
    // This prevents sending the transcript when stopping the AI's response
    if (transcript.trim() && !isAiSpeaking) {
      setTimeout(() => {
        handleSendVoiceMessage(transcript)
        setIsVoiceMode(false)
        setIsProcessing(false)
        // Clear the transcript after sending to prevent it from appearing elsewhere
        setTranscript("")
      }, 500) // Short delay to show processing state
    } else {
      // If we're stopping while AI is speaking, just close without sending
      setIsProcessing(false)
      if (isAiSpeaking) {
        console.log("Stopping AI speech, not sending transcript")
        setIsAiSpeaking(false)
        // Clear the transcript to prevent accidental sending
        setTranscript("")
      }
    }
  }

  // Handle sending a voice message
  const handleSendVoiceMessage = (text: string) => {
    if (!text.trim() || isLoading || isTyping) return

    // Don't send if AI was speaking (user was just stopping the AI)
    if (isAiSpeaking) {
      console.log("Not sending transcript because AI was speaking")
      return
    }

    const userMessage = {
      text: text,
      isUser: true,
      id: `msg-${Date.now()}`,
    }

    // Make sure we're not updating the input field
    setNewMessage("")

    setMessages((prevMessages) => [...prevMessages, userMessage])

    // Process the voice message using the same logic as normal text messages
    handleApiSendMessage(text, userMessage)
  }

  // Handle sending a new message
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!newMessage.trim() || isLoading || isTyping) return

    const userMessage = {
      text: newMessage,
      isUser: true,
      id: `msg-${Date.now()}`,
    }

    setMessages((prevMessages) => [...prevMessages, userMessage])
    setNewMessage("")

    // Process the text message
    handleApiSendMessage(newMessage, userMessage)
  }

  // Common API sending logic for both text and voice messages
  const handleApiSendMessage = async (messageText: string, userMessage: Message) => {
    setIsLoading(true);
    setIsTyping(true);
  
    try {
      const request = {
        message: messageText,
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
            try {
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
  
              if (data.user_name) {
                setUserName(data.user_name);
                localStorage.setItem("userName", data.user_name);
              }
  
              if (data.message) {
                fullMessage += data.message;
  
                setMessages((prevMessages) => {
                  // Filter out the last assistant message if it's a partial response
                  const filteredMessages = prevMessages.filter(
                    (msg) => msg.id !== `assistant-partial-${userMessage.id}`
                  );
                  
                  return [
                    ...filteredMessages,
                    { 
                      text: fullMessage, 
                      isUser: false, 
                      id: `assistant-partial-${userMessage.id}` 
                    },
                  ];
                });
              }
  
              if (data.error) {
                throw new Error(data.error);
              }
            } catch (jsonError) {
              console.error("Error parsing JSON line:", line, jsonError);
            }
          }
        }
      } finally {
        reader.releaseLock();
      }
  
      // Update with the final message
      setMessages((prevMessages) => {
        // Filter out the partial response
        const filteredMessages = prevMessages.filter(
          (msg) => msg.id !== `assistant-partial-${userMessage.id}`
        );
        
        return [
          ...filteredMessages,
          { 
            text: fullMessage, 
            isUser: false, 
            id: `msg-${Date.now()}` 
          },
        ];
      });
  
      // Get all messages for the chat history
      const chatMessages: ChatMessage[] = messages.map((message) => {
        return {
          role: message.isUser ? "user" : "assistant",
          content: message.text,
        };
      });
  
      // Add the current exchange
      chatMessages.push({
        role: "user",
        content: messageText,
      });
      chatMessages.push({
        role: "assistant",
        content: fullMessage,
      });
  
      try {
        // Try to update chat history but continue even if it fails
        const newChatId = await updateChatHistory(chatId, chatMessages);
        if (newChatId) {
          setChatId(newChatId);
        }
      } catch (historyError) {
        console.error("Failed to update chat history:", historyError);
        // Continue with the conversation even if history update fails
      }
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
    <main className="flex min-h-[80vh] flex-col items-center px-6 py-0 relative bg-[#faf7f2] overflow-hidden">
      <StatusBar />

      <div className="w-full max-w-md pt-12 pb-24 flex-1 flex flex-col">
        <h1
          className={`font-normal mb-6 ${marcellusSC.className} transition-all duration-700 ease-out transform ${
            isLoaded ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-8"
          }`}
          style={{ fontSize: "24px" }}
        >
          {userName && <>Hello, {userName}</>}
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
          <div
            className={`mb-4 text-center animate-fadeIn`}
            style={{ animationDelay: `${0 * 150}ms` }}
          >
            <div
              className={`inline-block rounded-3xl py-4 ${manuale.className} ${
                false ? "bg-[#fdf6e3] shadow-[0_2px_8px_rgba(0,0,0,0.06)] max-w-[80%] px-6" : "px-2"
              }`}
              style={{
                textShadow: "0 0.2px 0.3px rgba(0,0,0,0.02)",
              }}
            >
              <div className="prose text-center font-medium text-gray-600 text-lg">
                Welcome to the Paloma Concierge.
              </div>
            </div>
          </div>
          {messages.map((message, index) => (
            <div
              key={message.id || index}
              className={`mb-4 ${message.isUser ? "text-right" : "text-left"} animate-fadeIn`}
              style={{ animationDelay: `${index * 150}ms` }}
            >
              <div
                className={`inline-block rounded-3xl py-4 ${manuale.className} ${
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
                        h1: ({ node, ...props }) => <h1 className={`text-3xl font-bold`} {...props} />,
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

          <div ref={messagesEndRef} />
        </div>

        <form
          onSubmit={handleSendMessage}
          className={`fixed bottom-6 left-6 right-6 max-w-md mx-auto transition-all duration-700 delay-600 ease-out transform ${isLoaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
        >
          <div className="relative flex items-center">
            <button
              type="button"
              onClick={toggleVoiceMode}
              className="absolute left-1 p-3 rounded-full text-[#d4b978] flex items-center justify-center transition-all duration-300 hover:bg-[#fdf6e3]"
            >
              <Mic size={20} />
            </button>
            <input
              type="text"
              placeholder="Type a message..."
              className={`w-full p-4 pl-16 pr-16 rounded-full border border-gray-200 bg-white ${manuale.className} shadow-sm`}
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              disabled={isLoading || isVoiceMode}
            />
            <button
              type="submit"
              className={`absolute right-1 p-3 rounded-full bg-[#d4b978] text-white flex items-center justify-center shadow-sm transition-all duration-300 hover:bg-[#c9ad6e] ${isLoading || isVoiceMode ? "opacity-50 cursor-not-allowed" : ""}`}
              disabled={isLoading || isVoiceMode}
            >
              <Send size={20} className="rotate-45" />
            </button>
          </div>
        </form>
      </div>

      {isVoiceMode && (
        <div className="fixed inset-0 bg-[#1a1a1a]/90 flex flex-col items-center justify-center z-50 animate-fadeIn">
          <div className="absolute top-4 right-4 flex space-x-4">
            <button className="w-10 h-10 rounded-full bg-[#333333]/50 flex items-center justify-center text-white">
              <Info size={20} />
            </button>
          </div>

          <div className="relative w-full h-full flex flex-col items-center justify-center">
            {/* VAPI Status Indicator */}
            {vapiError && (
              <div className="absolute top-8 left-1/2 transform -translate-x-1/2 bg-red-500/80 text-white px-4 py-2 rounded-full text-sm">
                {vapiError}
              </div>
            )}

            {/* Fluid Visualization */}
            <div className="relative w-64 h-64 mb-8 flex items-center justify-center">
              <div className="absolute w-64 h-64 rounded-full bg-[#d4b978]/20 blur-xl"></div>

              {/* Modern voice animation */}
              <div
                className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full bg-gradient-to-b from-white via-[#fdf6e3] to-[#d4b978] flex items-center justify-center overflow-hidden"
                style={{ boxShadow: "0 0 30px rgba(212, 185, 120, 0.3)" }}
              >
                {/* Voice wave animation */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="relative w-full h-full">
                    {/* Animated circles */}
                    <div
                      className="absolute inset-0 rounded-full bg-white/30 transition-transform duration-700 ease-in-out"
                      style={{
                        transform: `scale(${0.6 + audioLevel * 0.4})`,
                        opacity: 0.2 + audioLevel * 0.3,
                      }}
                    ></div>
                    <div
                      className="absolute inset-0 rounded-full bg-white/20 transition-transform duration-500 ease-in-out"
                      style={{
                        transform: `scale(${0.7 + audioLevel * 0.3})`,
                        opacity: 0.3 + audioLevel * 0.2,
                        transitionDelay: "100ms",
                      }}
                    ></div>

                    {/* Voice bars animation */}
                    <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
                      {/* Animated gradient background */}
                      <div
                        className="absolute inset-0 rounded-full animate-gradient-slow"
                        style={{
                          background:
                            "linear-gradient(120deg, rgba(253, 246, 227, 0.3), rgba(212, 185, 120, 0.4), rgba(253, 246, 227, 0.3), rgba(212, 185, 120, 0.4))",
                          backgroundSize: "400% 400%",
                          opacity: 0.6 + audioLevel * 0.2,
                        }}
                      ></div>
                      <div className="flex items-end justify-center space-x-1 h-28 w-40 relative z-10">
                        {Array.from({ length: 9 }).map((_, i) => (
                          <div
                            key={i}
                            className="w-2 bg-[#d4b978] rounded-full transition-all duration-150"
                            style={{
                              height: `${20 + Math.sin(Date.now() / (300 + i * 50) + i) * 15 + audioLevel * 50}%`,
                              opacity: 0.6 + audioLevel * 0.4,
                              animationDelay: `${i * 100}ms`,
                            }}
                          ></div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Status text inside the circle */}
                <div className="absolute bottom-10 left-0 right-0 text-center">
                  {isListening && (
                    <p className={`${manuale.className} text-[#1a1a1a] font-medium text-sm`}>
                      {/* Listening */}
                      {/* <span className="inline-block ml-1">
                        <span className="inline-block w-1 h-1 bg-[#1a1a1a] rounded-full animate-ping mx-0.5"></span>
                        <span
                          className="inline-block w-1 h-1 bg-[#1a1a1a] rounded-full animate-ping mx-0.5"
                          style={{ animationDelay: "300ms" }}
                        ></span>
                        <span
                          className="inline-block w-1 h-1 bg-[#1a1a1a] rounded-full animate-ping mx-0.5"
                          style={{ animationDelay: "600ms" }}
                        ></span>
                      </span> */}
                    </p>
                  )}
                  {isProcessing && (
                    <p className={`${manuale.className} text-[#1a1a1a] font-medium text-sm`}>Processing...</p>
                  )}
                  {!isListening && !isProcessing && (
                    <p className={`${manuale.className} text-[#1a1a1a] font-medium text-sm`}>Tap to speak</p>
                  )}
                </div>
              </div>

              {/* VAPI Status Overlay */}
              {isProcessing && (
                <div className="absolute inset-0 flex items-center justify-center z-10">
                  <div className="bg-[#1a1a1a]/50 rounded-full w-full h-full flex items-center justify-center">
                    <div className="text-white text-center">
                      <p className={`${manuale.className} text-sm`}>Processing...</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Control Buttons */}
          <div className="absolute bottom-16 flex items-center justify-center space-x-32">
            <button
              className={`w-16 h-16 rounded-full ${isListening ? "bg-[#d4b978]" : "bg-[#333333]"} flex items-center justify-center text-white transition-transform hover:scale-105 ${isListening ? "animate-pulse" : ""}`}
              onClick={isListening ? stopListening : startListening}
              disabled={isProcessing || !vapiReady}
            >
              <Mic size={28} />
            </button>

            <button
              className="w-16 h-16 rounded-full bg-[#333333] flex items-center justify-center text-white transition-transform hover:scale-105"
              onClick={() => {
                // If currently listening, stop the voice assistant first
                if (isListening) {
                  stopListening()
                }
                // Then close the voice mode interface
                setIsVoiceMode(false)
              }}
              disabled={isProcessing}
            >
              <X size={28} />
            </button>
          </div>
        </div>
      )}

      {/* Hidden div to hold the Vapi button */}
      <div ref={containerRef} className="hidden"></div>
    </main>
  )
}

