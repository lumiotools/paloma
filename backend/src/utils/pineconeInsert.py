import os
import fitz  # PyMuPDF
import openai
from pinecone import Pinecone, ServerlessSpec
from dotenv import load_dotenv
import time
from pathlib import Path

load_dotenv()

# Set up credentials
openai.api_key = os.getenv("OPENAI_API_KEY")
pinecone_api_key = os.getenv("PINECONE_API_KEY")
pinecone_environment = os.getenv("PINECONE_ENVIRONMENT")

# Initialize Pinecone
pc = Pinecone(api_key=pinecone_api_key)

# Create or connect to an index
index_name = "paloma"
dimension = 1024  # OpenAI text embeddings dimension

# Check if the index already exists
existing_indexes = [index.name for index in pc.list_indexes()]
if index_name not in existing_indexes:
    # Create the index with ServerlessSpec
    pc.create_index(
        name=index_name,
        dimension=dimension,
        metric="cosine",
        spec=ServerlessSpec(
            cloud="aws",
            region="us-east-1"  # Use your preferred region
        )
    )

# Connect to the index
index = pc.Index(index_name)

def extract_text_from_pdf(pdf_path):
    """Extract text from a PDF file, page by page."""
    pages = []
    try:
        doc = fitz.open(pdf_path)
        for page_num in range(len(doc)):
            page = doc.load_page(page_num)
            text = page.get_text()
            if text.strip():  # Only add non-empty pages
                pages.append(text)
            else:
                print(f"Page {page_num} is empty or contains only images")
        return pages
    except Exception as e:
        print(f"Error extracting text from PDF: {e}")
        return []

def get_text_embedding(text):
    """Get OpenAI embedding for text."""
    if not text or not text.strip():
        return None
    
    try:
        response = openai.embeddings.create(
            input=text,
            model="text-embedding-3-small"
        )
        return response.data[0].embedding
    except Exception as e:
        print(f"Error getting text embedding: {e}")
        return None

def store_in_pinecone(filename, pages):
    """Store the text embeddings in Pinecone."""
    # Prepare the data for Pinecone
    vectors_to_upsert = []
    
    for page_num, page_content in enumerate(pages):
        # Skip empty pages
        if not page_content or not page_content.strip():
            print(f"Skipping empty page {page_num}")
            continue
            
        embedding = get_text_embedding(page_content)
        if embedding:
            print(f"Got embedding for page {page_num}")
            
            # Ensure all embedding values are float type
            text_embedding = [float(x) for x in embedding]
            vectors_to_upsert.append({
                "id": f"{filename}_page_{page_num}_text",
                "values": text_embedding,
                "metadata": {
                    "type": "text",
                    "page": page_num,
                    "filename": filename,
                    "content": page_content,
                }
            })
        else:
            print(f"Failed to get embedding for page {page_num}")
    
    # Upsert vectors in batches to avoid hitting limits
    batch_size = 100
    for i in range(0, len(vectors_to_upsert), batch_size):
        batch = vectors_to_upsert[i:i+batch_size]
        if batch:
            try:
                index.upsert(vectors=batch)
                print(f"Upserted batch of {len(batch)} vectors")
                # Small delay to avoid rate limits
                time.sleep(0.5)
            except Exception as e:
                print(f"Error upserting batch to Pinecone: {e}")

def process_pdf(pdf_path):
    """Process a PDF file and upsert its content to Pinecone."""
    # Extract the filename without extension
    filename = Path(pdf_path).stem
    
    # Extract text from PDF
    print(f"Extracting text from {filename}")
    pages = extract_text_from_pdf(pdf_path)
    
    if pages:
        print(f"Extracted {len(pages)} pages from {filename}")
        # Store in Pinecone
        store_in_pinecone(filename, pages)
        print(f"Successfully processed {filename}")
    else:
        print(f"No content extracted from {filename}")

def main():
    # PDF path will be added directly in the main function
    pdf_path = "Paloma Marketing Facts.pdf"  # Replace this with your PDF file path
    
    if os.path.exists(pdf_path) and pdf_path.lower().endswith('.pdf'):
        process_pdf(pdf_path)
    else:
        print("Invalid PDF file path. Please check the file and try again.")

if __name__ == "__main__":
    main()