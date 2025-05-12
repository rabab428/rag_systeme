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
from fastapi import FastAPI, File, UploadFile, HTTPException, Request, Form
import nltk
nltk.download('averaged_perceptron_tagger')
from datetime import datetime  
import traceback
from bson.binary import Binary  
import base64
import numpy as np
from langdetect import detect
from pydantic import BaseModel
from typing import Dict, List, Optional


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


# Répertoire pour la base de vecteurs
PERSIST_DIRECTORY = os.path.join("data", "vectors")

# Dictionnaire pour stocker les bases de vecteurs par fichier
VECTOR_DBS: Dict[str, Chroma] = {}


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


@app.post("/upload_file/")
async def upload_file(
    file: UploadFile = File(...),
    user_id: str = Form(...)
):
    global VECTOR_DBS

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

        # 5. Lecture du fichier binaire
        with open(file_path, "rb") as f:
            file_binary = Binary(f.read())

        # 6. Stockage MongoDB avec fichier binaire
        doc_data = {
            "user_id": user_id,
            "filename": file.filename,
            "title": title,
            "text": text,
            "chunks": chunks,
            "file_data": file_binary,
            "timestamp": datetime.now()
        }
        
        # Vérifier si le document existe déjà et le remplacer si c'est le cas
        existing_doc = docs_collection.find_one({"user_id": user_id, "filename": file.filename})
        if existing_doc:
            docs_collection.replace_one({"_id": existing_doc["_id"]}, doc_data)
            logger.info(f"Document existant remplacé: {file.filename}")
        else:
            docs_collection.insert_one(doc_data)
            logger.info(f"Nouveau document inséré: {file.filename}")

        # 7. Création du vecteur store
        embeddings = OllamaEmbeddings(model="yxchia/multilingual-e5-base")
        collection_name = sanitize_collection_name(file.filename)
        
        # Créer ou remplacer la base de vecteurs pour ce fichier
        VECTOR_DBS[file.filename] = Chroma.from_texts(
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


class QuestionRequest(BaseModel):
    question: str
    user_id: Optional[str] = None


@app.post("/ask_question/")
async def ask_question(data: QuestionRequest):
    question = data.question
    user_id = data.user_id
    lang = detect(question)
    logger.info(f"Langue détectée de la question: {lang}")

    # Vérifier si nous avons des bases de vecteurs disponibles
    if not VECTOR_DBS:
        # Essayer de charger les bases de vecteurs depuis la base de données
        try:
            await load_vector_dbs(user_id)
        except Exception as e:
            logger.error(f"Erreur lors du chargement des bases de vecteurs: {str(e)}")
            raise HTTPException(status_code=400, detail="Aucun document chargé. Veuillez d'abord télécharger des documents.")

    if not VECTOR_DBS:
        raise HTTPException(status_code=400, detail="Aucun document disponible pour la recherche.")

    try:
        llm = ChatOllama(model="llama3.2:latest")
        
        # Récupérer les documents pertinents de tous les fichiers disponibles
        all_retrieved_docs = []
        all_context_with_scores = []
        
        # Filtrer les bases de vecteurs par user_id si fourni
        available_dbs = {}
        if user_id:
            # Récupérer les fichiers de l'utilisateur
            user_files = list(docs_collection.find({"user_id": user_id}, {"filename": 1}))
            user_filenames = [file["filename"] for file in user_files]
            
            # Filtrer les bases de vecteurs disponibles
            for filename, vector_db in VECTOR_DBS.items():
                if filename in user_filenames:
                    available_dbs[filename] = vector_db
        else:
            available_dbs = VECTOR_DBS
        
        if not available_dbs:
            raise HTTPException(status_code=400, detail="Aucun document disponible pour cet utilisateur.")
        
        # Récupérer les documents pertinents de chaque fichier
        embeddings = OllamaEmbeddings(model="yxchia/multilingual-e5-base")
        question_embedding = embeddings.embed_query(question)
        
        for filename, vector_db in available_dbs.items():
            retriever = vector_db.as_retriever(search_kwargs={"k": 2})  # 2 extraits par fichier
            
            try:
                # Récupérer les documents pertinents
                retrieved_docs = retriever.get_relevant_documents(question)
                
                # Ajouter les documents avec leurs scores et le nom du fichier source
                for doc in retrieved_docs:
                    doc_embedding = embeddings.embed_documents([doc.page_content])[0]
                    
                    # Calcul de similarité cosinus
                    similarity = np.dot(question_embedding, doc_embedding) / (
                        np.linalg.norm(question_embedding) * np.linalg.norm(doc_embedding)
                    )
                    
                    # Normaliser le score entre 0 et 100
                    score = int(similarity * 100)
                    
                    all_context_with_scores.append({
                        "content": doc.page_content,
                        "score": score,
                        "source": filename  # Ajouter la source du document
                    })
                    
                    all_retrieved_docs.append(doc)
            except Exception as e:
                logger.error(f"Erreur lors de la récupération des documents pour {filename}: {str(e)}")
                continue
        
        # Vérifier si nous avons trouvé des documents pertinents
        if not all_context_with_scores:
            return {
                "question": question,
                "response": "Je n'ai pas trouvé d'informations pertinentes dans vos documents pour répondre à cette question.",
                "context": []
            }
        
        # Trier tous les documents par score de pertinence
        all_context_with_scores.sort(key=lambda x: x["score"], reverse=True)
        
        # Limiter à 5 documents les plus pertinents tous fichiers confondus
        top_context = all_context_with_scores[:5]
        
        # Récupérer les titres des documents utilisés dans le contexte
        used_filenames = set(item["source"] for item in top_context)
        titles = []
        
        for filename in used_filenames:
            doc = docs_collection.find_one({"filename": filename}, {"title": 1})
            if doc and "title" in doc:
                titles.append(f"{doc['title']} (fichier: {filename})")
            else:
                titles.append(f"Document sans titre (fichier: {filename})")
        
        # Utiliser tous les titres ou un message par défaut
        contient_title = " | ".join(titles) if titles else "Titre non disponible"
        logger.info(f"Documents utilisés pour la réponse: {contient_title}")
            
        if lang=="en" : 
           template = """Answer the question based solely on the context below:

          {context}
         - Special case: if the question asks only for the main title, extract **only** the title from this part of the context that contains it: {contient_title}, **without adding any other information** (no university, no date, no author, etc.).

         Question: {question}

         Rules:
         - answer in English.
         - Be concise and factual.
         - If the information is not present in the context, state this clearly.
          """
        else :
           template = """Répondez à la question en vous basant uniquement sur le contexte ci-dessous :

           {context}
           - Cas particulier : si la question demande uniquement le titre principal, extrayez **uniquement** le titre à partir de cette partie du contexte qui le contient : {contient_title}, **sans ajouter d'autres informations** (pas d'université, pas de date, pas d'auteur, etc.).

           Question : {question}

           Règles :
          - Réponds en français.
          - Soyez concis et factuel.
          - Si l'information n'est pas présente dans le contexte, dites-le clairement.
          """

        prompt = ChatPromptTemplate.from_template(template)
        
        # Utiliser les documents les plus pertinents pour générer la réponse
        context_text = "\n\n".join([doc["content"] for doc in top_context])
        
        # Construire la chaîne correctement
        chain = prompt | llm | StrOutputParser()
        
        # Passer les variables lors de l'invocation
        response = chain.invoke({
            "context": context_text,
            "question": question,
            "contient_title": contient_title
        })

        return {
            "question": question, 
            "response": response,
            "context": top_context  # Contexte avec scores et sources
        }

    except Exception as e:
        logger.error(f"Erreur : {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erreur interne: {str(e)}")


async def load_vector_dbs(user_id: Optional[str] = None):
    """Charge les bases de vecteurs pour tous les documents ou pour un utilisateur spécifique"""
    global VECTOR_DBS
    
    # Construire la requête
    query = {}
    if user_id:
        query["user_id"] = user_id
    
    # Récupérer les documents
    documents = list(docs_collection.find(query, {"filename": 1, "chunks": 1, "user_id": 1}))
    
    if not documents:
        logger.warning(f"Aucun document trouvé pour la requête: {query}")
        return
    
    # Charger les bases de vecteurs
    embeddings = OllamaEmbeddings(model="yxchia/multilingual-e5-base")
    
    for doc in documents:
        filename = doc["filename"]
        chunks = doc.get("chunks", [])
        
        if not chunks:
            logger.warning(f"Aucun chunk trouvé pour le document: {filename}")
            continue
        
        try:
            collection_name = sanitize_collection_name(filename)
            
            # Vérifier si la base de vecteurs existe déjà
            if filename not in VECTOR_DBS:
                logger.info(f"Chargement de la base de vecteurs pour: {filename}")
                
                # Créer la base de vecteurs
                VECTOR_DBS[filename] = Chroma.from_texts(
                    texts=chunks,
                    embedding=embeddings,
                    persist_directory=PERSIST_DIRECTORY,
                    collection_name=collection_name
                )
                
                logger.info(f"Base de vecteurs chargée pour: {filename}")
        except Exception as e:
            logger.error(f"Erreur lors du chargement de la base de vecteurs pour {filename}: {str(e)}")


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


@app.delete("/documents/delete/")
async def delete_document(request: Request):
    """
    Supprime un document spécifique de la base de données MongoDB.
    Requiert user_id et filename dans le corps de la requête.
    """
    try:
        data = await request.json()
        user_id = data.get("user_id")
        filename = data.get("filename")
        
        if not user_id or not filename:
            logger.error("Paramètres manquants: user_id et filename sont requis")
            raise HTTPException(
                status_code=400,
                detail="user_id et filename sont requis"
            )
        
        logger.info(f"Tentative de suppression du document: {filename} pour user_id: {user_id}")
        
        # Suppression du document de MongoDB
        result = docs_collection.delete_one({
            "user_id": user_id,
            "filename": filename
        })
        
        if result.deleted_count == 0:
            logger.warning(f"Document non trouvé: {filename} pour user_id: {user_id}")
            raise HTTPException(
                status_code=404,
                detail="Document non trouvé"
            )
        
        # Suppression de la collection Chroma correspondante si elle existe
        collection_name = sanitize_collection_name(filename)
        try:
            import chromadb
            chroma_client = chromadb.PersistentClient(path=PERSIST_DIRECTORY)
            if collection_name in [col.name for col in chroma_client.list_collections()]:
                chroma_client.delete_collection(collection_name)
                logger.info(f"Collection Chroma supprimée: {collection_name}")
        except Exception as e:
            # On continue même si la suppression de la collection Chroma échoue
            logger.warning(f"Impossible de supprimer la collection Chroma: {str(e)}")
        
        # Supprimer également de VECTOR_DBS si présent
        if filename in VECTOR_DBS:
            del VECTOR_DBS[filename]
            logger.info(f"Base de vecteurs supprimée de la mémoire: {filename}")
        
        logger.info(f"Document supprimé avec succès: {filename}")
        return {
            "success": True, 
            "message": f"Document {filename} supprimé avec succès"
        }
    
    except HTTPException as he:
        # Réutiliser les exceptions HTTP déjà levées
        raise he
    except Exception as e:
        logger.error(f"Erreur lors de la suppression du document: {str(e)}")
        logger.error(traceback.format_exc())
        raise HTTPException(
            status_code=500,
            detail=f"Erreur lors de la suppression: {str(e)}"
        )


# Initialisation des bases de vecteurs au démarrage
@app.on_event("startup")
async def startup_event():
    try:
        # Charger toutes les bases de vecteurs
        await load_vector_dbs()
        logger.info(f"Initialisation terminée. {len(VECTOR_DBS)} bases de données vectorielles chargées.")
    except Exception as e:
        logger.error(f"Erreur lors de l'initialisation des bases de vecteurs: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
