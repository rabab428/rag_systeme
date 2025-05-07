import os
import re
from fastapi import FastAPI, File, UploadFile, HTTPException
import shutil
import tempfile
import logging
import json
import docx
import pymongo
from langchain_community.document_loaders import UnstructuredPDFLoader
from langchain_ollama import OllamaEmbeddings
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import Chroma
from langchain.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_ollama import ChatOllama
from langchain_core.runnables import RunnablePassthrough
from langchain.retrievers.multi_query import MultiQueryRetriever
import nltk
nltk.download('averaged_perceptron_tagger')
from datetime import datetime  
import traceback
from bson.binary import Binary  
import base64


# Logger
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialisation de FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# Pour autoriser le frontend local (modifie selon ton port/domaine)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # frontend origin(s)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Connexion à MongoDB
mongo_client = pymongo.MongoClient("mongodb://localhost:27017/")
db = mongo_client["rago_db"]
docs_collection = db["documents"]


# Variable globale pour garder le nom du dernier fichier
last_uploaded_filename = None

# Répertoire pour la base de vecteurs
PERSIST_DIRECTORY = os.path.join("data", "vectors")
VECTOR_DB = None



def sanitize_collection_name(filename: str) -> str:
    """Convertit un nom de fichier en un nom de collection valide pour ChromaDB"""
    # Supprime l'extension du fichier
    name = os.path.splitext(filename)[0]
    # Remplace les caractères non autorisés
    name = re.sub(r'[^a-zA-Z0-9_-]', '_', name)
    # Supprime les underscores multiples
    name = re.sub(r'_{2,}', '_', name)
    # Tronque à 63 caractères (limite ChromaDB)
    name = name[:63]
    # S'assure que le nom commence et finit par un caractère valide
    name = name.strip('_').strip('-')
    # Ajoute le préfixe et retourne
    return f"doc_{name}" if name else "doc_default"


def extract_text_from_docx(file_path: str) -> str:
    """Extrait le texte d'un fichier DOCX."""
    doc = docx.Document(file_path)
    return "\n".join([p.text for p in doc.paragraphs])

def extract_text_from_txt(file_path: str) -> str:
    """Extrait le texte d'un fichier TXT."""
    with open(file_path, "r", encoding="utf-8") as f:
        return f.read()

def extract_text_from_json(file_path: str) -> str:
    """Extrait le texte d'un fichier JSON."""
    with open(file_path, "r", encoding="utf-8") as f:
        json_data = json.load(f)
        return json.dumps(json_data, indent=2, ensure_ascii=False)



import re
from typing import List, Tuple
import unicodedata

def detect_document_title(text: str, max_lines: int = 5) -> str:
    import re
    import unicodedata
    from typing import Tuple

    text = unicodedata.normalize('NFKC', text.strip())
    lines = [line.strip() for line in text.split('\n') if line.strip()]
    if not lines:
        return "Titre non détecté"

    excluded_patterns = [
        r"^(\d+[\.\)]?|[\•\-\*►§])\s",
        r"(?i)(introduction|abstract|résumé|sommaire|table\sdes\smatières)",
        r"(?i)(chapitre|partie|annexe|appendice|références)",
        r"^[^\w]*$",
        r"\b(confidentiel|draft|version)\b",
        r".*[\.:;,]$"
    ]

    common_words = {
        'le', 'la', 'les', 'un', 'une', 'des', 'de', 'du', 'au', 'aux',
        'et', 'ou', 'mais', 'donc', 'or', 'ni', 'car', 'à', 'dans', 'par',
        'pour', 'sur', 'avec', 'sans', 'sous', 'entre', 'vers'
    }

    def evaluate_line(line: str, position: int) -> Tuple[float, str]:
        original_line = line
        line = re.sub(r"\s+", " ", line).strip()
        for pattern in excluded_patterns:
            if re.search(pattern, line):
                return (0, "")
        words = [w for w in re.findall(r"\w+", line.lower()) if len(w) > 2]
        word_count = len(words)
        if word_count < 2 or word_count > 20:  # élargir les titres plus longs
            return (0, "")

        score = 0.0
        unique_words = set(words) - common_words
        word_ratio = len(unique_words) / word_count
        score += min(2.0, word_ratio * 3)
        if re.search(r"[A-Z][a-z]", line):
            score += 1.5
        elif not line.isupper():
            score += 0.5
        score += max(0, (15 - position) * 0.4)  # analyser plus loin
        if 4 <= word_count <= 15:  # élargir l'intervalle
            score += 1.2
        if not re.search(r"\d", line):
            score += 0.8
        long_words = sum(1 for w in words if len(w) > 4)
        if long_words / word_count > 0.6:
            score += 0.7
        return (score, original_line)

    best_candidate = ""
    best_score = 0.0
    current_group = []
    current_score = 0.0

    for i, line in enumerate(lines[:40]):  # au lieu de 20, on analyse les 40 premières lignes
        line_score, clean_line = evaluate_line(line, i)
        if line_score > 0:
            current_group.append(clean_line)
            current_score += line_score
            if 1 <= len(current_group) <= max_lines:
                group_avg = current_score / len(current_group)
                if len(current_group) > 1:
                    group_avg *= 1.5  # bonus plus fort pour les groupes
                if group_avg > best_score:
                    best_score = group_avg
                    best_candidate = "\n".join(current_group)
        else:
            current_group = []
            current_score = 0.0

    if best_score >= 3.0:
        title = re.sub(r"\n+", " ", best_candidate)
        title = re.sub(r"\s+", " ", title).strip()
        title = title[:300]  # tronque plus long
        words = [w for w in re.findall(r"\w+", title.lower()) if len(w) > 3]
        if len(set(words)) >= 2:
            return title

    first_lines = lines[:5]  # regarde les 5 premières lignes pour fallback
    simple_title = " ".join([l.strip() for l in first_lines if l.strip()])
    simple_title = re.sub(r"\s+", " ", simple_title)[:200].strip()
    if len(re.findall(r"\w+", simple_title)) >= 2:
        return simple_title

    return lines[0][:150] if lines else "Titre non détecté"




from fastapi import Form  # ⬅️ Nécessaire pour récupérer user_id via POST

from bson.binary import Binary  # ✅ à importer en haut de ton fichier

@app.post("/upload_file/")
async def upload_file(
    file: UploadFile = File(...),
    user_id: str = Form(...)  # ⬅️ On récupère user_id depuis le frontend
):
    global VECTOR_DB
    global last_uploaded_filename

    logger.info(f"Traitement du fichier: {file.filename} pour user_id: {user_id}")

    try:
        # 1. Sauvegarde temporaire
        temp_dir = tempfile.mkdtemp()
        file_path = os.path.join(temp_dir, file.filename)
        
        with open(file_path, "wb") as f:
            shutil.copyfileobj(file.file, f)

        # 2. Extraction du texte brut
        text = ""
        if file.filename.endswith(".pdf"):
            loader = UnstructuredPDFLoader(file_path)
            text = "\n".join([doc.page_content for doc in loader.load()])
        elif file.filename.endswith(".docx"):
            text = extract_text_from_docx(file_path)
        elif file.filename.endswith((".txt", ".md")):
            text = extract_text_from_txt(file_path)
        elif file.filename.endswith(".json"):
            text = extract_text_from_json(file_path)
        else:
            raise HTTPException(400, "Format non supporté. Veuillez uploader un PDF, DOCX, TXT ou JSON.")

        if not text.strip():
            raise HTTPException(400, "Fichier vide ou texte non extractible")

        # 3. Détection du titre
        title = detect_document_title(text, max_lines=3)
        logger.info(f"Titre détecté : {title}")

        # 4. Découpage du texte
        text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=7500,
            chunk_overlap=200,
            separators=["\n\n", "\n• ", "\n- ", "\n* ", "\n"]
        )
        chunks = text_splitter.split_text(text)

        # ✅ 5. Lecture du fichier binaire
        with open(file_path, "rb") as f:
            file_binary = Binary(f.read())  # 👈 fichier encodé en binaire

        # ✅ 6. Stockage MongoDB avec fichier binaire
        doc_data = {
            "user_id": user_id,
            "filename": file.filename,
            "title": title,
            "text": text,
            "chunks": chunks,
            "file_data": file_binary,  # 👈 fichier stocké en binaire
            "timestamp": datetime.now()
        }
        docs_collection.insert_one(doc_data)

        last_uploaded_filename = file.filename

        # 7. Création du vecteur store
        embeddings = OllamaEmbeddings(model="yxchia/multilingual-e5-base")
        collection_name = sanitize_collection_name(file.filename)
        
        VECTOR_DB = Chroma.from_texts(
            texts=chunks,
            embedding=embeddings,
            persist_directory=PERSIST_DIRECTORY,
            collection_name=collection_name
        )

        shutil.rmtree(temp_dir)
        return {
            "status": "success",
            "filename": file.filename,
            "title": title,
            "chunks": len(chunks),
            "collection_name": collection_name
        }

    except Exception as e:
        logger.error(f"Erreur: {traceback.format_exc()}")
        raise HTTPException(500, f"Erreur de traitement: {str(e)}")

 
from pydantic import BaseModel

class QuestionRequest(BaseModel):
    question: str

@app.post("/ask_question/")
async def ask_question(data: QuestionRequest):
    question = data.question

    global VECTOR_DB
    if VECTOR_DB is None:
        raise HTTPException(status_code=400, detail="Aucun document chargé.")

    
    

    try:
        llm = ChatOllama(model="qwen3:0.6b")
        retriever = VECTOR_DB.as_retriever()


            # Récupère le contexte réel (le titre exact)
        if not last_uploaded_filename:
              raise HTTPException(status_code=400, detail="Aucun fichier uploadé récemment")
        doc = docs_collection.find_one({"filename": last_uploaded_filename}, {"title": 1})

        contient_title = doc.get("title", "Titre non disponible") if doc else "Titre non disponible"
            
            
        template = """Répondez à la question en vous basant uniquement sur le contexte ci-dessous :

{context}

Question : {question}

Règles :
- Soyez concis et factuel.
- Si l’information n’est pas présente dans le contexte, dites-le clairement.
- Cas particulier : si la question demande uniquement le titre principal, extrayez **uniquement** le titre à partir de cette partie du contexte qui le contient : {contient_title}, **sans ajouter d’autres informations** (pas d’université, pas de date, pas d’auteur, etc.)."""



        prompt = ChatPromptTemplate.from_template(template)
        
        chain = (
            {"context": retriever,
             "question": RunnablePassthrough(),
             "contient_title": lambda _: contient_title
             }
            | prompt
            | llm
            | StrOutputParser()
        )

        response = chain.invoke(question)
        return {"question": question, "response": response}

    except Exception as e:
        logger.error(f"Erreur : {str(e)}")
        raise HTTPException(status_code=500, detail="Erreur interne.")












@app.get("/documents/")
async def list_documents(user_id: str):
    """
    Liste les documents d'un utilisateur spécifique avec les champs filename, file_data et timestamp.
    """
    try:
        # Récupère les documents filtrés par user_id
        documents_cursor = docs_collection.find(
            {"user_id": user_id},
            {"_id": 0, "filename": 1, "file_data": 1, "timestamp": 1}
        )

        documents = []
        for doc in documents_cursor:
            # Encodage en base64 pour rendre les données binaires lisibles (JSON ne supporte pas le binaire brut)
            file_data_base64 = base64.b64encode(doc["file_data"]).decode("utf-8")
            documents.append({
                "filename": doc["filename"],
                "file_data": file_data_base64,
                "timestamp": doc["timestamp"].isoformat() if doc["timestamp"] else None
            })

        if not documents:
            raise HTTPException(status_code=404, detail="Aucun document trouvé pour cet utilisateur.")

        return {"documents": documents}

    except Exception as e:
        logger.error(f"Erreur lors de la récupération des documents: {e}")
        raise HTTPException(status_code=500, detail=f"Erreur: {str(e)}")









if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)