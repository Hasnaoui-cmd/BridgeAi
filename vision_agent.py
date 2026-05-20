import os
import json
import base64
from groq import Groq
from llama_parse import LlamaParse
from dotenv import load_dotenv

load_dotenv()
client = Groq(api_key=os.getenv("GROQ_API_KEY"))

# Initialize Llama-Parse for PDFs
# This uses the LLAMA_CLOUD_API_KEY from your .env automatically
pdf_parser = LlamaParse(result_type="markdown", verbose=True)

async def extract_data_from_file(file_bytes: bytes, filename: str):
    """
    Intelligently routes the file to the right engine:
    - Images (.jpg, .png) -> Groq Vision
    - PDFs (.pdf) -> Llama-Parse
    """
    is_pdf = filename.lower().endswith('.pdf')

    if is_pdf:
        print(f"📄 Scaling: Parsing PDF {filename} with Llama-Parse...")
        # 1. Save PDF temporarily for Llama-Parse
        temp_path = f"temp_chat_{filename}"
        with open(temp_path, "wb") as f:
            f.write(file_bytes)
        
        # 2. Use Llama-Parse (The API key is used here)
        llama_docs = pdf_parser.load_data(temp_path)
        markdown_content = "\n\n".join([doc.text for doc in llama_docs])
        os.remove(temp_path)
        
        # 3. Use Llama 4 to turn Markdown into JSON
        prompt = f"Extract invoice data into JSON from this text: {markdown_content}"
        response = client.chat.completions.create(
            model="meta-llama/llama-4-scout-17b-16e-instruct", # Text model is fine for Markdown
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"}
        )
    else:
        print(f"📸 Parsing Image {filename} with Groq Vision...")
        base64_image = base64.b64encode(file_bytes).decode('utf-8')
        prompt = "Extract invoice data into JSON: vendor, items, hs_codes, totals."
        
        # USE VISION MODEL HERE (Llama 4 cannot do this)
        response = client.chat.completions.create(
            model="meta-llama/llama-4-scout-17b-16e-instruct", 
            messages=[{
                "role": "user",
                "content": [
                    {"type": "text", "text": prompt},
                    {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{base64_image}"}}
                ]
            }],
            response_format={"type": "json_object"}
        )

    return json.loads(response.choices[0].message.content)