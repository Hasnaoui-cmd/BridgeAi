import os
import json
import base64
from groq import Groq
from dotenv import load_dotenv

load_dotenv()
client = Groq(api_key=os.getenv("GROQ_API_KEY"))

def extract_invoice_data(image_bytes: bytes):
    """
    Takes raw bytes, converts to base64, and calls Groq Vision.
    """
    try:
        # Convert bytes to base64 string
        base64_image = base64.b64encode(image_bytes).decode('utf-8')

        prompt = """
        -First, display a Markdown table titled '📋 Invoice Extraction Summary' 
        showing the items, HS codes, and prices you found. Then, proceed with the audit.
        Extract the following invoice data into a clean JSON object:
        - vendor_name
        - items: list of {description, hs_code, quantity, total_price}
        - total_amount
        - currency
        - country_of_origin
        
        If the HS Code is missing on the invoice, search your internal knowledge for the most likely 6-digit International HS Code for this item and include it in the JSON as 'suggested_hs_code'
        """
        
        response = client.chat.completions.create(
            model="meta-llama/llama-4-scout-17b-16e-instruct",
            messages=[
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt},
                        {
                            "type": "image_url",
                            "image_url": {"url": f"data:image/jpeg;base64,{base64_image}"}
                        }
                    ]
                }
            ],
            response_format={"type": "json_object"}
        )
        return json.loads(response.choices[0].message.content)
    except Exception as e:
        print(f"❌ Vision Agent Error: {e}")
        return {"error": "Failed to extract data"}