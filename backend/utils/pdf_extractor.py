import io
from PyPDF2 import PdfReader
from typing import Optional

def extract_text_from_pdf(pdf_data: bytes) -> str:
    """Extract text from PDF bytes"""
    try:
        pdf_file = io.BytesIO(pdf_data)
        reader = PdfReader(pdf_file)

        text = ""
        for page in reader.pages:
            text += page.extract_text() + "\n"

        return text.strip()
    except Exception as e:
        print(f"Error extracting PDF text: {e}")
        return ""

def extract_text_from_file(file_data, mime_type: str) -> Optional[str]:
    """Extract text from file based on MIME type"""
    if not file_data:
        return None

    # Convert memoryview to bytes if needed (PostgreSQL returns memoryview for Bytes columns)
    if isinstance(file_data, memoryview):
        file_data = bytes(file_data)

    if mime_type == "application/pdf":
        return extract_text_from_pdf(file_data)
    elif mime_type == "text/plain":
        return file_data.decode('utf-8')
    else:
        return None
