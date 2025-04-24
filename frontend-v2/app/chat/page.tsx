// "use client"

// import type React from "react"

// import { useState, useEffect, useRef } from "react"
// import { useRouter } from "next/navigation"
// import { Manuale, Marcellus_SC } from "next/font/google"
// import ReactMarkdown from "react-markdown"
// import remarkGfm from "remark-gfm"
// import StatusBar from "@/components/status-bar"
// import PalomaLogo from "@/components/paloma-logo"
// import { Mic, Send, X } from "lucide-react"
// import { type ChatMessage, sendChatMessage, updateChatHistory } from "@/lib/api"

// const manuale = Manuale({
//   subsets: ["latin"],
//   weight: ["400", "500", "600"],
//   variable: "--font-manuale",
// })

// const marcellusSC = Marcellus_SC({
//   subsets: ["latin"],
//   weight: ["400"],
//   variable: "--font-marcellus-sc",
// })

// type Source = {
//   page: number
//   relevance: number
//   text: string
// }

// type Message = {
//   text: string
//   isUser: boolean
//   sources?: {
//     [documentName: string]: Source[]
//   }
//   id?: string
// }

// interface VapiSDK {
//   run: (config: VapiConfig) => VapiInstance
// }

// interface VapiConfig {
//   apiKey: string
//   assistant: string
//   voice?: {
//     voiceId: string
//   }
//   dailyConfig: {
//     dailyJsVersion: string
//   }
// }

// interface VapiInstance {
//   on: (event: string, callback: (message?: VapiMessage) => void) => void
// }

// interface VapiMessage {
//   type: string
//   transcript?: string
//   speech?: string
//   role?: string
//   transcriptType?: string
// }

// declare global {
//   interface Window {
//     vapiSDK: VapiSDK
//   }
// }

// // Custom component for the waveform visualization
// const WaveForm: React.FC<{ size: number; className?: string }> = ({ size, className }) => {
//   return (
//     <div className={`flex items-center justify-center h-${size} ${className || ""}`}>
//       <div className="flex items-end space-x-1">
//         {[...Array(5)].map((_, i) => (
//           <div
//             key={i}
//             className="bg-white w-1 animate-sound-wave"
//             style={{
//               height: `${Math.random() * size * 0.6 + size * 0.2}px`,
//               animationDelay: `${i * 0.1}s`,
//             }}
//           ></div>
//         ))}
//       </div>
//     </div>
//   )
// }

// export default function ChatPage() {
//   const router = useRouter()
//   const [userName, setUserName] = useState<string>("")
//   const [userPhone, setUserPhone] = useState<string>("")
//   const [conversationId, setConversationId] = useState<string | null>(null)
//   const [messages, setMessages] = useState<Message[]>([
//     {
//       text: "Welcome to the Paloma Concierge. To begin, what is your name?",
//       isUser: false,
//       id: "initial-message",
//     },
//   ])
//   const [newMessage, setNewMessage] = useState<string>("")
//   const [isLoading, setIsLoading] = useState<boolean>(false)
//   const [isTyping, setIsTyping] = useState<boolean>(false)
//   const [isLoaded, setIsLoaded] = useState<boolean>(false)
//   const messagesEndRef = useRef<HTMLDivElement>(null)
//   const [isProcessing, setIsProcessing] = useState<boolean>(false)
//   const [isVoiceMode, setIsVoiceMode] = useState<boolean>(false)
//   const [isListening, setIsListening] = useState<boolean>(false)
//   const [transcript, setTranscript] = useState<string>("")
//   const [audioLevel, setAudioLevel] = useState<number>(0)
//   const [apiError, setApiError] = useState<string | null>(null)
//   const recognitionRef = useRef<any>(null)
//   const audioContextRef = useRef<AudioContext | null>(null)
//   const analyserRef = useRef<AnalyserNode | null>(null)
//   const [vapiReady, setVapiReady] = useState<boolean>(false)
//   const [vapiError, setVapiError] = useState<string | null>(null)
//   // Add a flag to track if AI is currently speaking
//   const [isAiSpeaking, setIsAiSpeaking] = useState<boolean>(false)
//   // Add a flag to track if we're closing the voice mode
//   const [isClosingVoiceMode, setIsClosingVoiceMode] = useState<boolean>(false)
//   // Add a flag to track if user is speaking
//   const [isUserSpeaking, setIsUserSpeaking] = useState<boolean>(false)
//   // Add a reference to track the last time audio activity was detected
//   const lastActivityTime = useRef<number>(0)
//   // Add a reference to store the microphone stream for proper cleanup
//   const microphoneStream = useRef<MediaStream | null>(null)

//   const vapiButtonRef = useRef<HTMLButtonElement | null>(null)
//   const containerRef = useRef<HTMLDivElement | null>(null)
//   const scriptLoadAttempted = useRef<boolean>(false)
//   const vapiInstanceRef = useRef<VapiInstance | null>(null)
//   const transcriptRef = useRef<string>("")
//   const audioLevelInterval = useRef<NodeJS.Timeout | null>(null)

//   const [chatId, setChatId] = useState<string | null>(null)

//   const [aiAudioLevel, setAiAudioLevel] = useState<number>(0)
//   const [userAudioLevel, setUserAudioLevel] = useState<number>(0)
//   const aiAudioLevelInterval = useRef<NodeJS.Timeout | null>(null)
//   const userAudioAnalyser = useRef<AnalyserNode | null>(null)
//   const userAudioDataArray = useRef<Uint8Array | null>(null)
//   const animationFrameId = useRef<number | null>(null)

//   // Add a ref to track animation frame for continuous updates
//   const waveAnimationFrameId = useRef<number | null>(null)

//   // Initialize user data and check for initial question
//   useEffect(() => {
//     //   const storedName = localStorage.getItem("userName");
//     //   const storedPhone = localStorage.getItem("userPhone");
//     //   const initialQuestion = localStorage.getItem("initialQuestion");
//     //   const storedConversationId = localStorage.getItem("conversationId");

//     //   if (!storedName || !storedPhone) {
//     //     // If no user info in localStorage, redirect to home page
//     //     router.push("/");
//     //     return;
//     //   }

//     //   setUserName(storedName);
//     //   setUserPhone(storedPhone);

//     //   if (storedConversationId) {
//     //     setConversationId(storedConversationId);
//     //   }

//     //   // If there's an initial question, add it to messages and send API request
//     //   if (initialQuestion) {
//     //     // First, update the messages state with the user's question
//     //     const userMessage = initialQuestion;

//     //     // Use a callback to ensure we have the latest state
//     //     setMessages((currentMessages) => [
//     //       ...currentMessages,
//     //       { text: userMessage, isUser: true, id: `msg-${Date.now()}` },
//     //     ]);

//     //     // Then send the API request
//     //     handleInitialQuestion(initialQuestion);

//     //     // Clear the stored question
//     //     localStorage.removeItem("initialQuestion");
//     //   }

//     //   // Trigger animations after component mounts
//     setTimeout(() => {
//       setIsLoaded(true)
//     }, 100)
//   }, [router])

//   // Handle initial question
//   const handleInitialQuestion = async (question: string) => {
//     setIsLoading(true)
//     setIsTyping(true)

//     try {
//       const request = {
//         message: question,
//         first_name: userName || localStorage.getItem("userName") || "",
//         phone_number: userPhone || localStorage.getItem("userPhone") || "",
//       }

//       const userMessage = {
//         text: question,
//         isUser: true,
//         id: `msg-${Date.now()}`,
//       }

//       const streamingResponse = await sendChatMessage(request)

//       const reader = streamingResponse.getReader()
//       let newConversationId: string | null = null
//       let fullMessage = ""

//       try {
//         while (true) {
//           const { done, value } = await reader.read()
//           if (done) break

//           // Convert the chunk to text
//           const chunk = new TextDecoder().decode(value)

//           // Split by newlines in case multiple JSON objects arrived
//           const lines = chunk.split("\n").filter((line) => line.trim())

//           for (const line of lines) {
//             const data = JSON.parse(line)

//             if (data.conversation_id) {
//               newConversationId = data.conversation_id
//               if (!conversationId) {
//                 setConversationId(newConversationId)
//                 localStorage.setItem("conversationId", newConversationId as string)
//               }

//               setIsLoading(false)
//             }

//             if (data.message) {
//               fullMessage += data.message

//               setMessages([...messages, userMessage, { text: fullMessage, isUser: false, id: `msg-${Date.now()}` }])
//             }

//             if (data.error) {
//               throw new Error(data.error)
//             }
//           }
//         }
//       } finally {
//         reader.releaseLock()
//       }

//       setMessages([...messages, userMessage, { text: fullMessage, isUser: false, id: `msg-${Date.now()}` }])

//       const chatMessages: ChatMessage[] = messages.map((message) => {
//         return {
//           role: message.isUser ? "user" : "assistant",
//           content: message.text,
//         }
//       })

//       chatMessages.push({
//         role: "user",
//         content: question,
//       })
//       chatMessages.push({
//         role: "assistant",
//         content: fullMessage,
//       })

//       const newChatId = await updateChatHistory(chatId, chatMessages)

//       setChatId(newChatId)
//     } catch (error) {
//       console.error("Error sending initial message:", error)

//       setMessages((currentMessages) => [
//         ...currentMessages,
//         {
//           text: "I'm sorry, I encountered an error. Please try again later.",
//           isUser: false,
//           id: `msg-${Date.now()}`,
//         },
//       ])
//     } finally {
//       setIsLoading(false)
//       setIsTyping(false)
//     }
//   }

//   // Scroll to bottom when messages change
//   useEffect(() => {
//     messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
//   }, [messages])

//   useEffect(() => {
//     if (scriptLoadAttempted.current) return

//     const loadVapiScript = () => {
//       try {
//         scriptLoadAttempted.current = true
//         console.log("Loading Vapi script")

//         // Create script element with the correct source
//         const script = document.createElement("script")
//         script.src = "https://cdn.jsdelivr.net/gh/VapiAI/html-script-tag@latest/dist/assets/index.js"
//         script.async = true
//         script.crossOrigin = "anonymous"

//         // Add event listeners
//         script.onload = () => {
//           console.log("Vapi script loaded successfully")
//           initVapi()
//         }

//         script.onerror = (error) => {
//           console.error(`Error loading Vapi script:`, error)
//           setVapiError("Failed to load voice recognition service")
//         }

//         // Append to document
//         document.body.appendChild(script)
//       } catch (error) {
//         console.error(`Exception loading script:`, error)
//         setVapiError("Failed to initialize voice recognition")
//       }
//     }

//     loadVapiScript()

//     // Cleanup function
//     return () => {
//       if (vapiInstanceRef.current) {
//         try {
//           // Clean up any event listeners or connections
//           console.log("Cleaning up Vapi instance")
//         } catch (e) {
//           console.error(`Error during cleanup:`, e)
//         }
//       }

//       // Clean up Vapi button
//       const vapiButton = document.querySelector(".vapi-btn")
//       if (vapiButton && vapiButton.parentNode) {
//         vapiButton.parentNode.removeChild(vapiButton)
//       }

//       // Clear audio level interval
//       if (audioLevelInterval.current) {
//         clearInterval(audioLevelInterval.current)
//         audioLevelInterval.current = null
//       }

//       // Clean up microphone stream
//       if (microphoneStream.current) {
//         microphoneStream.current.getTracks().forEach((track) => track.stop())
//         microphoneStream.current = null
//       }

//       // Clean up wave animation
//       if (waveAnimationFrameId.current) {
//         cancelAnimationFrame(waveAnimationFrameId.current)
//         waveAnimationFrameId.current = null
//       }
//     }
//   }, [])

//   // Initialize Vapi
//   const initVapi = () => {
//     try {
//       if (typeof window === "undefined" || !window.vapiSDK) {
//         console.log("Vapi SDK not detected on window object")
//         setTimeout(initVapi, 1000) // Retry after a delay
//         return
//       }

//       console.log("Vapi SDK detected, initializing")

//       // Use the provided credentials
//       const apiKey = `${process.env.NEXT_PUBLIC_VAPI_API_KEY}`
//       const assistantId = `50384b0c-7e90-49cc-8309-77c6e1da7016`

//       console.log(`Using API Key: ${apiKey.substring(0, 8)}...`)
//       console.log(`Using Assistant ID: ${assistantId.substring(0, 8)}...`)

//       // Initialize Vapi with the API key
//       try {
//         const vapiInstance = window.vapiSDK.run({
//           apiKey: apiKey,
//           assistant: assistantId,
//           // Add configuration for voice
//           voice: {
//             voiceId: "alloy", // You can choose different voices
//           },
//           // Add configuration for Daily.co (used by Vapi for audio)
//           dailyConfig: {
//             dailyJsVersion: "0.70.0", // Updated to newer supported version
//           },
//         })

//         vapiInstanceRef.current = vapiInstance
//         console.log("Vapi instance initialized")
//         setVapiReady(true)

//         // Set up event listeners
//         setupVapiEventListeners(vapiInstance)

//         // Find the Vapi button that the SDK creates
//         setTimeout(() => {
//           const vapiButton = document.querySelector(".vapi-btn") as HTMLButtonElement
//           if (vapiButton) {
//             console.log("Found Vapi button")
//             vapiButtonRef.current = vapiButton

//             // Move the button to our container
//             if (containerRef.current) {
//               containerRef.current.appendChild(vapiButton)
//               // Hide the original button
//               vapiButton.style.display = "none"
//             }
//           } else {
//             console.log("Vapi button not found")
//             setVapiError("Voice service not ready")
//           }
//         }, 1000)
//       } catch (error) {
//         console.error(`Error initializing Vapi:`, error)
//         setVapiError(`Error initializing voice service`)
//       }
//     } catch (error) {
//       console.error(`Error in initVapi:`, error)
//       setVapiError(`Failed to initialize voice service`)
//     }
//   }

//   // Set up event listeners for Vapi
//   const setupVapiEventListeners = (vapiInstance: VapiInstance) => {
//     // Listen for all possible events to debug and improve detection
//     const allEvents = [
//       "speech-start",
//       "speech-end",
//       "call-start",
//       "call-end",
//       "error",
//       "message",
//       "transcript-started",
//       "transcript-interim",
//       "transcript-final",
//       "transcript-partial",
//       "audio-activity",
//       "audio-level",
//       "audio-start",
//       "audio-end",
//     ]

//     allEvents.forEach((eventName) => {
//       vapiInstance.on(eventName, (data) => {
//         console.log(`Vapi event: ${eventName}`, data)

//         // For any audio or transcript event, consider the user as speaking
//         if (eventName.startsWith("audio-") || eventName.startsWith("transcript-")) {
//           if (isListening && !isAiSpeaking) {
//             setIsUserSpeaking(true)
//             lastActivityTime.current = Date.now()

//             // Set a moderate audio level immediately for any audio event
//             if (userAudioLevel < 0.3) {
//               setUserAudioLevel(0.3)
//             }
//           }
//         }
//       })
//     })

//     vapiInstance.on("speech-start", () => {
//       console.log("AI started speaking")
//       setIsProcessing(false)
//       setIsAiSpeaking(true)
//       setIsUserSpeaking(false)

//       // Reset user audio level when AI starts speaking
//       setUserAudioLevel(0)

//       // Start AI audio visualization with a slight delay to ensure state is updated
//       setTimeout(() => {
//         startAiAudioVisualization()
//       }, 50)
//     })

//     vapiInstance.on("speech-end", () => {
//       console.log("AI stopped speaking")
//       setIsAiSpeaking(false)
//       // Reset AI audio level when AI stops speaking
//       setAiAudioLevel(0)

//       // If we're in the process of closing the voice mode, complete the closure now
//       if (isClosingVoiceMode) {
//         completeVoiceModeClose()
//       }
//     })

//     vapiInstance.on("call-start", () => {
//       console.log("Call started")
//       setIsListening(true)
//       setIsProcessing(false)
//       setTranscript("")
//       transcriptRef.current = ""
//       setIsAiSpeaking(false)
//       setIsClosingVoiceMode(false)
//       setIsUserSpeaking(false)

//       // Start with zero audio level - don't show bars until actual speech is detected
//       setUserAudioLevel(0)
//       setAiAudioLevel(0)
//       setAudioLevel(0)

//       // Initialize microphone access for better audio detection
//       initializeMicrophone()
//     })

//     vapiInstance.on("call-end", () => {
//       console.log("Call ended")
//       setIsListening(false)
//       setIsProcessing(false)
//       setIsAiSpeaking(false)
//       setIsUserSpeaking(false)

//       // Reset audio levels when call ends
//       setUserAudioLevel(0)
//       setAiAudioLevel(0)
//       setAudioLevel(0)

//       // Clean up microphone
//       cleanupMicrophone()

//       // If we're in the process of closing the voice mode, complete the closure now
//       if (isClosingVoiceMode) {
//         completeVoiceModeClose()
//         return
//       }

//       // Only send the transcript if we have one AND the AI wasn't speaking
//       // This prevents sending the transcript when stopping the AI's response
//       if (transcript.trim() && !isAiSpeaking) {
//         handleSendVoiceMessage(transcript)
//       }
//     })

//     vapiInstance.on("error", (err: any) => {
//       const errorMsg = `Vapi error: ${JSON.stringify(err)}`
//       console.error(errorMsg)

//       // Check for specific error types
//       if (err.error?.msg === "Exiting meeting because room was deleted" || err.error?.type === "no-room") {
//         setVapiError("The meeting has ended. Attempting to reconnect...")
//         setIsListening(false)
//         setIsProcessing(false)
//         setIsAiSpeaking(false)
//         setIsUserSpeaking(false)

//         // Attempt to reinitialize the Vapi connection
//         initVapi() // Re-initialize Vapi if the session ends
//         return
//       }

//       // Handle other errors (generic ones)
//       setVapiError(typeof err === "string" ? err : "Voice service error")
//       setIsListening(false)
//       setIsProcessing(false)
//       setIsAiSpeaking(false)
//       setIsUserSpeaking(false)

//       if (isClosingVoiceMode) {
//         completeVoiceModeClose()
//       }
//     })

//     vapiInstance.on("message", (message?: VapiMessage) => {
//       if (!message) return

//       console.log(`Received message: ${message.type}`)

//       if (message.type === "transcript" && message.role === "user") {
//         // Always update transcript
//         transcriptRef.current = message.transcript || ""
//         setTranscript(message.transcript || "")
//         setIsListening(true)
//         setIsProcessing(false)
//         console.log(`User transcript: ${message.transcript || "[empty]"}`)

//         // Mark user as speaking and update last activity time
//         setIsUserSpeaking(true)
//         lastActivityTime.current = Date.now()

//         // Set a higher audio level for transcript events
//         setUserAudioLevel(0.6)
//       } else if (message.type === "speech" && message.speech) {
//         setIsProcessing(true)
//         setIsAiSpeaking(true)
//         setIsUserSpeaking(false)
//         console.log(`AI speech: ${message.speech}`)

//         // Add AI response to messages, but don't affect the input field
//         setMessages((prev) => [
//           ...prev,
//           {
//             text: message.speech,
//             isUser: false,
//             id: `ai-speech-${Date.now()}`,
//           },
//         ])
//       }
//     })

//     vapiInstance.on("transcript-started", () => {
//       console.log("User started speaking")
//       setIsUserSpeaking(true)
//       lastActivityTime.current = Date.now()
//       setUserAudioLevel(0.4) // Start with a higher level
//     })

//     // Add specific handler for audio level events
//     vapiInstance.on("audio-level", (data: any) => {
//       if (isListening && !isAiSpeaking && data) {
//         // Mark user as speaking and update last activity time
//         setIsUserSpeaking(true)
//         lastActivityTime.current = Date.now()

//         // Set audio level based on the data if available
//         if (typeof data === "number") {
//           const level = Math.min(Math.max(data * 1.5, 0.3), 0.9)
//           setUserAudioLevel(level)
//           setAudioLevel(level)
//         } else {
//           // If no level data, use a default level
//           setUserAudioLevel(0.6)
//           setAudioLevel(0.6)
//         }
//       }
//     })
//   }

//   // Initialize microphone for better audio detection
//   const initializeMicrophone = () => {
//     if (!window.navigator?.mediaDevices?.getUserMedia) {
//       console.log("getUserMedia not supported, falling back to simulated audio")
//       return
//     }

//     // Create audio context if we don't have one
//     if (!audioContextRef.current) {
//       try {
//         const AudioContext = window.AudioContext || (window as any).webkitAudioContext
//         audioContextRef.current = new AudioContext()
//       } catch (err) {
//         console.error("Failed to create AudioContext:", err)
//         return
//       }
//     }

//     // Request microphone access
//     navigator.mediaDevices
//       .getUserMedia({ audio: true, video: false })
//       .then((stream) => {
//         try {
//           // Store the stream for later cleanup
//           microphoneStream.current = stream

//           // Create analyzer
//           const analyser = audioContextRef.current!.createAnalyser()
//           analyser.fftSize = 64  // Safe, low
//           analyser.smoothingTimeConstant = 0.5 // Add smoothing

//           // Create source from microphone
//           const source = audioContextRef.current!.createMediaStreamSource(stream)
//           source.connect(analyser)

//           // Set up data array for analysis
//           const dataArray = new Uint8Array(analyser.frequencyBinCount)

//           // Store references
//           userAudioAnalyser.current = analyser
//           userAudioDataArray.current = dataArray

//           console.log("Microphone access successful, analyzer created")

//           // Start the visualization immediately
//           startUserAudioVisualization()
//         } catch (err) {
//           console.error("Error setting up audio analyzer:", err)
//         }
//       })
//       .catch((err) => {
//         console.error("Error accessing microphone:", err)
//       })
//   }

//   // Clean up microphone resources
//   const cleanupMicrophone = () => {
//     if (microphoneStream.current) {
//       microphoneStream.current.getTracks().forEach((track) => track.stop())
//       microphoneStream.current = null
//     }

//     if (userAudioAnalyser.current) {
//       userAudioAnalyser.current = null
//       userAudioDataArray.current = null
//     }

//     if (audioContextRef.current) {
//       try {
//         audioContextRef.current.close().catch((err) => console.error("Error closing AudioContext:", err))
//       } catch (err) {
//         console.error("Error closing AudioContext:", err)
//       }
//       audioContextRef.current = null
//     }
//   }

//   // Start user audio visualization
//   const startUserAudioVisualization = () => {
//     // If we already have a real microphone analyzer, use that
//     if (userAudioAnalyser.current && userAudioDataArray.current) {
//       if (animationFrameId.current) return // Already running

//       const updateMicVisualization = () => {
//         if (!userAudioAnalyser.current || !isListening || !isVoiceMode || isAiSpeaking) {
//           if (animationFrameId.current) {
//             cancelAnimationFrame(animationFrameId.current)
//             animationFrameId.current = null
//           }
//           return
//         }

//         // Get audio data
//         userAudioAnalyser.current.getByteFrequencyData(userAudioDataArray.current!)

//         // Calculate average volume
//         let sum = 0
//         const dataArray = userAudioDataArray.current!
//         for (let i = 0; i < dataArray.length; i++) {
//           sum += dataArray[i]
//         }
//         const average = sum / dataArray.length

//         // Normalize to 0-1 range and apply some smoothing
//         const normalizedLevel = Math.min(average / 128, 1)

//         // Use a very low threshold to detect any sound
//         const isSpeaking = normalizedLevel > 0.02

//         // If we detect sound or have recent activity, show visualization
//         const now = Date.now()
//         const recentActivity = now - lastActivityTime.current < 800

//         if (isSpeaking) {
//           // Update last activity time when we detect sound
//           lastActivityTime.current = now

//           // Explicitly set user speaking state to true
//           setIsUserSpeaking(true)

//           // Apply some amplification to make visualization more visible
//           const amplifiedLevel = Math.min(normalizedLevel * 1.5, 1)
//           setUserAudioLevel(amplifiedLevel)
//           setAudioLevel(amplifiedLevel)
//         } else if (recentActivity) {
//           // Gradually reduce level for smoother transition
//           setUserAudioLevel((prev) => Math.max(prev * 0.9, 0))
//           setAudioLevel((prev) => Math.max(prev * 0.9, 0))
//         } else {
//           // No speech detected - explicitly set to zero
//           setIsUserSpeaking(false)
//           setUserAudioLevel(0)
//           setAudioLevel(0)
//         }

//         // Continue loop
//         animationFrameId.current = requestAnimationFrame(updateMicVisualization)
//       }

//       // Start the visualization loop
//       animationFrameId.current = requestAnimationFrame(updateMicVisualization)
//     }
//     // Otherwise use simulated audio
//     else if (!audioLevelInterval.current) {
//       startSimulatedUserAudio()
//     }
//   }

//   // Function to start simulated user audio when real microphone access fails
//   function startSimulatedUserAudio() {
//     console.log("Using simulated user audio levels")
//     if (audioLevelInterval.current) return // Already running

//     audioLevelInterval.current = setInterval(() => {
//       const now = Date.now()
//       const timeSinceLastActivity = now - lastActivityTime.current

//       // Consider the user speaking if:
//       // 1. We're in listening mode and not AI speaking
//       // 2. AND either:
//       //    a. We have a transcript OR
//       //    b. It's been less than 800ms since we last detected activity
//       const hasTranscript = transcript !== "" && transcript.length > 0
//       const recentActivity = timeSinceLastActivity < 800

//       if (isListening && !isAiSpeaking && (hasTranscript || recentActivity || isUserSpeaking)) {
//         // Create a more natural speaking pattern
//         const baseLevel = 0.5 // Higher base level for better visibility
//         const randomVariation = Math.random() * 0.4 // Random variation
//         const patternVariation = Math.sin(now / 250) * 0.2 // Sinusoidal pattern

//         const newLevel = Math.min(Math.max(baseLevel + randomVariation + patternVariation, 0.3), 0.9)

//         // Explicitly set user speaking state to true
//         setIsUserSpeaking(true)
//         setUserAudioLevel(newLevel)
//         setAudioLevel(newLevel) // Keep the main audioLevel in sync

//         // If we have a transcript, update the last activity time
//         if (hasTranscript) {
//           lastActivityTime.current = now
//         }
//       } else if (recentActivity) {
//         // Gradually fade out for smoother transition
//         setUserAudioLevel((prev) => Math.max(prev * 0.9, 0))
//         setAudioLevel((prev) => Math.max(prev * 0.9, 0))
//       } else {
//         // No speech detected - explicitly set to zero
//         setIsUserSpeaking(false)
//         setUserAudioLevel(0)
//         setAudioLevel(0)
//       }
//     }, 80) // Faster updates for more responsive visualization
//   }

//   // Stop user audio visualization
//   const stopUserAudioVisualization = () => {
//     if (animationFrameId.current) {
//       cancelAnimationFrame(animationFrameId.current)
//       animationFrameId.current = null
//     }

//     if (audioLevelInterval.current) {
//       clearInterval(audioLevelInterval.current)
//       audioLevelInterval.current = null
//     }

//     setUserAudioLevel(0)
//     setIsUserSpeaking(false)
//   }

//   // Stop AI audio visualization
//   const stopAiAudioVisualization = () => {
//     if (aiAudioLevelInterval.current) {
//       clearInterval(aiAudioLevelInterval.current)
//       aiAudioLevelInterval.current = null
//     }
//     setAiAudioLevel(0)
//   }

//   // Start AI audio visualization
//   const startAiAudioVisualization = () => {
//     if (aiAudioLevelInterval.current) return // Already running

//     console.log("Starting AI audio visualization")

//     // Set a high initial level immediately
//     setIsAiSpeaking(true)
//     setAiAudioLevel(0.8)
//     setAudioLevel(0.8)

//     // Start the continuous wave animation
//     startWaveAnimation()

//     aiAudioLevelInterval.current = setInterval(() => {
//       if (!isAiSpeaking) {
//         stopAiAudioVisualization()
//         return
//       }

//       // Create a more natural speaking pattern for AI
//       const now = Date.now()
//       const baseLevel = 0.6 // Higher base level
//       const randomVariation = Math.random() * 0.3 // Random variation
//       const patternVariation = Math.sin(now / 150) * 0.15 // Sinusoidal pattern

//       const newLevel = Math.min(Math.max(baseLevel + randomVariation + patternVariation, 0.4), 0.95)
//       setAiAudioLevel(newLevel)
//       setAudioLevel(newLevel) // Keep the main audioLevel in sync
//     }, 50) // Much faster updates for more responsive visualization
//   }

//   // Function to start continuous wave animation
//   const startWaveAnimation = () => {
//     if (waveAnimationFrameId.current) {
//       // If already running, just make sure we don't have duplicate animations
//       return
//     }

//     const animate = () => {
//       // Request the next frame first to ensure smooth animation
//       waveAnimationFrameId.current = requestAnimationFrame(animate)

//       // Only update audio levels if someone is speaking
//       if (isVoiceMode && (isAiSpeaking || isUserSpeaking)) {
//         // Force a re-render of the wave bars with more dynamic values
//         if (isAiSpeaking) {
//           // Create more dynamic, natural-looking variations for AI
//           const now = Date.now()
//           const baseVariation = Math.sin(now / 120) * 0.15
//           const randomVariation = (Math.random() - 0.5) * 0.12

//           // Combine variations with a minimum level
//           setAiAudioLevel(Math.max(0.5, Math.min(0.95, 0.7 + baseVariation + randomVariation)))
//         } else if (isUserSpeaking) {
//           // Create more dynamic, natural-looking variations for user
//           const now = Date.now()
//           const baseVariation = Math.sin(now / 100) * 0.15
//           const randomVariation = (Math.random() - 0.5) * 0.12

//           // Combine variations with a minimum level
//           setUserAudioLevel(Math.max(0.5, Math.min(0.95, 0.7 + baseVariation + randomVariation)))
//         }
//       } else {
//         // Reset audio levels to zero when no one is speaking
//         if (!isAiSpeaking && !isUserSpeaking) {
//           setAiAudioLevel(0)
//           setUserAudioLevel(0)
//           setAudioLevel(0)

//           // Stop animation if no one is speaking
//           if (waveAnimationFrameId.current) {
//             cancelAnimationFrame(waveAnimationFrameId.current)
//             waveAnimationFrameId.current = null
//           }
//         }
//       }
//     }

//     // Start animation loop
//     waveAnimationFrameId.current = requestAnimationFrame(animate)
//   }

//   // Function to stop wave animation
//   const stopWaveAnimation = () => {
//     if (waveAnimationFrameId.current) {
//       cancelAnimationFrame(waveAnimationFrameId.current)
//       waveAnimationFrameId.current = null
//     }
//   }

//   // Reset state when voice mode opens/closes
//   useEffect(() => {
//     if (isVoiceMode) {
//       setTranscript("")
//       setVapiError(null)
//       setIsProcessing(false)
//       setAudioLevel(0)
//       setAiAudioLevel(0)
//       setUserAudioLevel(0)
//       setIsAiSpeaking(false)
//       setIsUserSpeaking(false)
//       setIsClosingVoiceMode(false)
//       lastActivityTime.current = 0
//     } else {
//       // Clean up when voice mode is closed
//       stopUserAudioVisualization()
//       stopAiAudioVisualization()
//       stopWaveAnimation()
//       cleanupMicrophone()
//     }
//   }, [isVoiceMode])

//   // Scroll to bottom when messages change
//   useEffect(() => {
//     messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
//   }, [messages])

//   // Toggle voice mode
//   const toggleVoiceMode = () => {
//     const newVoiceMode = !isVoiceMode
//     setIsVoiceMode(newVoiceMode)

//     // If we're turning on voice mode, automatically start listening
//     if (newVoiceMode) {
//       // Add a small delay to ensure voice mode UI is fully mounted
//       setTimeout(() => {
//         startListening()
//       }, 300)
//     }
//   }

//   // Start listening for voice input
//   const startListening = () => {
//     console.log("Starting listening")
//     setIsProcessing(true)

//     // Click the Vapi button to start the call
//     if (vapiButtonRef.current) {
//       vapiButtonRef.current.click()
//       console.log("Clicked Vapi button")
//     } else {
//       const errorMsg = "Vapi button not found"
//       console.error(errorMsg)
//       setVapiError(errorMsg)
//       setIsProcessing(false)
//     }
//   }

//   // Stop listening and process voice input
//   const stopListening = () => {
//     console.log("Stopping listening")

//     // Click the Vapi button again to end the call
//     if (vapiButtonRef.current) {
//       vapiButtonRef.current.click()
//       console.log("Clicked Vapi button to end call")
//     }

//     setIsListening(false)
//     setIsProcessing(true)
//     setIsUserSpeaking(false)

//     // Reset audio levels when stopping
//     setUserAudioLevel(0)
//     setAiAudioLevel(0)
//     setAudioLevel(0)

//     // If we have a transcript AND the AI wasn't speaking, send it
//     // This prevents sending the transcript when stopping the AI's response
//     if (transcript.trim() && !isAiSpeaking) {
//       setTimeout(() => {
//         handleSendVoiceMessage(transcript)
//         setIsVoiceMode(false)
//         setIsProcessing(false)
//         // Clear the transcript after sending to prevent it from appearing elsewhere
//         setTranscript("")
//       }, 500) // Short delay to show processing state
//     } else {
//       // If we're stopping while AI is speaking, just close without sending
//       setIsProcessing(false)
//       if (isAiSpeaking) {
//         console.log("Stopping AI speech, not sending transcript")
//         setIsAiSpeaking(false)
//         // Clear the transcript to prevent accidental sending
//         setTranscript("")
//       }
//     }
//   }

//   // Handle sending a voice message
//   const handleSendVoiceMessage = (text: string) => {
//     if (!text.trim() || isLoading || isTyping) return

//     // Don't send if AI was speaking (user was just stopping the AI)
//     if (isAiSpeaking) {
//       console.log("Not sending transcript because AI was speaking")
//       return
//     }

//     const userMessage = {
//       text: text,
//       isUser: true,
//       id: `msg-${Date.now()}`,
//     }

//     // Make sure we're not updating the input field
//     setNewMessage("")

//     setMessages((prevMessages) => [...prevMessages, userMessage])

//     // Process the voice message using the same logic as normal text messages
//     handleApiSendMessage(text, userMessage)
//   }

//   // Handle sending a new message
//   const handleSendMessage = async (e?: React.FormEvent) => {
//     if (e) e.preventDefault()
//     if (!newMessage.trim() || isLoading || isTyping) return

//     const userMessage = {
//       text: newMessage,
//       isUser: true,
//       id: `msg-${Date.now()}`,
//     }

//     setMessages((prevMessages) => [...prevMessages, userMessage])
//     setNewMessage("")

//     // Process the text message
//     handleApiSendMessage(newMessage, userMessage)
//   }

//   // Common API sending logic for both text and voice messages
//   const handleApiSendMessage = async (messageText: string, userMessage: Message) => {
//     setIsLoading(true)
//     setIsTyping(true)

//     try {
//       const request = {
//         message: messageText,
//         ...(conversationId
//           ? { conversation_id: conversationId }
//           : {
//               first_name: userName,
//               phone_number: userPhone,
//             }),
//       }

//       const streamingResponse = await sendChatMessage(request)

//       const reader = streamingResponse.getReader()
//       let newConversationId: string | null = null
//       let fullMessage = ""

//       try {
//         while (true) {
//           const { done, value } = await reader.read()
//           if (done) break

//           // Convert the chunk to text
//           const chunk = new TextDecoder().decode(value)

//           // Split by newlines in case multiple JSON objects arrived
//           const lines = chunk.split("\n").filter((line) => line.trim())

//           for (const line of lines) {
//             try {
//               const data = JSON.parse(line)

//               if (data.conversation_id) {
//                 newConversationId = data.conversation_id
//                 if (!conversationId) {
//                   setConversationId(newConversationId)
//                   localStorage.setItem("conversationId", newConversationId as string)
//                 }
//                 setIsLoading(false)
//               }

//               if (data.user_name) {
//                 setUserName(data.user_name)
//                 localStorage.setItem("userName", data.user_name)
//               }

//               if (data.message) {
//                 fullMessage += data.message

//                 setMessages((prevMessages) => {
//                   // Filter out the last assistant message if it's a partial response
//                   const filteredMessages = prevMessages.filter(
//                     (msg) => msg.id !== `assistant-partial-${userMessage.id}`,
//                   )

//                   return [
//                     ...filteredMessages,
//                     {
//                       text: fullMessage,
//                       isUser: false,
//                       id: `assistant-partial-${userMessage.id}`,
//                     },
//                   ]
//                 })
//               }

//               if (data.error) {
//                 throw new Error(data.error)
//               }
//             } catch (jsonError) {
//               console.error("Error parsing JSON line:", line, jsonError)
//             }
//           }
//         }
//       } finally {
//         reader.releaseLock()
//       }

//       // Update with the final message
//       setMessages((prevMessages) => {
//         // Filter out the partial response
//         const filteredMessages = prevMessages.filter((msg) => msg.id !== `assistant-partial-${userMessage.id}`)

//         return [
//           ...filteredMessages,
//           {
//             text: fullMessage,
//             isUser: false,
//             id: `msg-${Date.now()}`,
//           },
//         ]
//       })

//       // Get all messages for the chat history
//       const chatMessages: ChatMessage[] = messages.map((message) => {
//         return {
//           role: message.isUser ? "user" : "assistant",
//           content: message.text,
//         }
//       })

//       // Add the current exchange
//       chatMessages.push({
//         role: "user",
//         content: messageText,
//       })
//       chatMessages.push({
//         role: "assistant",
//         content: fullMessage,
//       })

//       try {
//         // Try to update chat history but continue even if it fails
//         const newChatId = await updateChatHistory(chatId, chatMessages)
//         if (newChatId) {
//           setChatId(newChatId)
//         }
//       } catch (historyError) {
//         console.error("Failed to update chat history:", historyError)
//         // Continue with the conversation even if history update fails
//       }
//     } catch (error) {
//       console.error("Error sending message:", error)

//       setMessages((currentMessages) => [
//         ...currentMessages,
//         {
//           text: "I'm sorry, I encountered an error. Please try again later.",
//           isUser: false,
//           id: `msg-${Date.now()}`,
//         },
//       ])
//     } finally {
//       setIsLoading(false)
//       setIsTyping(false)
//     }
//   }

//   // New function to handle closing the voice modal
//   const closeVoiceModal = () => {
//     console.log("Closing voice modal")

//     // Prevent multiple clicks by checking if we're already closing
//     if (isClosingVoiceMode) return

//     // Set the closing flag to true
//     setIsClosingVoiceMode(true)

//     // Immediately set isVoiceMode to false to prevent needing a second click
//     setIsVoiceMode(false)

//     // If we're listening or AI is speaking, we need to stop the Vapi call first
//     if (isListening || isAiSpeaking) {
//       console.log("Stopping active Vapi call before closing")

//       // Click the Vapi button to end the call if it exists
//       if (vapiButtonRef.current) {
//         try {
//           vapiButtonRef.current.click()
//           console.log("Clicked Vapi button to end call")
//         } catch (error) {
//           console.error("Error clicking Vapi button:", error)
//           // Force close even if clicking fails
//           completeVoiceModeClose()
//         }
//       } else {
//         // If no button, force close
//         completeVoiceModeClose()
//       }

//       // Set a timeout to force close if the call-end event doesn't fire
//       setTimeout(() => {
//         if (isClosingVoiceMode) {
//           console.log("Force closing voice modal after timeout")
//           completeVoiceModeClose()
//         }
//       }, 1000)
//     } else {
//       // If no active call, close immediately
//       completeVoiceModeClose()
//     }
//   }

//   // Function to complete the voice mode closure
//   const completeVoiceModeClose = () => {
//     console.log("Completing voice modal closure")

//     // Reset all voice-related states
//     setIsVoiceMode(false)
//     setIsClosingVoiceMode(false)
//     setIsListening(false)
//     setIsProcessing(false)
//     setIsAiSpeaking(false)
//     setIsUserSpeaking(false)
//     setTranscript("")
//     transcriptRef.current = ""
//     setAudioLevel(0)
//     setAiAudioLevel(0)
//     setUserAudioLevel(0)
//     lastActivityTime.current = 0

//     // Clear any audio intervals
//     if (audioLevelInterval.current) {
//       clearInterval(audioLevelInterval.current)
//       audioLevelInterval.current = null
//     }

//     if (aiAudioLevelInterval.current) {
//       clearInterval(aiAudioLevelInterval.current)
//       aiAudioLevelInterval.current = null
//     }

//     // Stop animation frame
//     if (animationFrameId.current) {
//       cancelAnimationFrame(animationFrameId.current)
//       animationFrameId.current = null
//     }

//     // Stop wave animation
//     stopWaveAnimation()

//     // Clean up audio resources
//     cleanupMicrophone()
//   }

//   // Add a useEffect to force update the wave animation when speaking states change

//   // Add this new useEffect to ensure wave animation updates when speaking states change
//   useEffect(() => {
//     if (isVoiceMode && (isAiSpeaking || isUserSpeaking)) {
//       // Set initial audio levels based on who is speaking
//       if (isAiSpeaking) {
//         setAiAudioLevel(0.8)
//         setAudioLevel(0.8)
//       } else if (isUserSpeaking) {
//         setUserAudioLevel(0.7)
//         setAudioLevel(0.7)
//       }

//       // Start the wave animation immediately
//       startWaveAnimation()
//     }
//   }, [isAiSpeaking, isUserSpeaking, isVoiceMode])

//   return (
//     <main className="flex min-h-[80vh] flex-col items-center px-6 py-0 relative bg-[#faf7f2] overflow-hidden">
//       <StatusBar />

//       <div className="w-full max-w-md pt-12 pb-24 flex-1 flex flex-col">
//         <h1
//           className={`font-normal mb-6 ${marcellusSC.className} transition-all duration-700 ease-out transform ${
//             isLoaded ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-8"
//           }`}
//           style={{ fontSize: "24px" }}
//         >
//           {userName && <>Hello, {userName}</>}
//         </h1>

//         <div
//           className={`transition-all duration-700 delay-200 ease-out transform ${
//             isLoaded ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-8"
//           }`}
//         >
//           <PalomaLogo className="mx-auto mb-8" />
//         </div>

//         <div
//           className={`flex-1 overflow-y-auto mb-6 transition-all duration-700 delay-400 ease-out transform ${
//             isLoaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
//           }`}
//         >
//           {/* <div className={`mb-4 text-center animate-fadeIn`} style={{ animationDelay: `${0 * 150}ms` }}> */}
//             {/* <div
//               className={`inline-block rounded-3xl py-4 ${manuale.className} ${
//                 false ? "bg-[#fdf6e3] shadow-[0_2px_8px_rgba(0,0,0,0.06)] max-w-[80%] px-6" : "px-2"
//               }`}
//               style={{
//                 textShadow: "0 0.2px 0.3px rgba(0,0,0,0.02)",
//               }}
//             >
//               <div className="prose text-center font-medium text-gray-600 text-lg">

//               </div>
//             </div> */}
//           {/* </div> */}
//           {messages.map((message, index) => (
//             <div
//               key={message.id || index}
//               className={`mb-4 ${message.isUser ? "text-right" : "text-left"} animate-fadeIn`}
//               style={{ animationDelay: `${index * 150}ms` }}
//             >
//               <div
//                 className={`inline-block rounded-3xl py-4 ${manuale.className} ${
//                   message.isUser
//                     ? "bg-[#fdf6e3] text-left shadow-[0_2px_8px_rgba(0,0,0,0.06)] max-w-[80%] px-6"
//                     : "text-left px-2"
//                 }`}
//                 style={{
//                   textShadow: "0 0.2px 0.3px rgba(0,0,0,0.02)",
//                 }}
//               >
//                 {message.isUser ? (
//                   <div>{message.text}</div>
//                 ) : (
//                   <div className="prose">
//                     <ReactMarkdown
//                       remarkPlugins={[remarkGfm]}
//                       components={{
//                         h1: ({ node, ...props }) => <h1 className={`text-3xl font-bold`} {...props} />,
//                       }}
//                     >
//                       {message.text}
//                     </ReactMarkdown>
//                   </div>
//                 )}
//               </div>
//             </div>
//           ))}

//           {isLoading && (
//             <div className="mb-4 text-left animate-fadeIn">
//               <div className="inline-block rounded-3xl px-6 py-4 bg-white text-left shadow-[0_2px_10px_rgba(0,0,0,0.08)]">
//                 <div className="flex space-x-2">
//                   <div className="w-2 h-2 rounded-full bg-gray-300 animate-pulse"></div>
//                   <div
//                     className="w-2 h-2 rounded-full bg-gray-300 animate-pulse"
//                     style={{ animationDelay: "0.2s" }}
//                   ></div>
//                   <div
//                     className="w-2 h-2 rounded-full bg-gray-300 animate-pulse"
//                     style={{ animationDelay: "0.4s" }}
//                   ></div>
//                 </div>
//               </div>
//             </div>
//           )}

//           <div ref={messagesEndRef} />
//         </div>

//         <form
//           onSubmit={handleSendMessage}
//           className={`fixed bottom-6 left-6 right-6 max-w-md mx-auto transition-all duration-700 delay-600 ease-out transform ${isLoaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
//         >
//           <div className="relative flex items-center">
//             <button
//               type="button"
//               onClick={toggleVoiceMode}
//               className="absolute left-1 p-3 rounded-full text-[#d4b978] flex items-center justify-center transition-all duration-300 hover:bg-[#fdf6e3]"
//             >
//               <Mic size={20} />
//             </button>
//             <input
//               type="text"
//               placeholder="Type a message..."
//               className={`w-full p-4 pl-16 pr-16 rounded-full border border-gray-200 bg-white ${manuale.className} shadow-sm`}
//               value={newMessage}
//               onChange={(e) => setNewMessage(e.target.value)}
//               disabled={isLoading || isVoiceMode}
//             />
//             <button
//               type="submit"
//               className={`absolute right-1 p-3 rounded-full bg-[#d4b978] text-white flex items-center justify-center shadow-sm transition-all duration-300 hover:bg-[#c9ad6e] ${isLoading || isVoiceMode ? "opacity-50 cursor-not-allowed" : ""}`}
//               disabled={isLoading || isVoiceMode}
//             >
//               <Send size={20} className="rotate-45" />
//             </button>
//           </div>
//         </form>
//       </div>

//       {isVoiceMode && (
//         <div className="fixed inset-0 bg-[#1a1a1a]/90 flex flex-col items-center justify-center z-50 animate-fadeIn">
//           <div className="absolute top-4 right-4 z-20">
//             <button
//               className="w-10 h-10 rounded-full bg-[#333333]/80 flex items-center justify-center text-white hover:bg-[#333333] transition-colors"
//               onClick={closeVoiceModal}
//               aria-label="Close voice modal"
//             >
//               <X size={24} />
//             </button>
//           </div>

//           <div className="relative w-full h-full flex flex-col items-center justify-center">
//             {/* VAPI Status Indicator */}
//             {vapiError && (
//               <div className="absolute top-8 left-1/2 transform -translate-x-1/2 bg-red-500/80 text-white px-4 py-2 rounded-full text-sm">
//                 {vapiError}
//               </div>
//             )}

//             {/* Fluid Visualization */}
//             <div className="relative w-64 h-64 mb-8 flex items-center justify-center">
//               <div className="absolute w-64 h-64 rounded-full bg-[#d4b978]/20 blur-xl"></div>

//               {/* Modern voice animation */}
//               <div
//                 className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full bg-gradient-to-b from-white via-[#fdf6e3] to-[#d4b978] flex items-center justify-center overflow-hidden ${!isProcessing && !isListening && !isAiSpeaking ? "cursor-pointer hover:shadow-lg transition-shadow" : ""}`}
//                 style={{ boxShadow: "0 0 30px rgba(212, 185, 120, 0.3)" }}
//                 onClick={() => {
//                   if (!isProcessing && !isListening && !isAiSpeaking) {
//                     startListening()
//                   }
//                 }}
//               >
//                 {/* Animated gradient background */}
//                 <div
//                   className="absolute inset-0 rounded-full animate-gradient-slow"
//                   style={{
//                     background:
//                       "linear-gradient(120deg, rgba(253, 246, 227, 0.3), rgba(212, 185, 120, 0.4), rgba(253, 246, 227, 0.3), rgba(212, 185, 120, 0.4))",
//                     backgroundSize: "400% 400%",
//                     opacity: 0.6 + audioLevel * 0.2,
//                   }}
//                 ></div>

//                 {/* Voice visualization - real-time animation for both AI and user */}
//                 <div className="flex items-end justify-center space-x-1 h-32 w-44 relative z-10">
//                   {Array.from({ length: 11 }).map((_, i) => {
//                     // Calculate position factor (center bars taller than edges)
//                     const positionFactor = 1 - Math.abs((i - 5) / 5) * 0.7

//                     // Calculate height based on speaking state
//                     let height = 3 // Default fixed height of 3px when not speaking

//                     if (isAiSpeaking || isUserSpeaking) {
//                       // When speaking, create a dynamic wave pattern
//                       const currentLevel = isAiSpeaking ? aiAudioLevel : userAudioLevel

//                       // Use current time to create wave effect with different phase for each bar
//                       const now = Date.now()
//                       const frequency = isAiSpeaking ? 180 : 150 // Different frequency for AI vs user
//                       const phase = i * (Math.PI / 5.5) // Different phase for each bar
//                       const waveEffect = Math.sin(now / frequency + phase) * 20 // Increased amplitude

//                       // Calculate height with position factor (middle bars higher)
//                       height = Math.max(3, 10 + waveEffect + currentLevel * 80 * positionFactor)
//                     }

//                     return (
//                       <div
//                         key={i}
//                         className="w-1.5 bg-[#d4b978] rounded-full"
//                         style={{
//                           height: `${height}px`,
//                           opacity: 0.8,
//                           // Remove transition for real-time animation
//                         }}
//                       />
//                     )
//                   })}
//                 </div>

//                 {/* Status text inside the circle */}
//                 <div className="absolute bottom-10 left-0 right-0 text-center">
//                   {isAiSpeaking ? (
//                     <p className={`${manuale.className} text-[#1a1a1a] font-medium text-sm`}>
//                       {/* AI Speaking
//                       <span className="inline-block ml-1">
//                         <span className="inline-block w-1 h-1 bg-[#1a1a1a] rounded-full animate-ping mx-0.5"></span>
//                         <span
//                           className="inline-block w-1 h-1 bg-[#1a1a1a] rounded-full animate-ping mx-0.5"
//                           style={{ animationDelay: "300ms" }}
//                         ></span>
//                         <span
//                           className="inline-block w-1 h-1 bg-[#1a1a1a] rounded-full animate-ping mx-0.5"
//                           style={{ animationDelay: "600ms" }}
//                         ></span>
//                       </span> */}
//                     </p>
//                   ) : isListening ? (
//                     <p className={`${manuale.className} text-[#1a1a1a] font-medium text-sm`}>
//                        Listening
//                       {/* <span className="inline-block ml-1">
//                         <span className="inline-block w-1 h-1 bg-[#1a1a1a] rounded-full animate-ping mx-0.5"></span>
//                         <span
//                           className="inline-block w-1 h-1 bg-[#1a1a1a] rounded-full animate-ping mx-0.5"
//                           style={{ animationDelay: "300ms" }}
//                         ></span>
//                         <span
//                           className="inline-block w-1 h-1 bg-[#1a1a1a] rounded-full animate-ping mx-0.5"
//                           style={{ animationDelay: "600ms" }}
//                         ></span>
//                       </span> */}
//                     </p>
//                   ) : !isProcessing ? (
//                     <>
//                     {/* <p className={`${manuale.className} text-[#1a1a1a] font-medium text-sm`}>Tap to speak</p> */}
//                     </>
//                   ) : null}
//                 </div>
//               </div>

//               {/* VAPI Status Overlay */}
//               {isProcessing && (
//                 <div className="absolute inset-0 flex items-center justify-center z-10">
//                   <div className="bg-[#1a1a1a]/50 rounded-full w-full h-full flex items-center justify-center">
//                     <div className="text-white text-center">
//                       <p className={`${manuale.className} text-sm`}>Loading...</p>
//                     </div>
//                   </div>
//                 </div>
//               )}
//             </div>
//           </div>

//           {/* Hidden div to hold the Vapi button */}
//           <div ref={containerRef} className="hidden"></div>
//         </div>
//       )}
//     </main>
//   )
// }

"use client";

import type React from "react";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Manuale, Marcellus_SC } from "next/font/google";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import StatusBar from "@/components/status-bar";
import PalomaLogo from "@/components/paloma-logo";
import { Mic, Send, X } from "lucide-react";
import {
  type ChatMessage,
  sendChatMessage,
  updateChatHistory,
} from "@/lib/api";
import { startRealtimeSession, stopRealtimeSession } from "@/lib/voice";

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

// WaveForm component for audio visualization
const WaveForm: React.FC<{ size: number; className?: string }> = ({
  size,
  className,
}) => {
  return (
    <div
      className={`flex items-center justify-center h-${size} ${
        className || ""
      }`}
    >
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
  );
};

export default function ChatPage() {
  const router = useRouter();
  const [userName, setUserName] = useState<string>("");
  const [userPhone, setUserPhone] = useState<string>("");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([
    {
      text: "To begin, what is your name?",
      isUser: false,
      id: "initial-message",
    },
  ]);
  const [newMessage, setNewMessage] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const [isLoaded, setIsLoaded] = useState<boolean>(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isVoiceMode, setIsVoiceMode] = useState<boolean>(false);
  const [isListening, setIsListening] = useState<boolean>(false);
  const [transcript, setTranscript] = useState<string>("");
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const [apiError, setApiError] = useState<string | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  // const [timeLeft, setTimeLeft] = useState<number>(300) // Default 5 minutes
  const [isRecording, setIsRecording] = useState(false);
  const [isAiSpeaking, setIsAiSpeaking] = useState<boolean>(false);
  const [isUserSpeaking, setIsUserSpeaking] = useState<boolean>(false);
  const [isClosingVoiceMode, setIsClosingVoiceMode] = useState<boolean>(false);

  // WebRTC refs
  const connectionRef = useRef<RTCPeerConnection | null>(null);
  const dataChannelRef = useRef<RTCDataChannel | null>(null);
  const conversationHistoryRef = useRef<object[]>([]);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const audioRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const languageRef = useRef<"hindi" | "english">("hindi");

  // Audio visualization refs
  const lastActivityTime = useRef<number>(0);
  const microphoneStream = useRef<MediaStream | null>(null);
  const [aiAudioLevel, setAiAudioLevel] = useState<number>(0);
  const [userAudioLevel, setUserAudioLevel] = useState<number>(0);
  const aiAudioLevelInterval = useRef<NodeJS.Timeout | null>(null);
  const userAudioAnalyser = useRef<AnalyserNode | null>(null);
  const userAudioDataArray = useRef<Uint8Array | null>(null);
  const animationFrameId = useRef<number | null>(null);
  const waveAnimationFrameId = useRef<number | null>(null);
  const audioLevelInterval = useRef<NodeJS.Timeout | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const waveBarHeights = useRef<number[]>(Array(11).fill(3)); // Store heights for wave bars
  const animationTimestamp = useRef<number>(0); // For tracking animation frames

  const [chatId, setChatId] = useState<string | null>(null);

  // Initialize user data and check for initial question
  useEffect(() => {
    setTimeout(() => {
      setIsLoaded(true);
    }, 100);

    // Create audio element for AI speech
    const audioElement = new Audio();
    audioElement.autoplay = true;
    audioElementRef.current = audioElement;

    // Set up event listeners for audio element
    audioElement.onplay = () => {
      setIsAiSpeaking(true);
      startAiAudioVisualization();
    };

    audioElement.onended = () => {
      setIsAiSpeaking(false);
      stopAiAudioVisualization();

      // If we're closing voice mode, complete it after audio ends
      if (isClosingVoiceMode) {
        completeVoiceModeClose();
      }
    };

    // Check available voice seconds

    return () => {
      // Clean up audio element
      if (audioElementRef.current) {
        audioElementRef.current.pause();
        audioElementRef.current.src = "";
      }

      // Clean up WebRTC connection
      if (connectionRef.current) {
        connectionRef.current.close();
        connectionRef.current = null;
      }

      // Clean up data channel
      if (dataChannelRef.current) {
        dataChannelRef.current.close();
        dataChannelRef.current = null;
      }

      // Clean up audio stream
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach((track) => track.stop());
        audioStreamRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (isVoiceMode) {
      // Start animation frame loop
      waveAnimationFrameId.current = requestAnimationFrame(updateWaveAnimation);
    }

    return () => {
      // Clean up animation frame on unmount or when voice mode ends
      if (waveAnimationFrameId.current) {
        cancelAnimationFrame(waveAnimationFrameId.current);
        waveAnimationFrameId.current = null;
      }
    };
  }, [isVoiceMode, isAiSpeaking, isUserSpeaking]);

  const updateWaveAnimation = () => {
    if (!isVoiceMode) return;

    // Request next animation frame if still in voice mode
    waveAnimationFrameId.current = requestAnimationFrame(updateWaveAnimation);

    // Force re-render by updating animation timestamp
    animationTimestamp.current = Date.now();

    // Use a state update that doesn't cause re-renders but triggers the
    // React cycle to re-evaluate the JSX
    setAudioLevel((prev) => {
      // Return same value if not changed
      if (isAiSpeaking) {
        return aiAudioLevel;
      } else if (isUserSpeaking) {
        return userAudioLevel;
      }
      return prev;
    });
  };

  // Handle voice timer
  // useEffect(() => {
  //   let timer: NodeJS.Timeout
  //   if (isRecording && timeLeft > 0) {
  //     timer = setInterval(() => {
  //       setTimeLeft((prev) => prev - 1)
  //     }, 1000)
  //   } else if (timeLeft === 0) {
  //     handleStopRecording()
  //   }
  //   return () => clearInterval(timer)
  // }, [isRecording, timeLeft])

  // Handle voice mode closing when modal is closed
  useEffect(() => {
    if (!isVoiceMode && isRecording) {
      handleStopRecording();
    }
  }, [isVoiceMode, isRecording]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Set up data channel message handler
  useEffect(() => {
    // Function to handle messages from the data channel
    const handleDataChannelMessage = (event: MessageEvent) => {
      try {
        const message = JSON.parse(event.data);
        console.log("Received message from data channel:", message);

        if (message.type === "text" && message.text) {
          // Add AI message to the chat
          setMessages((prevMessages) => [
            ...prevMessages,
            {
              text: message.text,
              isUser: false,
              id: `ai-speech-${Date.now()}`,
            },
          ]);

          // If we have audio synthesis, play it
          if (message.audio && message.audio.length > 0) {
            playAudioFromBase64(message.audio);
          }
        } else if (message.type === "transcript" && message.transcript) {
          // Update transcript
          setTranscript(message.transcript);
          setIsUserSpeaking(true);
          lastActivityTime.current = Date.now();
          setUserAudioLevel(0.6);
        } else if (message.type === "error") {
          console.error("Error from OpenAI:", message.error);
          setApiError(
            typeof message.error === "string"
              ? message.error
              : "Voice service error"
          );
        }
      } catch (error) {
        console.error("Error handling data channel message:", error);
      }
    };

    // Set up the handler if we have a data channel
    if (dataChannelRef.current) {
      dataChannelRef.current.onmessage = handleDataChannelMessage;
    }

    return () => {
      // Clean up the handler
      if (dataChannelRef.current) {
        dataChannelRef.current.onmessage = null;
      }
    };
  }, [dataChannelRef.current]);

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

  // RTCPeerConnection handling
  const handleStartRecording = async () => {
    if (connectionRef.current) {
      console.warn("Connection already exists. Restarting...");
      await handleStopRecording();
    }

    try {
      setIsProcessing(true);


      // Get session token from the new endpoint
      const tokenResponse = await fetch("/api/voice");
      console.log("AOPIS ", tokenResponse);

      if (!tokenResponse.ok) {
        throw new Error(
          `Failed to get session token: ${tokenResponse.statusText}`
        );
      }

      const tokenData = await tokenResponse.json();
      console.log("TokenData", tokenData);
      // if (!tokenData.token) {
      //   throw new Error("Failed to get voice session token")
      // }

      const clientSecret = tokenData.data.voiceToken;
      console.log("Got client secret for OpenAI session");

      // Create a new RTCPeerConnection
      const newConnection = new RTCPeerConnection({
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" },
          { urls: "stun:stun1.l.google.com:19302" },
        ],
      });
      connectionRef.current = newConnection;

      // Set up connection event handlers
      newConnection.onicecandidate = (event) => {
        console.log("ICE candidate:", event.candidate);
      };

      newConnection.onconnectionstatechange = () => {
        console.log("Connection state:", newConnection.connectionState);
        if (newConnection.connectionState === "connected") {
          setIsProcessing(false);
          setIsListening(true);
          startUserAudioVisualization();
        } else if (
          ["disconnected", "failed", "closed"].includes(
            newConnection.connectionState
          )
        ) {
          setIsListening(false);
          stopUserAudioVisualization();
        }
      };

      newConnection.ondatachannel = (event) => {
        console.log("Data channel received:", event.channel);
        dataChannelRef.current = event.channel;
        setupDataChannelHandlers(event.channel);
      };

      // Start the realtime session with the client secret
      await startRealtimeSession(
        newConnection,
        dataChannelRef,
        conversationHistoryRef,
        clientSecret, // Pass the client secret here
        languageRef,
        chatId
      );

      setIsRecording(true);
    } catch (error) {
      console.error("Error starting recording:", error);
      setApiError((error as Error).message || "Failed to start voice chat");
      setIsProcessing(false);

      // Clean up on error
      if (connectionRef.current) {
        connectionRef.current.close();
        connectionRef.current = null;
      }
    }
  };

  const handleStopRecording = async () => {
    setIsListening(false);
    setIsProcessing(true);

    try {
      if (connectionRef.current) {
        await stopRealtimeSession(
          connectionRef.current,
          dataChannelRef,
          conversationHistoryRef
        );
        connectionRef.current = null;
        dataChannelRef.current = null;
      }

      // If we have a transcript, send it as a regular message
      if (transcript.trim() && !isAiSpeaking) {
        handleSendVoiceMessage(transcript);
      }

      setTranscript("");
      setIsRecording(false);
    } catch (error) {
      console.error("Error stopping recording:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  // Set up data channel handlers
  const setupDataChannelHandlers = (channel: RTCDataChannel) => {
    channel.onopen = () => {
      console.log("Data channel opened");
    };

    channel.onclose = () => {
      console.log("Data channel closed");
    };

    channel.onerror = (error) => {
      console.error("Data channel error:", error);
      setApiError("Voice chat connection error");
    };

    channel.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        console.log("Received message from data channel:", message);

        if (message.type === "text" && message.text) {
          // Add AI message to the chat
          setMessages((prevMessages) => [
            ...prevMessages,
            {
              text: message.text,
              isUser: false,
              id: `ai-speech-${Date.now()}`,
            },
          ]);

          // Store in conversation history
          conversationHistoryRef.current.push({
            role: "assistant",
            content: message.text,
          });

          // If we have audio synthesis, play it
          if (message.audio && message.audio.length > 0) {
            playAudioFromBase64(message.audio);
          }
        } else if (message.type === "transcript" && message.transcript) {
          // Update transcript
          setTranscript(message.transcript);
          setIsUserSpeaking(true);
          lastActivityTime.current = Date.now();
          setUserAudioLevel(0.6);

          // Store in conversation history
          conversationHistoryRef.current.push({
            role: "user",
            content: message.transcript,
          });
        } else if (message.type === "error") {
          console.error("Error from OpenAI:", message.error);
          setApiError(
            typeof message.error === "string"
              ? message.error
              : "Voice service error"
          );
        }
      } catch (error) {
        console.error("Error handling data channel message:", error);
      }
    };
  };

  // Send a text message through the data channel
  const sendTextThroughDataChannel = (text: string) => {
    if (dataChannelRef.current?.readyState === "open") {
      dataChannelRef.current.send(
        JSON.stringify({
          type: "text",
          text: text,
        })
      );
      return true;
    }
    return false;
  };

  // Play audio from base64 string
  const playAudioFromBase64 = (base64Audio: string) => {
    try {
      // Convert base64 to blob
      const binaryString = atob(base64Audio);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const audioBlob = new Blob([bytes], { type: "audio/mp3" });

      // Create object URL and play audio
      const audioUrl = URL.createObjectURL(audioBlob);

      if (audioElementRef.current) {
        audioElementRef.current.src = audioUrl;
        audioElementRef.current.play().catch((error) => {
          console.error("Error playing audio:", error);
        });
      }

      // Set AI speaking state
      setIsAiSpeaking(true);
      setIsUserSpeaking(false);

      // Start AI audio visualization
      startAiAudioVisualization();
    } catch (error) {
      console.error("Error playing audio:", error);
    }
  };

  // Function to start simulated user audio when real microphone access fails
  function startSimulatedUserAudio() {
    console.log("Using simulated user audio levels");
    if (audioLevelInterval.current) return; // Already running

    audioLevelInterval.current = setInterval(() => {
      const now = Date.now();
      const timeSinceLastActivity = now - lastActivityTime.current;

      // Consider the user speaking if:
      // 1. We're in listening mode and not AI speaking
      // 2. AND either:
      //    a. We have a transcript OR
      //    b. It's been less than 800ms since we last detected activity
      const hasTranscript = transcript !== "" && transcript.length > 0;
      const recentActivity = timeSinceLastActivity < 800;

      if (
        isListening &&
        !isAiSpeaking &&
        (hasTranscript || recentActivity || isUserSpeaking)
      ) {
        // Create a more natural speaking pattern
        const baseLevel = 0.5; // Higher base level for better visibility
        const randomVariation = Math.random() * 0.4; // Random variation
        const patternVariation = Math.sin(now / 250) * 0.2; // Sinusoidal pattern

        const newLevel = Math.min(
          Math.max(baseLevel + randomVariation + patternVariation, 0.3),
          0.9
        );

        // Explicitly set user speaking state to true and AI speaking to false
        setIsUserSpeaking(true);
        setIsAiSpeaking(false);

        setUserAudioLevel(newLevel);
        setAiAudioLevel(0); // Reset AI audio level
        setAudioLevel(newLevel); // Keep the main audioLevel in sync

        // If we have a transcript, update the last activity time
        if (hasTranscript) {
          lastActivityTime.current = now;
        }
      } else if (recentActivity) {
        // Gradually fade out for smoother transition
        setUserAudioLevel((prev) => Math.max(prev * 0.9, 0));
        setAudioLevel((prev) => Math.max(prev * 0.9, 0));
      } else {
        // No speech detected - explicitly set to zero
        setIsUserSpeaking(false);
        setUserAudioLevel(0);
        setAudioLevel(0);
      }
    }, 80); // Faster updates for more responsive visualization
  }

  // Start user audio visualization
  const startUserAudioVisualization = () => {
    // If we already have a real microphone analyzer, use that
    if (userAudioAnalyser.current && userAudioDataArray.current) {
      if (animationFrameId.current) return; // Already running

      const updateMicVisualization = () => {
        if (
          !userAudioAnalyser.current ||
          !isListening ||
          !isVoiceMode ||
          isAiSpeaking
        ) {
          if (animationFrameId.current) {
            cancelAnimationFrame(animationFrameId.current);
            animationFrameId.current = null;
          }
          return;
        }

        // Get audio data
        userAudioAnalyser.current.getByteFrequencyData(
          userAudioDataArray.current!
        );

        // Calculate average volume
        let sum = 0;
        const dataArray = userAudioDataArray.current!;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const average = sum / dataArray.length;

        // Normalize to 0-1 range and apply some smoothing
        const normalizedLevel = Math.min(average / 128, 1);

        // Use a very low threshold to detect any sound
        const isSpeaking = normalizedLevel > 0.02;

        // If we detect sound or have recent activity, show visualization
        const now = Date.now();
        const recentActivity = now - lastActivityTime.current < 800;

        if (isSpeaking) {
          // Update last activity time when we detect sound
          lastActivityTime.current = now;

          // Explicitly set user speaking state to true and AI speaking to false
          setIsUserSpeaking(true);
          setIsAiSpeaking(false);

          // Apply some amplification to make visualization more visible
          const amplifiedLevel = Math.min(normalizedLevel * 1.5, 1);
          setUserAudioLevel(amplifiedLevel);
          setAiAudioLevel(0); // Reset AI audio level
          setAudioLevel(amplifiedLevel);
        } else if (recentActivity) {
          // Gradually reduce level for smoother transition
          setUserAudioLevel((prev) => Math.max(prev * 0.9, 0));
          setAudioLevel((prev) => Math.max(prev * 0.9, 0));
        } else {
          // No speech detected - explicitly set to zero
          setIsUserSpeaking(false);
          setUserAudioLevel(0);
          setAudioLevel(0);
        }

        // Continue loop
        animationFrameId.current = requestAnimationFrame(
          updateMicVisualization
        );
      };

      // Start the visualization loop
      animationFrameId.current = requestAnimationFrame(updateMicVisualization);
    }
    // Otherwise use simulated audio
    else if (!audioLevelInterval.current) {
      startSimulatedUserAudio();
    }
  };

  // Stop user audio visualization
  const stopUserAudioVisualization = () => {
    if (animationFrameId.current) {
      cancelAnimationFrame(animationFrameId.current);
      animationFrameId.current = null;
    }

    if (audioLevelInterval.current) {
      clearInterval(audioLevelInterval.current);
      audioLevelInterval.current = null;
    }

    setUserAudioLevel(0);
    setIsUserSpeaking(false);
  };

  // Stop AI audio visualization
  const stopAiAudioVisualization = () => {
    if (aiAudioLevelInterval.current) {
      clearInterval(aiAudioLevelInterval.current);
      aiAudioLevelInterval.current = null;
    }
    setAiAudioLevel(0);
  };

  // Start AI audio visualization
  const startAiAudioVisualization = () => {
    if (aiAudioLevelInterval.current) return; // Already running

    console.log("Starting AI audio visualization");

    // Set a high initial level immediately
    setIsAiSpeaking(true);
    setIsUserSpeaking(false); // Ensure user speaking is false when AI starts speaking
    setAiAudioLevel(0.8);
    setUserAudioLevel(0.8); // Reset user audio level
    setAudioLevel(0.8);

    aiAudioLevelInterval.current = setInterval(() => {
      if (!isAiSpeaking) {
        stopAiAudioVisualization();
        return;
      }

      // Create a more natural speaking pattern for AI
      const now = Date.now();
      const baseLevel = 0.6; // Higher base level
      const randomVariation = Math.random() * 0.3; // Random variation
      const patternVariation = Math.sin(now / 150) * 0.15; // Sinusoidal pattern

      const newLevel = Math.min(
        Math.max(baseLevel + randomVariation + patternVariation, 0.4),
        0.95
      );
      setAiAudioLevel(newLevel);
      setAudioLevel(newLevel); // Keep the main audioLevel in sync

      // Force a re-render by updating the animation timestamp
      animationTimestamp.current = now;
    }, 50); // Much faster updates for more responsive visualization
  };

  // Clean up microphone resources
  const cleanupMicrophone = () => {
    if (microphoneStream.current) {
      microphoneStream.current.getTracks().forEach((track) => track.stop());
      microphoneStream.current = null;
    }

    if (userAudioAnalyser.current) {
      userAudioAnalyser.current = null;
      userAudioDataArray.current = null;
    }

    if (audioContextRef.current) {
      try {
        audioContextRef.current
          .close()
          .catch((err) => console.error("Error closing AudioContext:", err));
      } catch (err) {
        console.error("Error closing AudioContext:", err);
      }
      audioContextRef.current = null;
    }

    // Clean up WebRTC resources
    if (connectionRef.current) {
      connectionRef.current.close();
      connectionRef.current = null;
    }

    if (dataChannelRef.current) {
      dataChannelRef.current.close();
      dataChannelRef.current = null;
    }

    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach((track) => track.stop());
      audioStreamRef.current = null;
    }

    if (audioRecorderRef.current) {
      audioRecorderRef.current = null;
    }

    audioChunksRef.current = [];
  };

  // Toggle voice mode
  const toggleVoiceMode = () => {
        const newVoiceMode = !isVoiceMode
        setIsVoiceMode(newVoiceMode)
    
        // If we're turning on voice mode, automatically start listening
        if (newVoiceMode) {
          // Add a small delay to ensure voice mode UI is fully mounted
          setTimeout(() => {
            handleStartRecording()
          }, 300)
        }
      }

  // Stop listening and process voice input
  const stopListening = () => {
    console.log("Stopping listening");
    handleStopRecording();
  };

  // Handle sending a voice message
  const handleSendVoiceMessage = (text: string) => {
    if (!text.trim() || isLoading || isTyping) return;

    // Don't send if AI was speaking (user was just stopping the AI)
    if (isAiSpeaking) {
      console.log("Not sending transcript because AI was speaking");
      return;
    }

    const userMessage = {
      text: text,
      isUser: true,
      id: `msg-${Date.now()}`,
    };

    console.log("API", userMessage);

    // Make sure we're not updating the input field
    setNewMessage("");

    setMessages((prevMessages) => [...prevMessages, userMessage]);

    // Process the voice message using the same logic as normal text messages
    handleApiSendMessage(text, userMessage);
  };

  // Handle sending a new message
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newMessage.trim() || isLoading || isTyping) return;

    const userMessage = {
      text: newMessage,
      isUser: true,
      id: `msg-${Date.now()}`,
    };

    setMessages((prevMessages) => [...prevMessages, userMessage]);
    setNewMessage("");

    // Process the text message
    handleApiSendMessage(newMessage, userMessage);
  };

  // Common API sending logic for both text and voice messages
  const handleApiSendMessage = async (
    messageText: string,
    userMessage: Message
  ) => {
    setIsLoading(true);
    setIsTyping(true);

    try {
      // First try to send through WebRTC if we're in voice mode
      if (isVoiceMode && dataChannelRef.current?.readyState === "open") {
        const sent = sendTextThroughDataChannel(messageText);
        if (sent) {
          // Add to conversation history
          conversationHistoryRef.current.push({
            role: "user",
            content: messageText,
          });

          setIsLoading(false);
          setIsTyping(false);
          return;
        }
      }

      // Fall back to regular API if WebRTC is not available
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
                      id: `assistant-partial-${userMessage.id}`,
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
            id: `msg-${Date.now()}`,
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
        console.log("Updated chat history with new chat ID:", newChatId);
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

  // New function to handle closing the voice modal
  const closeVoiceModal = () => {
    console.log("Closing voice modal");

    // Prevent multiple clicks by checking if we're already closing
    if (isClosingVoiceMode) return;

    // Set the closing flag to true
    setIsClosingVoiceMode(true);

    // Immediately set isVoiceMode to false to prevent needing a second click
    setIsVoiceMode(false);

    // If we're listening or AI is speaking, we need to stop the session first
    if (isListening || isAiSpeaking) {
      console.log("Stopping active session before closing");

      // Stop the WebRTC connection
      handleStopRecording();

      // If AI is speaking, wait for it to finish
      if (isAiSpeaking && audioElementRef.current) {
        // Let the audio finish playing
        console.log("Waiting for AI to finish speaking");
      } else {
        // No active audio, close immediately
        completeVoiceModeClose();
      }

      // Set a timeout to force close if the call-end event doesn't fire
      setTimeout(() => {
        if (isClosingVoiceMode) {
          console.log("Force closing voice modal after timeout");
          completeVoiceModeClose();
        }
      }, 1000);
    } else {
      // If no active call, close immediately
      completeVoiceModeClose();
    }
  };

  // Function to complete the voice mode closure
  const completeVoiceModeClose = () => {
    console.log("Completing voice modal closure");

    // Reset all voice-related states
    setIsVoiceMode(false);
    setIsClosingVoiceMode(false);
    setIsListening(false);
    setIsProcessing(false);
    setIsAiSpeaking(false);
    setIsUserSpeaking(false);
    setTranscript("");
    setAudioLevel(0);
    setAiAudioLevel(0);
    setUserAudioLevel(0);
    lastActivityTime.current = 0;

    // Clear any audio intervals
    if (audioLevelInterval.current) {
      clearInterval(audioLevelInterval.current);
      audioLevelInterval.current = null;
    }

    if (aiAudioLevelInterval.current) {
      clearInterval(aiAudioLevelInterval.current);
      aiAudioLevelInterval.current = null;
    }

    // Stop animation frame
    if (animationFrameId.current) {
      cancelAnimationFrame(animationFrameId.current);
      animationFrameId.current = null;
    }

    if (waveAnimationFrameId.current) {
      cancelAnimationFrame(waveAnimationFrameId.current);
      waveAnimationFrameId.current = null;
    }

    // Clean up audio resources
    cleanupMicrophone();
  };

  // Reset state when voice mode opens/closes
  useEffect(() => {
    if (isVoiceMode) {
      setTranscript("");
      setApiError(null);
      setIsProcessing(false);
      setAudioLevel(0);
      setAiAudioLevel(0);
      setUserAudioLevel(0);
      setIsAiSpeaking(false);
      setIsUserSpeaking(false);
      setIsClosingVoiceMode(false);
      lastActivityTime.current = 0;
      animationTimestamp.current = Date.now();
    } else {
      // Clean up when voice mode is closed
      stopUserAudioVisualization();
      stopAiAudioVisualization();
      if (waveAnimationFrameId.current) {
        cancelAnimationFrame(waveAnimationFrameId.current);
        waveAnimationFrameId.current = null;
      }
      cleanupMicrophone();
    }
  }, [isVoiceMode]);

  return (
    <main className="flex min-h-[80vh] flex-col items-center px-6 py-0 relative bg-[#faf7f2] overflow-hidden">
      <StatusBar />
      <div className="absolute top-4 right-4 z-10">
        <a
          href={`https://wa.me/+919628888887`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center rounded-full bg-[#d4b978] px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-[#c9ad6e]"
        >
          Contact Sales
        </a>
      </div>

      <div className="w-full max-w-md pt-12 pb-24 flex-1 flex flex-col">
        <h1
          className={`font-normal mb-6 ${
            marcellusSC.className
          } transition-all duration-700 ease-out transform ${
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
                false
                  ? "bg-[#fdf6e3] shadow-[0_2px_8px_rgba(0,0,0,0.06)] max-w-[80%] px-6"
                  : "px-2"
              }`}
              style={{
                textShadow: "0 0.2px 0.3px rgba(0,0,0,0.02)",
              }}
            >
              <div className="prose text-center font-medium text-gray-600 text-lg">
                Feel free to ask me any questions about Paloma The Grandeur.
              </div>
            </div>
          </div>
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

          <div ref={messagesEndRef} />
        </div>

        <form
          onSubmit={handleSendMessage}
          className={`fixed bottom-6 left-6 right-6 max-w-md mx-auto transition-all duration-700 delay-600 ease-out transform ${
            isLoaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
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
              className={`absolute right-1 p-3 rounded-full bg-[#d4b978] text-white flex items-center justify-center shadow-sm transition-all duration-300 hover:bg-[#c9ad6e] ${
                isLoading || isVoiceMode ? "opacity-50 cursor-not-allowed" : ""
              }`}
              disabled={isLoading || isVoiceMode}
            >
              <Send size={20} className="rotate-45" />
            </button>
          </div>
        </form>
      </div>

      {isVoiceMode && (
        <div className="fixed inset-0 bg-[#1a1a1a]/90 flex flex-col items-center justify-center z-50 animate-fadeIn">
          <div className="absolute top-4 right-4 z-20">
            <button
              className="w-10 h-10 rounded-full bg-[#333333]/80 flex items-center justify-center text-white hover:bg-[#333333] transition-colors"
              onClick={closeVoiceModal}
              aria-label="Close voice modal"
            >
              <X size={24} />
            </button>
          </div>

          <div className="relative w-full h-full flex flex-col items-center justify-center">
            {/* API Status Indicator */}
            {apiError && (
              <div className="absolute top-8 left-1/2 transform -translate-x-1/2 bg-red-500/80 text-white px-4 py-2 rounded-full text-sm">
                {apiError}
              </div>
            )}

            {/* Fluid Visualization */}
            <div className="relative w-64 h-64 mb-8 flex items-center justify-center">
              <div className="absolute w-64 h-64 rounded-full bg-[#d4b978]/20 blur-xl"></div>

              {/* Modern voice animation */}
              <div
                className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full bg-gradient-to-b from-white via-[#fdf6e3] to-[#d4b978] flex items-center justify-center overflow-hidden ${
                  !isProcessing && !isListening && !isAiSpeaking
                    ? "cursor-pointer hover:shadow-lg transition-shadow"
                    : ""
                }`}
                style={{ boxShadow: "0 0 30px rgba(212, 185, 120, 0.3)" }}
                onClick={() => {
                  if (!isProcessing && !isListening && !isAiSpeaking) {
                    handleStartRecording();
                  }
                }}
              >
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

                {/* Voice visualization - real-time animation for both AI and user */}
                <div className="flex items-end justify-center space-x-1 h-32 w-44 relative z-10">
                  {Array.from({ length: 11 }).map((_, i) => {
                    // Calculate position factor (center bars taller than edges)
                    const positionFactor = 1 - Math.abs((i - 5) / 5) * 0.7;

                    // Calculate height based on speaking state
                    let height = 3; // Default fixed height of 3px when not speaking

                    if (isAiSpeaking || isUserSpeaking) {
                      // When speaking, create a dynamic wave pattern
                      const currentLevel = isAiSpeaking
                        ? aiAudioLevel
                        : userAudioLevel;

                      // Use a different seed for each bar to create wave effect
                      const now = Date.now();
                      const seed =
                        now / (isAiSpeaking ? 180 : 150) + (i * Math.PI) / 5.5;
                      const waveEffect = Math.sin(seed) * 20; // Increased amplitude

                      // Calculate height with position factor (middle bars higher)
                      height = Math.max(
                        3,
                        5 + waveEffect + currentLevel * 80 * positionFactor
                      );

                      // Update the heights in the ref
                      waveBarHeights.current[i] = height;
                    } else {
                      // Gradually reduce heights when not speaking
                      waveBarHeights.current[i] = Math.max(
                        waveBarHeights.current[i] * 0.9,
                        3
                      );
                      height = waveBarHeights.current[i];
                    }

                    return (
                      <div
                        key={`wave-bar-${i}-${
                          isAiSpeaking ? "ai" : isUserSpeaking ? "user" : "idle"
                        }`}
                        className="w-1.5 bg-[#d4b978] rounded-full transition-height duration-75"
                        style={{
                          height: `${height}px`,
                          opacity: 0.8,
                          transition: "height 75ms ease-out",
                        }}
                      />
                    );
                  })}
                </div>

                {/* Status text inside the circle */}
                <div className="absolute bottom-10 left-0 right-0 text-center">
                  {isAiSpeaking ? (
                    <p
                      className={`${manuale.className} text-[#1a1a1a] font-medium text-sm`}
                    >
                      AI Speaking
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
                  ) : isListening ? (
                    <p
                      className={`${manuale.className} text-[#1a1a1a] font-medium text-sm`}
                    >
                      Listening
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
                  ) : !isProcessing ? (
                    <>
                      {/* <p className={`${manuale.className} text-[#1a1a1a] font-medium text-sm`}>Tap to speak</p> */}
                    </>
                  ) : null}
                </div>
              </div>

              {/* Status Overlay */}
              {isProcessing && (
                <div className="absolute inset-0 flex items-center justify-center z-10">
                  <div className="bg-[#1a1a1a]/50 rounded-full w-full h-full flex items-center justify-center">
                    <div className="text-white text-center">
                      <p className={`${manuale.className} text-sm`}>
                        Loading...
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Hidden audio element for AI speech */}
          <audio id="ai-speech" className="hidden" />
        </div>
      )}
    </main>
  );
}
