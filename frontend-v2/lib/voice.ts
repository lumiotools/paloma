import type React from "react"
import { VOICE_SYSTEM_PROMPT } from "@/lib/systemPrompt"

// Function to start a realtime session with OpenAI using WebRTC
export async function startRealtimeSession(
  connection: RTCPeerConnection,
  dataChannelRef: React.MutableRefObject<RTCDataChannel | null>,
  conversationHistoryRef: React.MutableRefObject<object[]>,
  clientSecret: string, // Add client secret as a parameter
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

    // Send the offer to OpenAI's server to establish the connection
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

    // Set the remote description from OpenAI's answer
    await connection.setRemoteDescription({
      type: "answer",
      sdp: sdpAnswer,
    })

    console.log("WebRTC connection established with OpenAI")

    // Send an initial message to start the conversation when data channel opens
    dataChannel.onopen = () => {
      console.log("Data channel opened")
      
      // Fire an event of type conversation.item.create
      const createEvent = {
        type: "response.create",
        response: {
        },
      }
      dataChannel.send(JSON.stringify(createEvent))
    }

    console.log("Realtime session started successfully")
  } catch (error) {
    console.error("Error starting realtime session:", error)
    throw error
  }
}

// Function to stop the realtime session
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

    // Stop media tracks
    connection.getSenders().forEach((sender) => sender.track?.stop())

    // Close the data channel if it exists
    if (dataChannelRef.current) {
      dataChannelRef.current.close()
      dataChannelRef.current = null
    }

    // Stop audio playback and release resources
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

    // Close the connection
    connection.ontrack = null
    connection.onicecandidate = null
    connection.oniceconnectionstatechange = null
    connection.close()

    // // Update the voice trial usage
    // await fetch("/api/voice/update-usage", {
    //   method: "POST",
    //   headers: {
    //     "Content-Type": "application/json",
    //   },
    //   body: JSON.stringify({
    //     secondsUsed: 300 - timeLeft, // Calculate seconds used
    //   }),
    // })

    console.log("Realtime session stopped")
  } catch (error) {
    console.error("Error stopping realtime session:", error)
  }
}

// Helper function to set up the data channel
function setupDataChannel(dataChannel: RTCDataChannel, conversationHistoryRef: React.MutableRefObject<object[]>): void {
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
        // Handle AI response transcript
        console.log("AI: ", data.transcript)
        
        // Store in conversation history
        conversationHistoryRef.current.push({
          role: "assistant",
          content: data.transcript,
        })
        
        // Create a text message format for the UI
        const textMessage = {
          type: "text",
          text: data.transcript,
        }
        
        // Dispatch a custom event for the UI to handle
        const customEvent = new CustomEvent("ai-message", { 
          detail: textMessage 
        })
        window.dispatchEvent(customEvent)
      } 
      else if (data.type === "conversation.item.input_audio_transcription.completed") {
        // Handle user speech transcript
        console.log("User: ", data.transcript)
        
        // Store in conversation history
        conversationHistoryRef.current.push({
          role: "user",
          content: data.transcript,
        })
        
        // Create a transcript message format for the UI
        const transcriptMessage = {
          type: "transcript",
          transcript: data.transcript,
        }
        
        // Dispatch a custom event for the UI to handle
        const customEvent = new CustomEvent("user-transcript", { 
          detail: transcriptMessage 
        })
        window.dispatchEvent(customEvent)
      }
      else if (data.type === "error") {
        console.error("Error from OpenAI:", data.error)
        
        // Dispatch error event
        const errorEvent = new CustomEvent("ai-error", { 
          detail: { error: data.error } 
        })
        window.dispatchEvent(errorEvent)
      }
    } catch (error) {
      console.error("Error parsing message:", error)
    }
  }
}

// Helper function to send a text message through the data channel
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

// Helper function to wait for ICE gathering to complete
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

    // Set a timeout in case ICE gathering takes too long
    setTimeout(() => {
      connection.removeEventListener("icegatheringstatechange", checkState)
      console.warn("ICE gathering timed out, continuing anyway")
      resolve()
    }, 5000)
  })
}

