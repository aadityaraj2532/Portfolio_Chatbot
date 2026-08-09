import json
import os
from dotenv import load_dotenv
from groq import Groq
from pydantic import BaseModel
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pathlib import Path
from pypdf import PdfReader
from typing import Optional

load_dotenv()

client = Groq(
    api_key=os.getenv("GROQ_API_KEY")
)
MODEL = "llama-3.3-70b-versatile"

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class Experience(BaseModel):
    company: Optional[str] = None
    role: Optional[str] = None
    duration: Optional[str] = None
    description: Optional[str] = None
    skills_used: list[str] = []

class Education(BaseModel):
    degree: Optional[str] = None
    institution: Optional[str] = None
    graduation_year: Optional[int] = None
    cgpa: Optional[float] = None


class Project(BaseModel):
    name: str
    description: Optional[str] = None
    technologies: list[str] = []

    
class Resume(BaseModel):
    name: str
    email: str
    phone: Optional[str] = None
    location: Optional[str] = None

    summary: Optional[str] = None

    skills: list[str] = []

    education: list[Education] = []

    experience: list[Experience] = []

    projects: list[Project] = []

    certifications: list[str] = []

    languages: list[str] = []

    total_experience: Optional[float] = None

class ChatRequest(BaseModel):
    question: str
    


def ask_candidate(question: str, resume: Resume):
    system_prompt = f"""
You are an AI assistant representing a job candidate.

Below is everything you know about the candidate.

Candidate Information:
{resume.model_dump_json(indent=2)}

Rules:
1. Answer only using the information provided above.
2. Never hallucinate or invent facts.
3. If the requested information is not available, respond with:
   "I don't have that information in my resume."
4. Keep answers clear, concise, and professional.
5. Answer in the first person, as if you are the candidate.
"""

    response = client.chat.completions.create(
        model=MODEL,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": question},
        ],
        stream=True,
    )

    return response



# Parsing resume

def parse_resume(resume_text):
    resume_schema = Resume.model_json_schema()

    system_prompt = f"""
You are an expert Resume Parser.

Extract structured information from the given resume.

Return ONLY valid JSON matching this schema:

{resume_schema}

Rules:
- Do not return the schema itself.
- Do not return fields such as "properties", "title", or "type".
- Fill the schema with the actual information extracted from the resume.
- If a list field has no information, return [].
- If a string field has no information, return "".
- If a numeric field has no information, return null.
- Do not invent or assume information.
- Return only valid JSON.
"""

    prompt = f"""
Resume:

{resume_text}
"""

    response = client.chat.completions.create(
        model=MODEL,
        messages=[
            {
                "role": "system",
                "content": system_prompt
            },
            {
                "role": "user",
                "content": prompt
            },
        ],
        response_format={"type": "json_object"},
    )

    data = json.loads(response.choices[0].message.content)
    return Resume(**data)



# PDF extraction
def read_pdf(file_path: Path):
    reader = PdfReader(file_path)

    text = ""
    for page in reader.pages:
        page_text = page.extract_text()
        if page_text:
            text += page_text + "\n"

    return text.strip()


@app.get("/")
def home():
    # resume_path = Path(__file__).parent / "my_resume.pdf"
    # resume_text = read_pdf(resume_path)
    # parsed = parse_resume(resume_text)
    return {
        "message": "This is Home Page"
    }
    
    
@app.post("/chat")
def chat(request: ChatRequest):
    resume_path = Path(__file__).parent / "my_resume.pdf"
    resume_text = read_pdf(resume_path)
    parsed = parse_resume(resume_text)
    stream = ask_candidate(request.question, parsed)
    
    def generate():
        for chunk in stream:
            if chunk.choices[0].delta.content:
                yield chunk.choices[0].delta.content
    
    return StreamingResponse(generate(), media_type="text/plain")