// API service for Paloma Chatbot

type ChatResponse = {
  answer: string;
  sources?: {
    [documentName: string]: {
      page: number;
      relevance: number;
      text: string;
    }[];
  };
  conversation_id: string;
};

type ChatRequest = {
  message: string;
  first_name?: string;
  phone_number?: string;
  conversation_id?: string;
  top_k?: number;
};

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "https://paloma-04fu.onrender.com";
  
  export async function sendChatMessage(
    request: ChatRequest
  ): Promise<ReadableStream<Uint8Array>> {
    try {
      const response = await fetch(`${API_BASE_URL}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(request),
      });
  
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
  
      // Return the stream directly
      return response.body!;
      
    } catch (error) {
      console.error("Error sending chat message:", error);
      // In case of error, return a fallback stream (empty string or similar)
      const encoder = new TextEncoder();
      const fallbackStream = new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode("Error occurred, please try again later."));
          controller.close();
        }
      });
      return fallbackStream;
    }
  }
  
export async function getConversationHistory(conversationId: string) {
  try {
    const response = await fetch(
      `${API_BASE_URL}/conversations/${conversationId}`
    );

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching conversation history:", error);
    return null;
  }
}

export const updateChatHistory = async (
  chatId: null | string,
  messages: ChatMessage[]
) => {
  try {
    const response = await fetch("/api/history", {
      method: "POST",
      body: JSON.stringify({
        id: chatId,
        messages: messages,
      }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.message || "Failed to update chat history");
    }

    return data.data.id
  } catch (error) {
    console.error("Error updating chat history:", error);
    return null;
  }
};
