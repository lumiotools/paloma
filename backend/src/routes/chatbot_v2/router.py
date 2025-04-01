import os
import openai
from pinecone import Pinecone
from dotenv import load_dotenv
from fastapi import APIRouter, HTTPException, Body, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Dict, Any, Optional, Union
from uuid import uuid4, UUID
from datetime import datetime
import re
import requests
import json

# Load environment variables
load_dotenv()

# Set up credentials
openai_api_key = os.getenv("OPENAI_API_KEY")
pinecone_api_key = os.getenv("PINECONE_API_KEY")
google_sheets_web_url=os.getenv("GOOGLE_SHEETS_WEB_URL")

# Initialize OpenAI client
client = openai.OpenAI(api_key=openai_api_key)

# Initialize Pinecone
pc = Pinecone(api_key=pinecone_api_key)

# Connect to the existing index
index_name = "paloma"  # Paloma index as requested
index = pc.Index(index_name)

# Initialize router
router = APIRouter()

# In-memory storage for chat history
# Structure: {conversation_id: [{"role": "user/assistant", "content": "message", "timestamp": datetime}]}
chat_history = {}

# Define request and response models
class Message(BaseModel):
    role: str
    content: str
    timestamp: Optional[datetime] = None

class ChatSession(BaseModel):
    conversation_id: UUID
    messages: List[Message]

class QueryRequest(BaseModel):
    message: str
    first_name: Optional[str] = None
    phone_number: Optional[str] = None
    conversation_id: Optional[UUID] = None
    top_k: Optional[int] = 10

class PageInfo(BaseModel):
    page: int
    relevance: float
    text: Optional[str] = None

class QueryResponse(BaseModel):
    answer: str
    sources: Dict[str, List[PageInfo]]
    conversation_id: UUID

def log_user_contact(first_name: str, message: str):
    url = google_sheets_web_url  # Replace with your Google Apps Script web app URL
    data = {
        "firstName": first_name,
        "message": message
    }

    response = requests.post(url, data=data)

    if response.status_code == 200:
        print(f"Contact information for {first_name} logged successfully")
    else:
        print("Failed to log contact information")

def get_text_embedding(text: str) -> List[float]:
    """Get OpenAI embedding for text."""
    if not text.strip():
        return []
    
    try:
        response = client.embeddings.create(
            input=text,
            model="text-embedding-3-small"
        )
        return [float(x) for x in response.data[0].embedding]  # Ensure all values are float
    except Exception as e:
        print(f"Error getting text embedding: {e}")
        return []

def query_pinecone(query_text: str, top_k: int = 10) -> List[Dict[str, Any]]:
    """Query Pinecone for similar content based on text query."""
    query_embedding = get_text_embedding(query_text)
    
    if not query_embedding:
        raise HTTPException(status_code=500, detail="Failed to generate embedding for the query text.")
    
    try:
        results = index.query(
            vector=query_embedding,
            top_k=top_k,
            include_metadata=True
        )
        return results.get('matches', [])
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error querying Pinecone: {str(e)}")

def extract_context_from_matches(matches: List[Dict[str, Any]]) -> str:
    """Extract and format context from the search matches."""
    if not matches:
        return "No relevant information found."
    
    context_parts = []
    
    for match in matches:
        metadata = match.get('metadata', {})
        score = match.get('score', 0)
        file_name = metadata.get('filename', 'Unknown file')
        page_num = metadata.get('page', 0) + 1
        content = metadata.get('content', '')
        
        # Format the context part with file name as the primary identifier
        context_part = f"[{file_name} (Page {page_num}, relevance: {score:.2f})]\n{content}\n"
        context_parts.append(context_part)
    
    return "\n".join(context_parts)

def search_for_name_in_conversation(query: str, conversation_history: List[Dict[str, str]] = None):
    system_prompt = """
    You're a marketing assistant for **Paloma The Grandeur**, a luxurious real estate project in Kanpur by **Paloma Realty**. 

    Based on the chat going so far, you need to find out the name of the user, if mentioned by user.
    
    Understand the entire conversation and find out the name of the user, if mentioned by user in the latest message.
    
    Always use the following JSON format to return the name:
    ```json
    {
        "user_name": "string" or null // If name present then return the name, else return null
    }
    ```
"""
   
    # Initialize messages with system prompt
    messages = [{"role": "system", "content": system_prompt}]
    
    # Add conversation history if available (limited to last 10 messages to avoid token limits)
    if conversation_history:
        for msg in conversation_history:
            messages.append({"role": msg["role"], "content": msg["content"]})
    
    # Add current query with context
    messages.append({"role": "user", "content": query})
    
    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini", # You can use "gpt-4o" for better responses
            messages=messages,
            temperature=0.3
        )            
        
        response_content = response.choices[0].message.content.strip()
        # Parse the JSON response
        user_name = json.loads(response_content.split("```json\n")[1].split("```")[0])["user_name"]
        
        return user_name
                    
    except Exception as e:
        return None  # Return None if any error occurs in parsing the response
        raise HTTPException(status_code=500, detail=f"Error generating chat response: {str(e)}")
    
def generate_chat_response(query: str, context: str,  conversation_id: str, user_name: Union[str, None], conversation_history: List[Dict[str, str]] = None):
    """Generate a conversational response using OpenAI's chat model with conversation history."""
    system_prompt = """
    You're a marketing assistant for **Paloma The Grandeur**, a luxurious real estate project in Kanpur by **Paloma Realty**. Your task is to answer all questions in a way that highlights the positive aspects of Paloma The Grandeur. Ensure the responses are informative, engaging, and always showcase the premium nature of the property.

    Provide answers in **Markdown** format for easy readability and to highlight key details effectively. Your responses should always reflect the luxury, exclusivity, and exceptional quality associated with the project.

    General Marketing Guidelines:
    - Always emphasize the unique features of **Paloma The Grandeur**, such as its location, design, amenities, and value proposition.
    - Use engaging, persuasive language that reflects the exclusivity and sophistication of the project.
    - Highlight customer testimonials, awards, and any prestigious recognitions the project has received.
    - Promote the investment potential of the property, focusing on long-term value and quality of life.
    - Provide information about nearby amenities, schools, hospitals, transportation, and other benefits of the location that appeal to potential buyers.
    - Address any concerns with empathy, always framing the response in a way that promotes the brand's commitment to quality and customer satisfaction.

    Always keep the tone friendly, professional, and aligned with the luxury brand identity of **Paloma The Grandeur**.
    
    Follow this style for conversation:
    Start with saying - "Welcome to the Paloma Concierge. Feel free to ask me any questions about Paloma The Grandeur. To begin, what is your name?"
    User then replies with their name.
    
    Then say - "Great meeting you, **[name]**. What would you like to know about Paloma The Grandeur?"
    
    And keep the conversation going on.
"""


    
    # Initialize messages with system prompt
    messages = [{"role": "system", "content": system_prompt}]
    
    # Add conversation history if available (limited to last 10 messages to avoid token limits)
    if conversation_history:
        for msg in conversation_history[-10:]:
            messages.append({"role": msg["role"], "content": msg["content"]})
    
    # Add current query with context
    messages.append({"role": "user", "content": f"Context information is below:\n\n{context}\n\nQuestion: {query}"})
    
    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini", # You can use "gpt-4o" for better responses
            messages=messages,
            temperature=0.3,  # Lower temperature for more factual responses
            max_tokens=1000,
            stream=True
        )            
        conversation_id_response = {"conversation_id": conversation_id}
        yield json.dumps(conversation_id_response) + "\n" 
        
        name_response = {"user_name": user_name} if user_name else {"user_name": None}
        yield json.dumps(name_response) + "\n"  # Send user name as a separate JSON object
        
        fullResponse = ""  # Initialize variable to store complete response
        
        for chunk in response:
            if chunk.choices[0].delta.content:
                data = {"message": chunk.choices[0].delta.content}
                fullResponse += chunk.choices[0].delta.content  # Append to full response
                yield json.dumps(data) + "\n"  # Send each chunk as a separate JSON object
            
        conversation = chat_history.get(conversation_id, [])
        conversation.append(Message(role="assistant", content=fullResponse, timestamp=datetime.now()))
                    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating chat response: {str(e)}")

def format_sources(matches: List[Dict[str, Any]]) -> Dict[str, List[Dict[str, Any]]]:
    """Format sources as per the required output structure.
    Groups sources by filename with array of page numbers, relevance scores, and content text.
    """
    sources = {}
    
    for match in matches:
        metadata = match.get('metadata', {})
        score = match.get('score', 0)
        file_name = metadata.get('filename', 'Unknown file')
        page_num = metadata.get('page', 0) + 1
        content = metadata.get('content', '')  # Get content text
        
        # Create page info dictionary
        page_info = {
            "page": page_num, 
            "relevance": round(score, 9),  # Keep full precision
            "text": content  # Include the text content
        }
        
        # Group by filename
        if file_name in sources:
            sources[file_name].append(page_info)
        else:
            sources[file_name] = [page_info]
    
    return sources

@router.post("/chat")
async def chat_with_documents(request: QueryRequest):
    """API endpoint to chat with document content - handles both initial and follow-up queries."""
    query = request.message
    top_k = request.top_k
    conversation_id = request.conversation_id
    
    # Check if this is a new conversation or continuation
    is_new_conversation = conversation_id is None
    
    # If new conversation, create a new ID and check for contact info
    if is_new_conversation:
        conversation_id = str(uuid4())
        chat_history[conversation_id] = [
            Message(role="user", content="Hi", timestamp=datetime.now()),
            Message(role="assistant", content="Welcome to the Paloma Concierge. Feel free to ask me any questions about Paloma The Grandeur. To begin, what is your name?", timestamp=datetime.now())
        ]
        message=request.message
        
        # Log contact info if provided
        # if request.first_name and request.phone_number and message:
        #     log_user_contact(request.first_name, request.phone_number,message)
    else:
        conversation_id = str(request.conversation_id)
        # For existing conversation, verify the ID exists
        if conversation_id not in chat_history:
            return StreamingResponse(
                iter([json.dumps({
                    "error": "Conversation not found. Please start a new conversation without providing a conversation_id."
                }) + "\n"]), 
                media_type="text/event-stream"
            )
    
    # Get conversation history
    conversation = chat_history[conversation_id]
    
    # Add the current query to history
    current_time = datetime.now()
    conversation.append(Message(role="user", content=query, timestamp=current_time))
    
    # Convert conversation history to format needed by OpenAI
    openai_conversation_format = [
        {"role": msg.role, "content": msg.content} 
        for msg in conversation
    ]
    
    # Count user messages in conversation history
    # user_message_count = sum(1 for msg in conversation if msg.role == "user")
    
    user_name = search_for_name_in_conversation(query, openai_conversation_format)        
    print(f"User name found: {user_name}")
    
    if user_name:
        log_user_contact(user_name, query)
    
    # Query Pinecone for relevant matches
    matches = query_pinecone(query, top_k)
    
    if not matches:
        answer = "I couldn't find any relevant information in the documents to answer your question."
        # Add assistant's response to history
        conversation.append(Message(role="assistant", content=answer, timestamp=datetime.now()))
        return StreamingResponse(
            iter([
                json.dumps({"conversation_id": conversation_id}) + "\n",
                json.dumps({"message": answer}) + "\n"
                ]),
            media_type="text/event-stream"
        )
        return {
            "answer": answer,
            "sources": {},
            "conversation_id": conversation_id
        }
    
    # Extract context from matches
    context = extract_context_from_matches(matches)

    return StreamingResponse(
        generate_chat_response(query, context, conversation_id, user_name, openai_conversation_format), 
        media_type="text/event-stream"
    )
    
    # Add assistant's response to history
    conversation.append(Message(role="assistant", content=response, timestamp=datetime.now()))
    
    # Format sources using the helper function
    sources = format_sources(matches)
    
    return {
        "answer": response,
        "sources": sources,
        "conversation_id": conversation_id
    }

@router.get("/conversations/{conversation_id}", response_model=ChatSession)
async def get_conversation(conversation_id: UUID):
    """Retrieve a conversation by ID."""
    if conversation_id not in chat_history:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    return {
        "conversation_id": conversation_id,
        "messages": chat_history[conversation_id]
    }

@router.get("/conversations", response_model=List[UUID])
async def list_conversations():
    """List all available conversation IDs."""
    return list(chat_history.keys())

@router.delete("/conversations/{conversation_id}")
async def delete_conversation(conversation_id: UUID):
    """Delete a conversation by ID."""
    if conversation_id not in chat_history:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    del chat_history[conversation_id]
    return {"status": "success", "message": f"Conversation {conversation_id} deleted"}