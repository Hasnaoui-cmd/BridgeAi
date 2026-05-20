import os
from dotenv import load_dotenv
from llama_parse import LlamaParse
from langchain_text_splitters import RecursiveCharacterTextSplitter
from rag_agent import db 
import uuid

load_dotenv()

# Initialize Llama-parse with AUTO-DETECTION for language
parser = LlamaParse(
    result_type="markdown",
    num_workers=4,
    # Removing hardcoded language allows LlamaParse to detect it per-file
    # You can also pass it as a parameter if you want the admin to choose
)

def process_pdf_to_vectors(file_path: str, filename: str):
    """
    Parses PDF, preserves filename in metadata for future deletion/filtering.
    """
    try:
        print(f"📄 Parsing {filename}...")
        
        # 1. Parse (Llama-Parse returns a list of Document objects)
        llama_docs = parser.load_data(file_path)
        
        # 2. Combine all pages into one text string
        full_text = ""
        for doc in llama_docs:
            full_text += doc.text + "\n\n"

        # 3. Split into chunks
        text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=1200,
            chunk_overlap=200
        )
        chunks = text_splitter.split_text(full_text)

        # 4. CRITICAL: Metadata for future "Delete by Filename" feature
        # We store the exact filename so the Admin can find/delete it later.
        batch_id = str(uuid.uuid4()) # Unique ID for this specific upload session
        
        metadatas = []
        for i in range(len(chunks)):
            metadatas.append({
                "source": filename,      # <--- This is what you'll use to delete
                "upload_id": batch_id,   # <--- Good for auditing
                "chunk_index": i,
                "type": "admin_upload"
            })

        # 5. Add to Supabase
        db.add_texts(texts=chunks, metadatas=metadatas)

        # 3. NOW INTERACT WITH THE DATABASE
        # Because we added 'pool_pre_ping=True' in rag_agent.py,
        # LangChain will automatically reconnect if the connection died during Step 1.
        print(f"💾 Saving {len(chunks)} chunks to Supabase...")
        db.add_texts(texts=chunks, metadatas=metadatas)
        
        print(f"✅ Ingested {filename} ({len(chunks)} chunks).")
        return len(chunks)

    except Exception as e:
        print(f"❌ Error in ingestion: {e}")
        raise e