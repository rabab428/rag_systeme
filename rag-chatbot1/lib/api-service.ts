// Service pour communiquer avec le backend FastAPI et l'API Next.js

// Configuration de base pour les requêtes
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000"
const NEXT_API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || ""

// Fonction utilitaire pour les requêtes
async function fetchAPI(endpoint: string, options: RequestInit = {}) {
  const url = endpoint.startsWith("/api") ? `${NEXT_API_BASE_URL}${endpoint}` : `${API_BASE_URL}${endpoint}`

  // Ajouter les headers par défaut
  const headers = {
    "Content-Type": "application/json",
    ...options.headers,
  }

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: "include", // Pour inclure les cookies dans les requêtes
  })

  // Gérer les erreurs HTTP
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    if (response.status === 404) {
      console.warn("Ressource non trouvée :", url)
      return null
    }
    throw new Error(errorData.detail || `API error: ${response.status}`)
  }
  

  // Retourner les données si la réponse est au format JSON
  if (response.headers.get("content-type")?.includes("application/json")) {
    return response.json()
  }

  return response
}

// Service pour le chat - utilise l'endpoint ask_question
export const chatService = {
  // Envoyer un message et obtenir une réponse du système RAG
  async sendMessage(message: string) {
    return fetchAPI("/ask_question/", {
      method: "POST",
      body: JSON.stringify({
        question: message,
      }),
    })
  },

  // Récupérer toutes les conversations
  async getConversations() {
    return fetchAPI("/api/conversations")
  },

  // Créer une nouvelle conversation
  async createConversation() {
    return fetchAPI("/api/conversations", {
      method: "POST",
    })
  },

  // Récupérer une conversation spécifique
  async getConversation(id: string) {
    return fetchAPI(`/api/conversations/${id}`)
  },

  // Ajouter un message à une conversation
  async addMessageToConversation(id: string, message: any) {
    return fetchAPI(`/api/conversations/${id}`, {
      method: "PUT",
      body: JSON.stringify({ message }),
    })
  },

  // Supprimer une conversation
  async deleteConversation(id: string) {
    return fetchAPI(`/api/conversations/${id}`, {
      method: "DELETE",
    })
  },
}

// Service pour la gestion des documents
export const documentService = {
  // Télécharger un fichier
  async uploadFile(file: File, onProgress?: (progress: number) => void) {
    const formData = new FormData()
    formData.append("file", file)

    // Utiliser XMLHttpRequest pour suivre la progression
    if (onProgress) {
      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        xhr.open("POST", `${API_BASE_URL}/upload_file/`)

        xhr.upload.addEventListener("progress", (event) => {
          if (event.lengthComputable) {
            const progress = Math.round((event.loaded / event.total) * 100)
            onProgress(progress)
          }
        })

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            const response = JSON.parse(xhr.responseText)
            resolve(response)
          } else {
            reject(new Error(`Upload failed: ${xhr.status}`))
          }
        }

        xhr.onerror = () => {
          reject(new Error("Upload failed"))
        }

        xhr.send(formData)
      })
    } else {
      // Si on ne suit pas la progression, utiliser fetch
      const response = await fetch(`${API_BASE_URL}/upload_file/`, {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.status}`)
      }

      return response.json()
    }
  },

  // Récupérer la liste des documents
  async getDocuments() {
    return fetchAPI("/documents/")
  },
}
