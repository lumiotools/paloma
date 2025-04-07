import { headers } from "next/headers"
import { NextResponse } from "next/server"
import { VOICE_SYSTEM_PROMPT } from "@/lib/systemPrompt"

export const GET = async () => {
  try {
    const userIP = (await headers()).get("x-forwarded-for")

    // if (!userIP || userIP.split(".").length !== 4) {
    //   throw new Error("User IP not found")
    // }


    const response = await fetch("https://api.openai.com/v1/realtime/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.NEXT_PUBLIC_OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-realtime-preview",
        modalities: ["audio", "text"],
        input_audio_transcription: {
          model: "whisper-1",
          language: "en",
        },
        instructions: VOICE_SYSTEM_PROMPT,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error("OpenAI API response error:", response.status, errorText)
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    const clientSecret = data?.["client_secret"]?.["value"]

    if (!clientSecret) {
      console.error("Failed to get client secret from OpenAI", data)
      throw new Error("Failed to create realtime session")
    }

    return NextResponse.json({
      success: true,
      data: { voiceToken: clientSecret },
    })
  } catch (error) {
    console.error("Error creating voice session:", error)
    return NextResponse.json({
      success: false,
      message: (error as Error).message,
    })
  }
}

