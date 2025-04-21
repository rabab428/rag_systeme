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

def detect_document_title(text: str, max_lines: int = 3) -> str:
    """
    Détection intelligente de titre avec analyse contextuelle avancée.
    Version 3.0 - Améliorations majeures :
    - Meilleure gestion de la casse (majuscules/minuscules)
    - Analyse sémantique basique
    - Détection des motifs typographiques
    - Gestion améliorée des documents structurés
    
    Args:
        text: Texte complet du document
        max_lines: Nombre maximum de lignes pour un titre (1-3)
    Returns:
        Le titre détecté (nettoyé et normalisé)
    """
    # Normalisation du texte
    text = unicodedata.normalize('NFKC', text.strip())
    lines = [line.strip() for line in text.split('\n') if line.strip()]
    if not lines:
        return "Titre non détecté"

    # Configuration des motifs exclus (avec regex)
    excluded_patterns = [
        r"^(\d+[\.\)]?|[\•\-\*►§])\s",  # Numérotation ou puces
        r"(?i)(introduction|abstract|résumé|sommaire|table\sdes\smatières)",
        r"(?i)(chapitre|partie|annexe|appendice|références)",
        r"^[^\w]*$",  # Lignes sans mots
        r"\b(confidentiel|draft|version)\b",
        r".*[\.:;,]$"  # Se termine par ponctuation
    ]

    # Dictionnaire de mots courants à exclure
    common_words = {
        'le', 'la', 'les', 'un', 'une', 'des', 'de', 'du', 'au', 'aux',
        'et', 'ou', 'mais', 'donc', 'or', 'ni', 'car', 'à', 'dans', 'par',
        'pour', 'sur', 'avec', 'sans', 'sous', 'entre', 'vers'
    }

    # Score une ligne candidate
    def evaluate_line(line: str, position: int) -> Tuple[float, str]:
        original_line = line
        line = re.sub(r"\s+", " ", line).strip()
        
        # Vérification des exclusions
        for pattern in excluded_patterns:
            if re.search(pattern, line):
                return (0, "")
        
        words = [w for w in re.findall(r"\w+", line.lower()) if len(w) > 2]
        word_count = len(words)
        
        # Filtre basique
        if word_count < 2 or word_count > 12:
            return (0, "")
        
        # Calcul du score
        score = 0.0
        
        # 1. Caractéristiques textuelles
        unique_words = set(words) - common_words
        word_ratio = len(unique_words) / word_count
        score += min(2.0, word_ratio * 3)  # Bonus pour vocabulaire riche
        
        # 2. Structure typographique
        if re.search(r"[A-Z][a-z]", line):  # Title Case
            score += 1.5
        elif not line.isupper():  # Pas tout en majuscules
            score += 0.5
        
        # 3. Position dans le document
        score += max(0, (10 - position) * 0.4)
        
        # 4. Longueur optimale
        if 4 <= word_count <= 8:
            score += 1.2
        
        # 5. Motifs spéciaux
        if not re.search(r"\d", line):  # Pas de chiffres
            score += 0.8
        
        # 6. Densité lexicale
        long_words = sum(1 for w in words if len(w) > 4)
        if long_words / word_count > 0.6:
            score += 0.7
        
        return (score, original_line)

    # Analyse des groupes de lignes
    best_candidate = ""
    best_score = 0.0
    current_group = []
    current_score = 0.0

    for i, line in enumerate(lines[:20]):  # Analyse les 20 premières lignes
        line_score, clean_line = evaluate_line(line, i)
        
        if line_score > 0:
            current_group.append(clean_line)
            current_score += line_score
            
            # Évalue le groupe actuel
            if 1 <= len(current_group) <= max_lines:
                group_avg = current_score / len(current_group)
                
                # Bonus pour les groupes cohérents
                if len(current_group) > 1:
                    group_avg *= 1.3
                
                if group_avg > best_score:
                    best_score = group_avg
                    best_candidate = "\n".join(current_group)
        else:
            current_group = []
            current_score = 0.0

    # Post-traitement et validation
    if best_score >= 3.0:  # Seuil strict
        # Nettoyage final
        title = re.sub(r"\n+", " ", best_candidate)  # Fusionne les lignes
        title = re.sub(r"\s+", " ", title).strip()
        title = title[:200]  # Troncature sécurité
        
        # Validation sémantique basique
        words = [w for w in re.findall(r"\w+", title.lower()) if len(w) > 3]
        if len(set(words)) >= 2:  # Au moins 2 mots significatifs
            return title

    # Fallback intelligent
    first_lines = lines[:2]
    simple_title = " ".join([l.strip() for l in first_lines if l.strip()])
    simple_title = re.sub(r"\s+", " ", simple_title)[:150].strip()
    
    if len(re.findall(r"\w+", simple_title)) >= 2:  # Au moins 2 mots
        return simple_title
    
    return lines[0][:100] if lines else "Titre non détecté"



@app.post("/upload_file/")
async def upload_file(file: UploadFile = File(...)):
    global VECTOR_DB

    global last_uploaded_filename  #variable globale pour le dernier fichier 

    logger.info(f"Traitement du fichier: {file.filename}")

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
            raise HTTPException(400, "Format non supporté.  Veuillez uploader un PDF, DOCX, TXT ou JSON.")

        if not text.strip():
            raise HTTPException(400, "Fichier vide ou texte non extractible")


        # 3. Détection du titre avec la fonction externe
        title = detect_document_title(text, max_lines=3)
    
        logger.info(f"Titre détecté : {title}")

        # 4. Découpage du texte
        text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=7500,
            chunk_overlap=200,
            separators=["\n\n", "\n• ", "\n- ", "\n* ", "\n"]
        )
        chunks = text_splitter.split_text(text)

        # 5. Stockage MongoDB
        doc_data = {
            "filename": file.filename,
            "title": title,
            "text": text,
            "chunks": chunks,
            "timestamp": datetime.now()
        }
        docs_collection.insert_one(doc_data)


        last_uploaded_filename = file.filename  # ⬅️ On enregistre ici le dernier fichier

        # 6. Création du vecteur store avec nom de collection sécurisé
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

    # 1️⃣ Détection des questions sur le titre
    title_keywords = [
    # Français
    "titre",
    "intitulé",
    "intitulé du document",
    "titre du document",
    "dénomination du document",
    "désignation du document",
    "comment s'appelle ce document",
    "quel est le titre",
    "quel est l’intitulé",
    "quel est le titre du document",
   ]

    is_title_question = any(keyword in question.lower() for keyword in title_keywords)

    try:
        llm = ChatOllama(model="llama3.2:latest")
        retriever = VECTOR_DB.as_retriever()

        # 2️⃣ Prompt spécial pour les titres
        if is_title_question:
            # Récupère le contexte réel (le titre exact)
            if not last_uploaded_filename:
                  raise HTTPException(status_code=400, detail="Aucun fichier uploadé récemment")
            doc = docs_collection.find_one({"filename": last_uploaded_filename}, {"title": 1})

            exact_title = doc.get("title", "Titre non disponible") if doc else "Titre non disponible"
            
            # Formatte le contexte pour le LLM
            context = f"Le texte contient le titre du document : {exact_title}"
            
            template = """
Vous êtes un expert en traitement automatique de documents, spécialisé dans l'extraction précise de titres.

Contexte :
{context}

Question : {question}

Instructions strictes :
- Analysez **uniquement** le contenu fourni dans le contexte.
- Votre objectif est d'extraire **exclusivement le titre principal du document**.
- Ignorez systématiquement :
  - Les noms d’universités, facultés, départements, laboratoires, adresses ou noms d’auteurs.
  - Toute mention secondaire comme les dates, lieux ou signatures.
- Le titre doit représenter **le sujet central ou le thème principal** du document.
- Répondez uniquement par **une phrase complète** sur le titre .
- Si aucun titre clair ne peut être identifié, répondez exactement : “Je ne trouve pas le titre dans le document.”
- Utilisez **la langue de l’utilisateur** pour répondre.
"""


        else:
            # 3️⃣ Prompt normal pour les autres questions
            template = """Répondez à la question en vous basant sur le contexte :
            {context}

            Question : {question}

            Règles :
            - Soyez concis et factuel
            - Si l'information n'est pas dans le contexte, dites-le
            - repondre par la langue de l'utilisateur
            """

        prompt = ChatPromptTemplate.from_template(template)
        
        chain = (
            {"context": retriever if not is_title_question else lambda _: {"context": context}, 
             "question": RunnablePassthrough()}
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
async def list_documents():
    """
    Liste les documents stockés dans MongoDB.
    """
    try:
        documents = list(docs_collection.find({}, {"_id": 0, "filename": 1, "title": 1}))
        return {"documents": documents}
    except Exception as e:
        logger.error(f"Erreur lors de la récupération des documents: {e}")
        raise HTTPException(status_code=500, detail=f"Erreur: {str(e)}")












if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)