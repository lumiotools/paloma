import type React from "react"
import { VOICE_SYSTEM_PROMPT } from "@/lib/systemPrompt"
import { type ChatMessage, updateChatHistory } from "./api"

// Function to start a realtime session with OpenAI using WebRTC
export async function startRealtimeSession(
  connection: RTCPeerConnection,
  dataChannelRef: React.MutableRefObject<RTCDataChannel | null>,
  conversationHistoryRef: React.MutableRefObject<object[]>,
  clientSecret: string,
  languageRef: React.MutableRefObject<"hindi" | "english">,
): Promise<void> {
  try {
    console.log("Starting realtime session with OpenAI...")

    const audioEl = document.createElement("audio")
    audioEl.autoplay = true
    connection.ontrack = (e) => (audioEl.srcObject = e.streams[0])

    const ms = await navigator.mediaDevices.getUserMedia({ audio: true })
    const [audioTrack] = ms.getTracks()
    connection.addTrack(audioTrack, ms)

    const dataChannel = connection.createDataChannel("oai-events", {
      ordered: true,
    })
    dataChannelRef.current = dataChannel

    setupDataChannel(dataChannel, conversationHistoryRef, languageRef)

    const offer = await connection.createOffer()
    await connection.setLocalDescription(offer)
    await waitForIceGatheringComplete(connection)

    const baseUrl = "https://api.openai.com/v1/realtime"
    const model = "gpt-4o-realtime-preview"

    const sessionResponse = await fetch(`${baseUrl}?model=${model}`, {
      method: "POST",
      body: connection.localDescription?.sdp,
      headers: {
        "Content-Type": "application/sdp",
        Authorization: `Bearer ${clientSecret}`,
      },
    })

    if (!sessionResponse.ok) {
      throw new Error(`Failed to connect to OpenAI: ${sessionResponse.statusText}`)
    }

    const sdpAnswer = await sessionResponse.text()
    await connection.setRemoteDescription({ type: "answer", sdp: sdpAnswer })

    console.log("WebRTC connection established with OpenAI")
  } catch (error) {
    console.error("Error starting realtime session:", error)
    throw error
  }
}

// Stop the realtime session
export async function stopRealtimeSession(
  connection: RTCPeerConnection,
  dataChannelRef: React.MutableRefObject<RTCDataChannel | null>,
  conversationHistoryRef: React.MutableRefObject<object[]>,
): Promise<void> {
  try {
    if (!connection || connection.connectionState === "closed") {
      console.warn("RTCPeerConnection is already closed.")
      return
    }

    logVoiceEvent("voice_session_ended")

    connection.getSenders().forEach((sender) => sender.track?.stop())

    if (dataChannelRef.current) {
      dataChannelRef.current.close()
      dataChannelRef.current = null
    }

    const audioEl = document.querySelector("audio")
    if (audioEl) {
      audioEl.pause()
      if (audioEl.srcObject) {
        (audioEl.srcObject as MediaStream).getTracks().forEach((track) => track.stop())
        audioEl.srcObject = null
      }
    }

    connection.ontrack = null
    connection.onicecandidate = null
    connection.oniceconnectionstatechange = null
    connection.close()

    console.log("Realtime session stopped")
  } catch (error) {
    console.error("Error stopping realtime session:", error)
  }
}

// Set up data channel
function setupDataChannel(
  dataChannel: RTCDataChannel,
  conversationHistoryRef: React.MutableRefObject<object[]>,
  languageRef: React.MutableRefObject<"hindi" | "english">,
): void {
  let hasSentCreateEvent = false

  dataChannel.onclose = () => {
    console.log("Data channel closed")

    logVoiceEvent("user_voice_session_started")
  }

  dataChannel.onerror = (error) => {
    console.error("Data channel error:", error)
  }

  dataChannel.onopen = () => {
    console.log("Data channel opened")
    // Don't send create event immediately. Wait for first user transcript
    logVoiceEvent("user_voice_session_started")
  }

  dataChannel.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data)
      console.log("Received message:", data)

      if (data.type === "conversation.item.input_audio_transcription.completed") {
        console.log("User:", data.transcript)

        conversationHistoryRef.current.push({
          role: "user",
          content: data.transcript,
        })

        const transcriptMessage = {
          type: "transcript",
          transcript: data.transcript,
        }

        const customEvent = new CustomEvent("user-transcript", {
          detail: transcriptMessage,
        })
        window.dispatchEvent(customEvent)

        // Detect language from user transcript
        const detectedLang = detectLanguage(data.transcript)
        if (languageRef.current !== detectedLang) {
          languageRef.current = detectedLang
          console.log("Language changed to:", detectedLang)
        }

        const voice = chooseVoiceFromLanguage(languageRef.current)
        console.log("Setting AI voice to:", voice)

        const voiceEvent = {
          type: "response.settings.update",
          settings: { voice },
        }

        dataChannel.send(JSON.stringify(voiceEvent))

        // Now we send the response.create to start AI generation
        if (!hasSentCreateEvent) {
          hasSentCreateEvent = true
          const createEvent = {
            type: "response.create",
            response: {},
          }
          dataChannel.send(JSON.stringify(createEvent))
        }
      }

      else if (data.type === "response.audio_transcript.done") {
        console.log("AI:", data.transcript)

        conversationHistoryRef.current.push({
          role: "assistant",
          content: data.transcript,
        })

        const textMessage = {
          type: "text",
          text: data.transcript,
        }

        const customEvent = new CustomEvent("ai-message", {
          detail: textMessage,
        })
        window.dispatchEvent(customEvent)
      }

      else if (data.type === "error") {
        console.error("Error from OpenAI:", data.error)
        const errorEvent = new CustomEvent("ai-error", {
          detail: { error: data.error },
        })
        window.dispatchEvent(errorEvent)
      }

    } catch (error) {
      console.error("Error parsing message:", error)
    }
  }
}

// Detect Hindi/English from transcript
function detectLanguage(text: string): "hindi" | "english" {
  const hindiRegex = /[\u0900-\u097F]/
  const englishRegex = /^[a-zA-Z\s.,!?'"0-9]+$/i

  if (hindiRegex.test(text)) return "hindi"
  if (englishRegex.test(text)) return "english"

  const lower = text.toLowerCase()
  if (lower.includes("hello") || lower.includes("how are you")) return "english"
  return "hindi"
}

// Voice mapping
function chooseVoiceFromLanguage(language: "hindi" | "english"): string {
  return language === "hindi" ? "nova" : "shimmer"
}

// Send manual message
export function sendTextMessage(dataChannel: RTCDataChannel, text: string): boolean {
  if (dataChannel.readyState === "open") {
    const message = {
      type: "text",
      text: text,
    }
    dataChannel.send(JSON.stringify(message))
    return true
  } else {
    console.error("Data channel not open, cannot send message")
    return false
  }
}

// ICE gathering wait
function waitForIceGatheringComplete(connection: RTCPeerConnection): Promise<void> {
  return new Promise((resolve) => {
    if (connection.iceGatheringState === "complete") {
      resolve()
      return
    }

    const checkState = () => {
      if (connection.iceGatheringState === "complete") {
        connection.removeEventListener("icegatheringstatechange", checkState)
        resolve()
      }
    }

    connection.addEventListener("icegatheringstatechange", checkState)

    setTimeout(() => {
      connection.removeEventListener("icegatheringstatechange", checkState)
      console.warn("ICE gathering timed out, continuing anyway")
      resolve()
    }, 5000)
  })
}


export async function logVoiceEvent(
  eventType: string,
  transcript?: string,
  audioData?: string,
  chatId?: string | null,
) {
  try {
    // Create a system message for the voice log
    const voiceLogMessage: ChatMessage = {
      role: "assistant", // Using "assistant" as the role since "system" isn't in your ChatMessage type
      content: transcript || `Voice event: ${eventType}`,
    }

    // Get existing chat history or create a new one
    const messages: ChatMessage[] = [voiceLogMessage]

    // Update the chat history with the voice log
    await updateChatHistory(chatId ?? null, messages)

    console.log(`Voice event logged: ${eventType}`, transcript ? `Transcript: ${transcript.substring(0, 50)}...` : "")
  } catch (error) {
    console.error("Error logging voice event:", error)
    // Don't throw - logging should not interrupt the main flow
  }
}