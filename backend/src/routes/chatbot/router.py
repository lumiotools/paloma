import os
import openai
from pinecone import Pinecone
from dotenv import load_dotenv
from fastapi import APIRouter, HTTPException, Body, Depends
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from uuid import uuid4, UUID
from datetime import datetime
import re
import requests

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

def log_user_contact(first_name: str, phone_number: str, message: str):
    url = google_sheets_web_url  # Replace with your Google Apps Script web app URL
    data = {
        "firstName": first_name,
        "phoneNumber": phone_number,
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

def generate_chat_response(query: str, context: str, conversation_history: List[Dict[str, str]] = None) -> str:
    """Generate a conversational response using OpenAI's chat model with conversation history."""
    system_prompt = """
    You're a marketing assistant that answers questions about a luxurious real estate project in Kanpur called Paloma The Grandeur by Paloma Realty. Answer questions in a manner that puts Paloma is a positive light always.


    When responding to inquiries:
    1. Be warm, professional and courteous - you represent a luxury real estate brand
    2. Provide detailed and accurate information about Paloma Grandeur based ONLY on the context provided
    3. Highlight the premium features, amenities, and unique selling points of the property when relevant
    4. If asked about pricing, payment plans, or availability that's not in the context, politely offer to connect them with a sales representative
    5. If you don't have specific information in the context, acknowledge this and offer to have someone follow up
    6. Use positive, aspirational language that conveys the luxury lifestyle of Paloma Grandeur
    7. End your responses with a question or offer for further assistance when appropriate

    Remember that clients are making significant life investments, so be informative, trustworthy, and focus on creating a positive impression of Paloma Grandeur and its features.
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
            max_tokens=1000
        )
        
        return response.choices[0].message.content
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

@router.post("/chat", response_model=QueryResponse)
async def chat_with_documents(request: QueryRequest):
    """API endpoint to chat with document content - handles both initial and follow-up queries."""
    query = request.message
    top_k = request.top_k
    conversation_id = request.conversation_id
    
    # Check if this is a new conversation or continuation
    is_new_conversation = conversation_id is None
    
    # If new conversation, create a new ID and check for contact info
    if is_new_conversation:
        conversation_id = uuid4()
        chat_history[conversation_id] = []
        message=request.message
        
        # Log contact info if provided
        if request.first_name and request.phone_number and message:
            log_user_contact(request.first_name, request.phone_number,message)
    else:
        # For existing conversation, verify the ID exists
        if conversation_id not in chat_history:
            raise HTTPException(
                status_code=404,
                detail="Conversation not found. Please start a new conversation without providing a conversation_id."
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
    
    # Query Pinecone for relevant matches
    matches = query_pinecone(query, top_k)
    
    if not matches:
        answer = "I couldn't find any relevant information in the documents to answer your question."
        # Add assistant's response to history
        conversation.append(Message(role="assistant", content=answer, timestamp=datetime.now()))
        return {
            "answer": answer,
            "sources": {},
            "conversation_id": conversation_id
        }
    
    # Extract context from matches
    context = extract_context_from_matches(matches)
    
    # Generate response using OpenAI with conversation history
    response = generate_chat_response(query, context, openai_conversation_format)
    
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