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

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

export async function sendChatMessage(
  request: ChatRequest
): Promise<ChatResponse> {
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

    return await response.json();
  } catch (error) {
    console.error("Error sending chat message:", error);
    // Fallback response for development/demo purposes
    return {
      answer:
        "I'm sorry, I couldn't connect to the knowledge base at the moment. Please try again later.",
      conversation_id: request.conversation_id || "temp-id",
    };
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
