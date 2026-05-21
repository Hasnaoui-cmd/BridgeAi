import os
import uuid
from dotenv import load_dotenv
from llama_parse import LlamaParse
from langchain_text_splitters import RecursiveCharacterTextSplitter
from rag_agent import db 

load_dotenv()

# Initialize Llama-parse
parser = LlamaParse(
    result_type="markdown",
    num_workers=4
)

# --- REMOVED 'async' ---
def process_pdf_to_vectors(file_path: str, filename: str):
    """
    Parses PDF synchronously. 
    FastAPI will run this in a thread pool to avoid blocking.
    """
    try:
        print(f"📄 AI starting to read (Sync Mode): {filename}...")
        
        # --- USE 'load_data' (Synchronous) ---
        llama_docs = parser.load_data(file_path)
        
        if not llama_docs:
            print("❌ Llama-Parse returned no content.")
            return 0
            
        full_text = ""
        for doc in llama_docs:
            full_text += doc.text + "\n\n"

        # Split into chunks
        text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=1200,
            chunk_overlap=200
        )
        chunks = text_splitter.split_text(full_text)

        if not chunks:
            print("⚠️ No chunks created.")
            return 0

        batch_id = str(uuid.uuid4())
        metadatas = []
        for i in range(len(chunks)):
            metadatas.append({
                "source": filename,      
                "upload_id": batch_id,   
                "chunk_index": i,
                "type": "admin_upload"
            })

        print(f"💾 Saving {len(chunks)} chunks to Supabase...")
        db.add_texts(texts=chunks, metadatas=metadatas)
        
        print(f"✅ Successfully ingested {filename}.")
        return len(chunks)

    except Exception as e:
        print(f"❌ Ingestion Logic Error: {e}")
        return 0