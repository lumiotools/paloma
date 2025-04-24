import type React from "react"
import { type ChatMessage, updateChatHistory } from "@/lib/api"

// Function to start a realtime session with OpenAI
export async function startRealtimeSession(
  connection: RTCPeerConnection,
  dataChannelRef: React.MutableRefObject<RTCDataChannel | null>,
  conversationHistoryRef: React.MutableRefObject<object[]>,
  clientSecret: string,
  languageRef: React.MutableRefObject<"hindi" | "english">,
  chatId?: string | null,
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

    setupDataChannel(dataChannel, conversationHistoryRef, languageRef, chatId)

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

// Function to stop a realtime session
export async function stopRealtimeSession(
  connection: RTCPeerConnection,
  dataChannelRef: React.MutableRefObject<RTCDataChannel | null>,
  conversationHistoryRef: React.MutableRefObject<object[]>,
  chatId?: string | null,
): Promise<void> {
  try {
    if (!connection || connection.connectionState === "closed") {
      console.warn("RTCPeerConnection is already closed.")
      return
    }

    await logVoiceEvent("voice_session_ended", undefined, undefined, chatId)

    connection.getSenders().forEach((sender) => sender.track?.stop())

    if (dataChannelRef.current) {
      dataChannelRef.current.close()
      dataChannelRef.current = null
    }

    const audioEl = document.querySelector("audio")
    if (audioEl) {
      audioEl.pause()
      if (audioEl.srcObject) {
        ;(audioEl.srcObject as MediaStream).getTracks().forEach((track) => track.stop())
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

function waitForIceGatheringComplete(connection: RTCPeerConnection) {
  return new Promise<void>((resolve) => {
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
      console.warn("ICE gathering timed out, continuing with available candidates")
      resolve()
    }, 5000)
  })
}

// ✅ Function to log voice events to the database
export async function logVoiceEvent(
  eventType: string,
  transcript?: string,
  audioData?: string,
  chatId?: string | null,
) {
  try {
    console.log("TRSN", transcript)
    // if (!transcript) {
    //   console.warn("No transcript provided. Skipping log.")
    //   return chatId
    // }
    

    // Determine if it's from user or assistant
    const role: "user" | "assistant" = eventType === "user_speech" ? "user" : "assistant"

    const voiceLogMessage: ChatMessage = {
      role,
      content: transcript ?? "Test", // ✅ Just the transcript text
    }

    console.log("Logging voice message:", voiceLogMessage)

    const messages: ChatMessage[] = [voiceLogMessage]

    const newChatId = await updateChatHistory(chatId ?? null, messages)

    console.log(`Voice message logged. Role: ${role}, ChatId: ${newChatId}`)

    return newChatId
  } catch (error) {
    console.error("Error logging voice message:", error)
    return chatId
  }
}


// ✅ Setup data channel with chatId handling
function setupDataChannel(
  dataChannel: RTCDataChannel,
  conversationHistoryRef: React.MutableRefObject<object[]>,
  languageRef: React.MutableRefObject<"hindi" | "english">,
  chatId?: string | null,
): void {
  let hasSentCreateEvent = false
  let currentChatId = chatId

  // console.log("Setting up data channel...", conversationHistoryRef);

  dataChannel.onclose = () => {
    console.log("Data channel closed")
    logVoiceEvent("voice_session_ended", undefined, undefined, currentChatId)
  }

  dataChannel.onerror = (error) => {
    console.error("Data channel error:", error)
  }

  dataChannel.onopen = async () => {
    console.log("Data channel opened")
    currentChatId = await logVoiceEvent("voice_session_created", undefined, undefined, currentChatId)
    console.log("ChatId:", currentChatId)
  }

  dataChannel.onmessage = async (event) => {
    try {
      const data = JSON.parse(event.data)
      console.log("Received message :", data)

      if (data.type === "conversation.item.input_audio_transcription.completed") {
        console.log("User:", data.transcript)

        conversationHistoryRef.current.push({ role: "user", content: data.transcript })

        currentChatId = await logVoiceEvent("user_speech", data.transcript, undefined, currentChatId)

        window.dispatchEvent(
          new CustomEvent("user-transcript", {
            detail: { type: "transcript", transcript: data.transcript },
          }),
        )

        const detectedLang = detectLanguage(data.transcript)
        if (languageRef.current !== detectedLang) {
          languageRef.current = detectedLang
          console.log("Language changed to:", detectedLang)
        }

        const voice = chooseVoiceFromLanguage(languageRef.current)
        console.log("Setting AI voice to:", voice)

        dataChannel.send(JSON.stringify({ type: "response.settings.update", settings: { voice } }))

        if (!hasSentCreateEvent) {
          hasSentCreateEvent = true
          dataChannel.send(JSON.stringify({ type: "response.create", response: {} }))
        }
      } else if (data.type === "response.audio_transcript.done") {
        console.log("AI:", data.transcript)

        conversationHistoryRef.current.push({ role: "assistant", content: data.transcript })

        currentChatId = await logVoiceEvent("ai_speech", data.transcript, undefined, currentChatId)

        window.dispatchEvent(
          new CustomEvent("ai-message", {
            detail: { type: "text", text: data.transcript },
          }),
        )
      } else if (data.type === "error") {
        console.error("Error from OpenAI:", data.error)
        window.dispatchEvent(
          new CustomEvent("ai-error", {
            detail: { error: data.error },
          }),
        )
      }
    } catch (error) {
      console.error("Error parsing message:", error)
    }
  }
}

function detectLanguage(text: string): "hindi" | "english" {
  const hindiKeywords = ["नमस्ते", "आप", "क्या"]
  const hindiCount = hindiKeywords.filter((keyword) => text.includes(keyword)).length
  return hindiCount > 0 ? "hindi" : "english"
}

function chooseVoiceFromLanguage(language: "hindi" | "english"): string {
  return language === "hindi" ? "hindi-voice" : "english-voice"
}
