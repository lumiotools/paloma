import type React from "react"
import { VOICE_SYSTEM_PROMPT } from "@/lib/systemPrompt"

let currentLanguage = "hindi" // Default language

// Function to start a realtime session with OpenAI using WebRTC
export async function startRealtimeSession(
  connection: RTCPeerConnection,
  dataChannelRef: React.MutableRefObject<RTCDataChannel | null>,
  conversationHistoryRef: React.MutableRefObject<object[]>,
  clientSecret: string,
): Promise<void> {
  try {
    console.log("Starting realtime session with OpenAI...")

    // Set up to play remote audio from the model
    const audioEl = document.createElement("audio")
    audioEl.autoplay = true
    connection.ontrack = (e) => (audioEl.srcObject = e.streams[0])

    // Add local audio track (microphone)
    const ms = await navigator.mediaDevices.getUserMedia({ audio: true })
    const [audioTrack] = ms.getTracks()
    connection.addTrack(audioTrack, ms)

    // Create a data channel for text communication
    const dataChannel = connection.createDataChannel("oai-events", {
      ordered: true,
    })
    dataChannelRef.current = dataChannel

    // Set up data channel event handlers
    setupDataChannel(dataChannel, conversationHistoryRef)

    // Create an offer to start the WebRTC connection
    const offer = await connection.createOffer()
    await connection.setLocalDescription(offer)

    // Wait for ICE gathering to complete
    await waitForIceGatheringComplete(connection)

    // Send the offer to OpenAI's server
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

    dataChannel.onopen = () => {
      console.log("Data channel opened")

      // Set initial voice to Hindi
      const initialVoiceEvent = {
        type: "response.settings.update",
        settings: {
          voice: "hindi", // Replace with actual Hindi-capable voice if available (e.g., "nova" speaking Hindi)
        },
      }
      dataChannel.send(JSON.stringify(initialVoiceEvent))

      const createEvent = {
        type: "response.create",
        response: {},
      }

      dataChannel.send(JSON.stringify(createEvent))
    }

    console.log("Realtime session started successfully")
  } catch (error) {
    console.error("Error starting realtime session:", error)
    throw error
  }
}

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

    connection.getSenders().forEach((sender) => sender.track?.stop())

    if (dataChannelRef.current) {
      dataChannelRef.current.close()
      dataChannelRef.current = null
    }

    const audioEl = document.querySelector("audio")
    if (audioEl) {
      audioEl.pause()
      if (audioEl.srcObject) {
        (audioEl.srcObject as MediaStream)
          .getTracks()
          .forEach((track) => track.stop())
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

function setupDataChannel(
  dataChannel: RTCDataChannel,
  conversationHistoryRef: React.MutableRefObject<object[]>,
): void {
  dataChannel.onclose = () => {
    console.log("Data channel closed")
  }

  dataChannel.onerror = (error) => {
    console.error("Data channel error:", error)
  }

  dataChannel.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data)
      console.log("Received message:", data)

      if (data.type === "response.audio_transcript.done") {
        console.log("AI: ", data.transcript)
        conversationHistoryRef.current.push({
          role: "assistant",
          content: data.transcript,
        })

        const textMessage = {
          type: "text",
          text: data.transcript,
        }

        window.dispatchEvent(new CustomEvent("ai-message", { detail: textMessage }))
      }

      else if (data.type === "conversation.item.input_audio_transcription.completed") {
        console.log("User: ", data.transcript)
        conversationHistoryRef.current.push({
          role: "user",
          content: data.transcript,
        })

        const transcriptMessage = {
          type: "transcript",
          transcript: data.transcript,
        }

        window.dispatchEvent(new CustomEvent("user-transcript", { detail: transcriptMessage }))

        // Detect language
        const language = detectLanguage(data.transcript)

        if (language !== currentLanguage) {
          currentLanguage = language
          const newVoice = chooseVoiceByLanguage(language)
          console.log(`Language switched to ${language}, setting voice to ${newVoice}`)

          const voiceEvent = {
            type: "response.settings.update",
            settings: {
              voice: newVoice,
            },
          }

          dataChannel.send(JSON.stringify(voiceEvent))
        }
      }

      else if (data.type === "error") {
        console.error("Error from OpenAI:", data.error)
        window.dispatchEvent(new CustomEvent("ai-error", { detail: { error: data.error } }))
      }
    } catch (error) {
      console.error("Error parsing message:", error)
    }
  }
}

// Voice by language
function chooseVoiceByLanguage(language: string): string {
  switch (language) {
    case "english":
      return "nova" // or "shimmer"
    case "hindi":
    default:
      return "echo" // or a custom voice with Hindi support
  }
}

// 🔍 Detect if the user is speaking in Hindi or English
function detectLanguage(transcript: string): "english" | "hindi" {
  const englishWordMatch = transcript.match(/[a-zA-Z]/g)
  const hindiWordMatch = transcript.match(/[\u0900-\u097F]/g)

  if (englishWordMatch && (!hindiWordMatch || englishWordMatch.length > hindiWordMatch.length)) {
    return "english"
  }
  return "hindi"
}

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
