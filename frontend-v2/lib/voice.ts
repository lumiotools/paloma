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

    // Log session end event
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

// Helper function to wait for ICE gathering to complete
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

    // Set a timeout in case ICE gathering takes too long
    setTimeout(() => {
      connection.removeEventListener("icegatheringstatechange", checkState)
      console.warn("ICE gathering timed out, continuing with available candidates")
      resolve()
    }, 5000)
  })
}

// Function to log voice events to the database
export async function logVoiceEvent(
  eventType: string,
  transcript?: string,
  audioData?: string,
  chatId?: string | null,
) {
  try {
    // Determine the role based on the event type
    let role: "user" | "assistant" = "assistant"; 
    
    // Set role based on event type
    if (eventType === "user_speech") {
      role = "user";
    } else if (eventType === "ai_speech") {
      role = "assistant";
    }
    // All other event types will use "assistant" as the role
    
    // Create content based on transcript
    let content = eventType;
    if (transcript) {
      content = transcript;
    }
    
    // Create a message for the voice log
    const voiceLogMessage: ChatMessage = {
      role,
      content,
    }

    console.log("Logging voice event:", voiceLogMessage);

    // Create messages array with the single message
    const messages: ChatMessage[] = [voiceLogMessage];

    // Update the chat history with the voice log
    const newChatId = await updateChatHistory(chatId ?? null, messages);

    console.log(
      `Voice event logged: ${eventType}`,
      transcript ? `Transcript: ${transcript.substring(0, 50)}...` : "",
      `ChatId: ${newChatId}`,
    )

    return newChatId;
  } catch (error) {
    console.error("Error logging voice event:", error);
    // Don't throw - logging should not interrupt the main flow
    return chatId;
  }
}

function setupDataChannel(
  dataChannel: RTCDataChannel,
  conversationHistoryRef: React.MutableRefObject<object[]>,
  languageRef: React.MutableRefObject<"hindi" | "english">,
  chatId?: string | null,
): void {
  let hasSentCreateEvent = false;
  let currentChatId = chatId;

  dataChannel.onclose = () => {
    console.log("Data channel closed");
    logVoiceEvent("voice_session_ended", undefined, undefined, currentChatId);
  }

  dataChannel.onerror = (error) => {
    console.error("Data channel error:", error);
  }

  dataChannel.onopen = async () => {
    console.log("Data channel opened");
    // Log session start and store the returned chat ID
    currentChatId = await logVoiceEvent("voice_session_started", undefined, undefined, currentChatId);
  }

  dataChannel.onmessage = async (event) => {
    try {
      const data = JSON.parse(event.data);
      console.log("Received message:", data);

      // Handle the user speech transcript
      if (data.type === "conversation.item.input_audio_transcription.completed") {
        // This event contains user speech transcript
        console.log("User:", data.transcript);

        // Add to conversation history in memory
        conversationHistoryRef.current.push({
          role: "user",
          content: data.transcript,
        });

        // Log user transcript and update chat ID
        currentChatId = await logVoiceEvent("user_speech", data.transcript, undefined, currentChatId);

        // Dispatch custom event for UI
        const transcriptMessage = {
          type: "transcript",
          transcript: data.transcript,
        };

        const customEvent = new CustomEvent("user-transcript", {
          detail: transcriptMessage,
        });
        window.dispatchEvent(customEvent);

        // Detect language from user transcript
        const detectedLang = detectLanguage(data.transcript);
        if (languageRef.current !== detectedLang) {
          languageRef.current = detectedLang;
          console.log("Language changed to:", detectedLang);
        }

        const voice = chooseVoiceFromLanguage(languageRef.current);
        console.log("Setting AI voice to:", voice);

        const voiceEvent = {
          type: "response.settings.update",
          settings: { voice },
        };

        dataChannel.send(JSON.stringify(voiceEvent));

        // Now we send the response.create to start AI generation
        if (!hasSentCreateEvent) {
          hasSentCreateEvent = true;
          const createEvent = {
            type: "response.create",
            response: {},
          };
          dataChannel.send(JSON.stringify(createEvent));
        }
      } 
      // Handle GPT-4o response.audio_transcript.done event
      else if (data.type === "response.audio_transcript.done") {
        // This event contains AI assistant speech transcript
        console.log("AI:", data.transcript);

        // Add to conversation history in memory
        conversationHistoryRef.current.push({
          role: "assistant",
          content: data.transcript,
        });

        // Log AI transcript and update chat ID
        currentChatId = await logVoiceEvent("ai_speech", data.transcript, undefined, currentChatId);

        // Dispatch custom event for UI
        const textMessage = {
          type: "text",
          text: data.transcript,
        };

        const customEvent = new CustomEvent("ai-message", {
          detail: textMessage,
        });
        window.dispatchEvent(customEvent);
      } 
      // Handle GPT-4o's newer response.content_part.done format
      else if (data.type === "response.content_part.done" && data.part && data.part.type === "audio") {
        // This is the newer format for assistant speech transcript
        console.log("AI (new format):", data.part.transcript);
        
        // Add to conversation history in memory
        conversationHistoryRef.current.push({
          role: "assistant",
          content: data.part.transcript,
        });

        // Log AI transcript and update chat ID
        currentChatId = await logVoiceEvent("ai_speech", data.part.transcript, undefined, currentChatId);

        // Dispatch custom event for UI
        const textMessage = {
          type: "text",
          text: data.part.transcript,
        };

        const customEvent = new CustomEvent("ai-message", {
          detail: textMessage,
        });
        window.dispatchEvent(customEvent);
      }
      // Handle errors
      else if (data.type === "error") {
        console.error("Error from OpenAI:", data.error);
        const errorEvent = new CustomEvent("ai-error", {
          detail: { error: data.error },
        });
        window.dispatchEvent(errorEvent);
      }
    } catch (error) {
      console.error("Error parsing message:", error);
    }
  }
}

function detectLanguage(text: string): "hindi" | "english" {
  // Simple language detection logic (can be improved)
  const hindiKeywords = ["नमस्ते", "आप", "क्या", "है", "में"] // Example Hindi keywords
  const hindiCount = hindiKeywords.filter((keyword) => text.includes(keyword)).length

  if (hindiCount > 0) {
    return "hindi"
  } else {
    return "english"
  }
}

function chooseVoiceFromLanguage(language: "hindi" | "english"): string {
  return language === "hindi" ? "hindi-voice" : "english-voice"
}