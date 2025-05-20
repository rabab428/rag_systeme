import os
import re
from fastapi import FastAPI, File, UploadFile, HTTPException, Form, Query,  Request
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
import nltk
nltk.download('averaged_perceptron_tagger')
from datetime import datetime  
import traceback
import base64
import numpy as np
from langdetect import detect
from pydantic import BaseModel
from typing import Dict, List, Optional
from bson.binary import Binary  # ✅ à importer en haut de ton fichier
from langchain.retrievers.multi_query import MultiQueryRetriever


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
# Dictionnaire pour gérer les vecteurs par utilisateur
USER_VECTOR_DBS = {}
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




@app.on_event("startup")
def load_existing_vector_dbs():
    for user_id in os.listdir(PERSIST_DIRECTORY):
        user_persist_dir = os.path.join(PERSIST_DIRECTORY, user_id)
        if os.path.isdir(user_persist_dir):
            USER_VECTOR_DBS[user_id] = Chroma(
                embedding_function=OllamaEmbeddings(model="yxchia/multilingual-e5-base"),
                persist_directory=user_persist_dir
            )





def generate_unique_filename(filename, user_id):
    name, ext = os.path.splitext(filename)
    i = 1
    new_filename = filename
    while docs_collection.find_one({"user_id": user_id, "filename": new_filename}):
        new_filename = f"{name} ({i}){ext}"
        i += 1
    return new_filename






@app.post("/upload_files/")
async def upload_files(
    files: List[UploadFile] = File(...),
    user_id: str = Form(...)
):
    global USER_VECTOR_DBS

    results = []

    # ✅ Embeddings communs
    embeddings = OllamaEmbeddings(model="yxchia/multilingual-e5-base")

    # ✅ Base vectorielle propre à chaque utilisateur
    if user_id not in USER_VECTOR_DBS:
        user_persist_dir = os.path.join(PERSIST_DIRECTORY, user_id)
        os.makedirs(user_persist_dir, exist_ok=True)
        USER_VECTOR_DBS[user_id] = Chroma(
            embedding_function=embeddings,
            persist_directory=user_persist_dir
        )

    vector_db = USER_VECTOR_DBS[user_id]

    for file in files:
        logger.info(f"Traitement du fichier: {file.filename} pour user_id: {user_id}")

        try:
            # 1. Sauvegarde temporaire
            temp_dir = tempfile.mkdtemp()
            unique_filename = generate_unique_filename(file.filename, user_id)
            file_path = os.path.join(temp_dir, unique_filename)


            with open(file_path, "wb") as f:
                shutil.copyfileobj(file.file, f)

            # 2. Extraction du texte
            text = ""
            if file.filename.endswith(".pdf"):
                loader = UnstructuredPDFLoader(file_path)
                text = "\n".join([doc.page_content for doc in loader.load()])
            elif file.filename.endswith(".docx"):
                text = extract_text_from_docx(file_path)
            elif file.filename.endswith((".txt", ".md")):
                text = extract_text_from_txt(file_path)
            else:
                raise HTTPException(400, f"Format non supporté pour {file.filename}")

            if not text.strip():
                raise HTTPException(400, f"Fichier {file.filename} vide ou texte non extractible")

            # 3. Lecture binaire
            with open(file_path, "rb") as f:
                file_binary = Binary(f.read())

            # 4. Enregistrement dans MongoDB
            doc_data = {
                "user_id": user_id,
                "filename": file.filename,
                "text": text,
                "file_data": file_binary,
                "timestamp": datetime.now()
            }
            docs_collection.insert_one(doc_data)

            # 5. Ajout dans la base vectorielle avec metadata
            file_size = os.path.getsize(file_path)
            vector_db.add_texts([text], metadatas=[{
            "filename": file.filename,
            "size_bytes": file_size
            }])

            results.append({
                "status": "success",
                "filename": file.filename
            })

            shutil.rmtree(temp_dir)

        except Exception as e:
            logger.error(f"Erreur sur {file.filename}: {traceback.format_exc()}")
            results.append({
                "status": "error",
                "filename": file.filename,
                "error": str(e)
            })

    return results












class FileInfo(BaseModel):
    filename: str
    size: str  # taille formatée (ex: "872.56 KB")

def format_size(bytes_size: int) -> str:
    for unit in ["B", "KB", "MB"]:
        if bytes_size < 1024:
            return f"{bytes_size:.2f} {unit}"
        bytes_size /= 1024
    return f"{bytes_size:.2f} MB"  # Si >1024 MB, reste en MB

@app.get("/get_uploaded_filenames/{user_id}", response_model=List[FileInfo])
async def get_uploaded_filenames(user_id: str):
    if user_id not in USER_VECTOR_DBS:
        raise HTTPException(status_code=404, detail="Base vectorielle non trouvée pour cet utilisateur.")

    try:
        vector_db = USER_VECTOR_DBS[user_id]
        collection = vector_db._collection
        metadatas = collection.get(include=["metadatas"])["metadatas"]

        files_info = []
        seen_files = set()

        for meta in metadatas:
            if meta and "filename" in meta:
                filename = meta["filename"]
                if filename not in seen_files:
                    size_bytes = meta.get("size_bytes", 0)
                    size_str = format_size(size_bytes)
                    files_info.append(FileInfo(filename=filename, size=size_str))
                    seen_files.add(filename)

        return files_info

    except Exception as e:
        logger.error(f"Erreur lors de la récupération des fichiers : {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail="Erreur interne.")





@app.delete("/delete_file_vector/")
async def delete_file_vector(user_id: str = Query(...), filename: str = Query(...)):
    if user_id not in USER_VECTOR_DBS:
        raise HTTPException(status_code=404, detail="Base vectorielle non trouvée pour cet utilisateur.")

    try:
        vector_db = USER_VECTOR_DBS[user_id]
        collection = vector_db._collection

        # Obtenir tous les IDs des documents correspondant au fichier
        ids_to_delete = []
        collection_data = collection.get(include=["metadatas"])
        for doc_id, meta in zip(collection_data["ids"], collection_data["metadatas"]):
            if meta and meta.get("filename") == filename:
                ids_to_delete.append(doc_id)

        if not ids_to_delete:
            raise HTTPException(status_code=404, detail="Aucun vecteur trouvé pour ce fichier.")

        # Supprimer les vecteurs du fichier
        collection.delete(ids_to_delete)

        return {"status": "success", "deleted_vectors": len(ids_to_delete), "filename": filename}

    except Exception as e:
        logger.error(f"Erreur lors de la suppression : {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail="Erreur interne.")












# ✅ Request model
class QuestionRequest(BaseModel):
    user_id: str
    question: str

@app.post("/ask_question/")
async def ask_question(data: QuestionRequest):
    user_id = data.user_id
    question = data.question

    lang = detect(question)
    logger.info(f"Langue détectée : {lang}, pour user_id : {user_id}")

    # Vérifier l'existence de la base vectorielle utilisateur
    if user_id not in USER_VECTOR_DBS:
        raise HTTPException(status_code=400, detail="Aucun document chargé pour cet utilisateur.")

    try:
        vector_db = USER_VECTOR_DBS[user_id]
        retriever = vector_db.as_retriever(search_kwargs={"k": 1})
        llm = ChatOllama(model="llama3.2:1b")

        # Définir le prompt en fonction de la langue
        if lang == "en":
            template = """Answer the question based solely on the context below:

{context}

Question: {question}

Rules:
- Answer in English.
- Be concise and factual.
- If the information is not present in the context, state this clearly.
"""
        else:
            template = """Répondez à la question en vous basant uniquement sur le contexte ci-dessous :

{context}

Question : {question}

Règles :
- Répondez en français.
- Soyez concis et factuel.
- Si l’information n’est pas présente dans le contexte, indiquez-le clairement.
"""

        prompt = ChatPromptTemplate.from_template(template)

        # 🔍 Récupération des documents les plus pertinents
        docs = retriever.get_relevant_documents(question)

        if not docs:
            context_text = "Aucun document pertinent trouvé."
        else:
            context_parts = []
            for doc in docs:
                filename = doc.metadata.get("filename", "Nom de fichier inconnu")
                context_parts.append(f"📄 Fichier : {filename}\n{doc.page_content.strip()}")
            context_text = "\n\n---\n\n".join(context_parts)

        # 🧠 Construction et exécution de la chaîne
        chain = (
            {"context": RunnablePassthrough(), "question": RunnablePassthrough()}
            | prompt
            | llm
            | StrOutputParser()
        )

        response = chain.invoke({"context": context_text, "question": question})

        return {
            "question": question,
            "response": response,
            "context_used": context_text
        }

    except Exception as e:
        logger.error(f"Erreur : {traceback.format_exc()}")
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




if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)