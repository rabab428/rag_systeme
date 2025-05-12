"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Send,
  Paperclip,
  Bot,
  User,
  Loader2,
  Upload,
  PlusCircle,
  FileText,
  ChevronDown,
  ChevronUp,
  BarChart,
  Star,
  Plus,
  Maximize2,
  Minimize2,
} from "lucide-react"
import FileUpload from "./file-upload"
import { cn } from "@/lib/utils"
import { chatService } from "@/lib/api-service"
import { useToast } from "@/components/ui/use-toast"
import { useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"

const ChatMessageTimestamp = ({ timestamp }: { timestamp: Date }) => {
  const [time, setTime] = useState<string | null>(null)

  useEffect(() => {
    setTime(new Date(timestamp).toLocaleTimeString())
  }, [timestamp])

  return <span className="ml-2 text-xs text-slate-500">{time}</span>
}

// Interface pour un élément de contexte avec score
interface ContextItem {
  content: string
  score: number
  relevantSegment?: string // Segment le plus pertinent du contenu
}

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: Date
  context?: ContextItem[] // Contexte avec scores de pertinence
  question?: string // Question posée pour ce message
  sources?: string[] // Sources des documents utilisés
}

interface ChatInterfaceProps {
  conversationId?: string
}

export default function ChatInterface({ conversationId }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isInitialLoad, setIsInitialLoad] = useState(true)
  const [currentConversationId, setCurrentConversationId] = useState<string | undefined>(conversationId)
  const [expandedContexts, setExpandedContexts] = useState<Record<string, boolean>>({}) // État pour gérer l'affichage du contexte
  const [showAllContexts, setShowAllContexts] = useState<Record<string, boolean>>({}) // État pour afficher tous les extraits ou seulement le meilleur
  const [expandedSegments, setExpandedSegments] = useState<Record<string, boolean>>({}) // État pour afficher le segment complet ou juste la partie pertinente
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()
  const router = useRouter()
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    if (typeof window !== "undefined") {
      // C'est côté client, vous pouvez utiliser localStorage ici
      const savedId = localStorage.getItem("currentConversationId")
      // Check if there is a saved conversation ID in localStorage
      if (savedId) {
        // Call the function to load the conversation
        fetchConversation(savedId)
        router.push(`/dashboard/chat/${savedId}`)
      }
    }
  }, [])

  useEffect(() => {
    if (currentConversationId) {
      // Mettre à jour localStorage avec le nouvel ID de conversation
      localStorage.setItem("currentConversationId", currentConversationId)
    }
  }, [currentConversationId]) // Cela se déclenchera à chaque fois que currentConversationId change

  // Charger les messages de la conversation si un ID est fourni
  useEffect(() => {
    if (conversationId) {
      setCurrentConversationId(conversationId)
      fetchConversation(conversationId)
    } else {
      // Message de bienvenue par défaut pour une nouvelle conversation
      setMessages([
        {
          id: "welcome",
          role: "assistant",
          content:
            "Bonjour ! Je suis votre assistant RAG. Je peux répondre à vos questions basées sur vos documents. Commencez par télécharger des fichiers ou posez-moi directement une question.",
          timestamp: new Date(),
        },
      ])
      setIsInitialLoad(false)
    }
  }, [conversationId])

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const fetchConversation = async (id: string) => {
    try {
      setIsLoading(true)
      const data = await chatService.getConversation(id)

      if (data && data.conversation && data.conversation.messages) {
        setMessages(
          data.conversation.messages.map((msg: any) => ({
            ...msg,
          })),
        )
      }
    } catch (error) {
      console.error("Error fetching conversation:", error)
      toast({
        title: "Erreur",
        description: "Impossible de charger la conversation.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
      setIsInitialLoad(false)
    }
  }

  const createNewConversation = async () => {
    try {
      const data = await chatService.createConversation()
      router.push(`/dashboard/chat/${data.conversation.id}`)
    } catch (error) {
      console.error("Error creating new conversation:", error)
      toast({
        title: "Erreur",
        description: "Impossible de créer une nouvelle conversation.",
        variant: "destructive",
      })
    }
  }

  // Fonction pour créer une nouvelle conversation et y ajouter un message
  const createConversationWithMessage = async (message: Message) => {
    try {
      // Créer une nouvelle conversation
      const data = await chatService.createConversation()
      const newConversationId = data.conversation.id

      // Ajouter le message à la nouvelle conversation
      await chatService.addMessageToConversation(newConversationId, message)

      // Mettre à jour l'ID de conversation actuel
      setCurrentConversationId(newConversationId)

      // Rediriger vers la nouvelle conversation
      router.push(`/dashboard/chat/${newConversationId}`)

      return newConversationId
    } catch (error) {
      console.error("Error creating conversation with message:", error)
      throw error
    }
  }

  // Fonction pour basculer l'affichage du contexte
  const toggleContext = (messageId: string) => {
    setExpandedContexts((prev) => ({
      ...prev,
      [messageId]: !prev[messageId],
    }))
  }

  // Fonction pour basculer l'affichage de tous les extraits
  const toggleAllContexts = (messageId: string) => {
    setShowAllContexts((prev) => ({
      ...prev,
      [messageId]: !prev[messageId],
    }))
  }

  // Fonction pour basculer l'affichage du segment complet
  const toggleSegment = (messageId: string, index: number) => {
    const key = `${messageId}-${index}`
    setExpandedSegments((prev) => ({
      ...prev,
      [key]: !prev[key],
    }))
  }

  // Fonction pour obtenir la couleur du badge en fonction du score
  const getScoreColor = (score: number) => {
    if (score >= 80) return "bg-green-100 text-green-800" // Très pertinent
    if (score >= 60) return "bg-blue-100 text-blue-800" // Pertinent
    if (score >= 40) return "bg-yellow-100 text-yellow-800" // Moyennement pertinent
    return "bg-slate-100 text-slate-800" // Peu pertinent
  }

  // Fonction pour extraire le segment le plus pertinent d'un extrait
  const extractRelevantSegment = (content: string, question: string): string => {
    // Diviser le contenu en phrases
    const sentences = content.split(/(?<=[.!?])\s+/)

    // Mots clés de la question (sans les mots vides)
    const stopWords = [
      "le",
      "la",
      "les",
      "un",
      "une",
      "des",
      "du",
      "de",
      "et",
      "ou",
      "à",
      "au",
      "aux",
      "ce",
      "ces",
      "cette",
      "est",
      "sont",
      "qui",
      "que",
      "quoi",
      "comment",
      "pourquoi",
      "quand",
      "où",
      "quel",
      "quelle",
      "quels",
      "quelles",
    ]
    const questionWords = question
      .toLowerCase()
      .split(/\s+/)
      .filter((word) => !stopWords.includes(word) && word.length > 2)

    // Calculer un score pour chaque phrase basé sur le nombre de mots clés qu'elle contient
    const sentenceScores = sentences.map((sentence) => {
      const sentenceLower = sentence.toLowerCase()
      let score = 0

      questionWords.forEach((word) => {
        if (sentenceLower.includes(word)) {
          score += 1
        }
      })

      return { sentence, score }
    })

    // Trier les phrases par score et prendre les 1-3 meilleures
    const topSentences = sentenceScores
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .filter((item) => item.score > 0) // Ne garder que les phrases avec au moins un mot clé
      .map((item) => item.sentence)

    // Si aucune phrase pertinente n'est trouvée, retourner les premières phrases
    if (topSentences.length === 0) {
      return sentences.slice(0, 2).join(" ")
    }

    return topSentences.join(" ")
  }

  const handleSend = async () => {
    if (!input.trim() || isLoading) return

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: input,
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput("")
    setIsLoading(true)

    try {
      // Si nous n'avons pas d'ID de conversation, créer une nouvelle conversation
      if (!currentConversationId) {
        const newId = await createConversationWithMessage(userMessage)
        setCurrentConversationId(newId)
        // La page va se recharger, donc on arrête l'exécution ici
        return
      } else {
        // Sauvegarder le message de l'utilisateur dans la conversation existante
        await chatService.addMessageToConversation(currentConversationId, userMessage)
      }

      // Envoyer la question au backend FastAPI
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/ask_question/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question: input,
          user_id: userId, // Ajouter l'ID utilisateur à la requête
        }),
      })

      if (!response.ok) {
        // Récupérer le texte d'erreur de la réponse
        let errorText = "Pas de détails disponibles"
        try {
          errorText = await response.text()
        } catch (e) {
          // En cas d'échec de la lecture du texte, utiliser le message par défaut
        }

        // Journaliser l'erreur
        console.error("Erreur backend:", response.status, errorText)

        // Vérifier si c'est l'erreur spécifique "Aucun document disponible"
        if (errorText.includes("Aucun document disponible")) {
          throw new Error(
            "Aucun document n'a été chargé. Veuillez télécharger des documents dans l'onglet 'Fichiers' avant de poser des questions.",
          )
        }

        throw new Error(`Échec de la requête au backend (${response.status}): ${response.statusText}`)
      }

      const data = await response.json()

      // Traiter le contexte utilisé pour la réponse
      // Le nouveau format renvoie directement le contexte utilisé sous forme de texte
      const contextText = data.context_used || ""

      // Créer un tableau de contexte compatible avec l'interface existante
      const processedContext = contextText
        ? [
            {
              content: contextText,
              score: 100, // Score par défaut
              relevantSegment: contextText.substring(0, 200), // Utiliser les 200 premiers caractères comme segment pertinent
            },
          ]
        : []

      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: data.response || "Je n'ai pas pu trouver une réponse.",
        timestamp: new Date(),
        context: processedContext,
        question: input,
      }

      setMessages((prev) => [...prev, assistantMessage])

      // Sauvegarder la réponse de l'assistant dans la conversation
      if (currentConversationId) {
        await chatService.addMessageToConversation(currentConversationId, assistantMessage)
      }
    } catch (error) {
      console.error("Erreur lors de l'envoi :", error)

      // Créer un message d'erreur plus informatif
      let errorMessage: string
      if (error instanceof Error) {
        if (error.message.includes("Aucun document n'a été chargé")) {
          errorMessage = error.message
        } else {
          errorMessage = `Désolé, une erreur s'est produite lors du traitement de votre demande. (${error.message})`
        }
      } else {
        errorMessage = "Désolé, une erreur s'est produite lors du traitement de votre demande."
      }

      const errorResponse: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: errorMessage,
        timestamp: new Date(),
      }

      setMessages((prev) => [...prev, errorResponse])

      if (currentConversationId) {
        await chatService.addMessageToConversation(currentConversationId, errorResponse).catch(console.error)
      }
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    const fetchUserId = async () => {
      try {
        const res = await fetch("/api/me")
        if (!res.ok) return
        const data = await res.json()
        if (data.user?.id) setUserId(data.user.id)
      } catch (err) {
        console.error("Erreur lors de la récupération du user_id :", err)
      }
    }
    fetchUserId()
  }, [])

const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
  const files = event.target.files
  if (!files || !userId) return alert("Fichiers ou ID utilisateur manquants.")

  // Vérifie le nombre de fichiers déjà téléchargés
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/get_uploaded_filenames/${userId}`)
  if (!response.ok) {
    return alert("Erreur lors de la récupération des fichiers déjà téléchargés.")
  }

  const existingFiles = await response.json()
  if (existingFiles.length >= 3) {
    return alert("Vous ne pouvez pas télécharger plus de 3 fichiers.")
  }

  const formData = new FormData()

  // Ajoute chaque fichier à FormData
  Array.from(files).forEach((file) => {
    formData.append("files", file)
  })
  formData.append("user_id", userId)

  try {
    const uploadResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/upload_files/`, {
      method: "POST",
      body: formData,
    })

    if (!uploadResponse.ok) {
      throw new Error("Erreur lors du téléversement des fichiers")
    }

    const data = await uploadResponse.json()

    // Pour chaque fichier, ajoute un message de succès
    data.forEach((result: { status: string; filename: string; error?: string }) => {
      if (result.status === "success") {
        const assistantMessage: Message = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: `✔️ Fichier "${result.filename}" téléversé avec succès et ajouté à la base de connaissances.`,
          timestamp: new Date(),
        }

        setMessages((prev) => [...prev, assistantMessage])

        if (!currentConversationId) {
          createConversationWithMessage(assistantMessage).then((newId) => setCurrentConversationId(newId))
        } else {
          chatService.addMessageToConversation(currentConversationId, assistantMessage)
        }
      } else {
        const errorMessage: Message = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: `❌ Erreur lors du téléversement du fichier "${result.filename}". ${result.error || ''}`,
          timestamp: new Date(),
        }

        setMessages((prev) => [...prev, errorMessage])

        if (currentConversationId) {
          chatService.addMessageToConversation(currentConversationId, errorMessage).catch(console.error)
        }
      }
    })
  } catch (error) {
    console.error(error)

    const errorMessage: Message = {
      id: crypto.randomUUID(),
      role: "assistant",
      content: "❌ Une erreur est survenue lors du téléversement des fichiers.",
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, errorMessage])

    if (currentConversationId) {
      chatService.addMessageToConversation(currentConversationId, errorMessage).catch(console.error)
    }
  }

  // Réinitialiser l'input file
  if (fileInputRef.current) {
    fileInputRef.current.value = ""
  }
}


  // Fonction pour mettre en évidence les mots clés dans le texte
  const highlightKeywords = (text: string, question: string) => {
    if (!question) return text

    // Extraire les mots clés de la question (mots de plus de 3 caractères)
    const stopWords = [
      "le",
      "la",
      "les",
      "un",
      "" + "une",
      "des",
      "du",
      "de",
      "et",
      "ou",
      "à",
      "au",
      "aux",
      "ce",
      "ces",
      "cette",
      "est",
      "sont",
      "qui",
      "que",
      "quoi",
      "comment",
      "pourquoi",
      "quand",
      "où",
      "quel",
      "quelle",
      "quels",
      "quelles",
    ]
    const keywords = question
      .toLowerCase()
      .split(/\s+/)
      .filter((word) => !stopWords.includes(word) && word.length > 3)

    if (keywords.length === 0) return text

    // Créer une expression régulière pour tous les mots clés
    const regex = new RegExp(`(${keywords.join("|")})`, "gi")

    // Remplacer les occurrences par la version surlignée
    return text.replace(regex, '<mark class="bg-yellow-100 px-0.5 rounded">$1</mark>')
  }

  return (
    <div className="flex h-full flex-col">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">{currentConversationId ? "Conversation" : "Nouvelle conversation"}</h1>
        <Button variant="outline" size="sm" className="flex items-center gap-2" onClick={createNewConversation}>
          <PlusCircle className="h-4 w-4" />
          Nouvelle conversation
        </Button>
      </div>

      <Tabs defaultValue="chat" className="h-full flex flex-col gap-2">
        <TabsList className="w-fit">
          <TabsTrigger value="chat" className="flex items-center gap-2">
            <MessageCircleIcon className="h-4 w-4" />
            Chat
          </TabsTrigger>
          <TabsTrigger value="files" className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Fichiers
          </TabsTrigger>
        </TabsList>

        <TabsContent value="chat" className="flex flex-1 flex-col">
          <div className="flex-1 overflow-y-auto rounded-lg border border-slate-200 bg-white p-4">
            {isInitialLoad && conversationId ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={cn(
                      "flex flex-col gap-3 rounded-lg p-4",
                      message.role === "user" ? "bg-slate-100" : "bg-blue-50",
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={cn(
                          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                          message.role === "user" ? "bg-slate-300" : "bg-blue-100",
                        )}
                      >
                        {message.role === "user" ? (
                          <User className="h-5 w-5 text-slate-600" />
                        ) : (
                          <Bot className="h-5 w-5 text-blue-600" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="mb-1 flex items-center">
                          <span className="font-medium">{message.role === "user" ? "Vous" : "Assistant"}</span>
                          <ChatMessageTimestamp timestamp={message.timestamp} />
                        </div>
                        <p className="text-slate-700 whitespace-pre-wrap">{message.content}</p>
                      </div>
                    </div>

                    {/* Affichage du contexte utilisé avec segments pertinents */}
                    {message.context && message.context.length > 0 && (
                      <div className="mt-2 ml-11">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 mb-1"
                          onClick={() => toggleContext(message.id)}
                        >
                          <FileText className="h-3.5 w-3.5" />
                          {expandedContexts[message.id] ? "Masquer le contexte" : "Afficher le contexte utilisé"}
                          {expandedContexts[message.id] ? (
                            <ChevronUp className="h-3.5 w-3.5" />
                          ) : (
                            <ChevronDown className="h-3.5 w-3.5" />
                          )}
                        </Button>

                        {expandedContexts[message.id] && (
                          <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700 max-h-60 overflow-y-auto">
                            {/* Afficher uniquement l'extrait avec le score le plus élevé par défaut */}
                            {message.context.length > 0 && (
                              <div className="mb-4">
                                <div className="flex items-center justify-between mb-1">
                                  <div className="font-medium text-xs text-slate-500 flex items-center gap-1">
                                    <Star className="h-3.5 w-3.5 text-amber-500" />
                                    Extrait le plus pertinent
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <BarChart className="h-3 w-3 text-slate-400" />
                                    <Badge
                                      className={cn(
                                        "text-xs",
                                        getScoreColor(message.context.sort((a, b) => b.score - a.score)[0].score),
                                      )}
                                    >
                                      Pertinence: {message.context.sort((a, b) => b.score - a.score)[0].score}%
                                    </Badge>
                                  </div>
                                </div>

                                {/* Segment pertinent avec option d'expansion */}
                                <div className="p-3 bg-white rounded border border-green-100">
                                  {message.context[0].relevantSegment && !expandedSegments[`${message.id}-0`] ? (
                                    <>
                                      <div
                                        dangerouslySetInnerHTML={{
                                          __html: highlightKeywords(
                                            message.context[0].relevantSegment,
                                            message.question || "",
                                          ),
                                        }}
                                        className="whitespace-pre-wrap"
                                      />
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="mt-2 text-xs flex items-center gap-1"
                                        onClick={() => toggleSegment(message.id, 0)}
                                      >
                                        <Maximize2 className="h-3.5 w-3.5" />
                                        Voir l'extrait complet
                                      </Button>
                                    </>
                                  ) : (
                                    <>
                                      <div
                                        dangerouslySetInnerHTML={{
                                          __html: highlightKeywords(message.context[0].content, message.question || ""),
                                        }}
                                        className="whitespace-pre-wrap"
                                      />
                                      {message.context[0].relevantSegment && (
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="mt-2 text-xs flex items-center gap-1"
                                          onClick={() => toggleSegment(message.id, 0)}
                                        >
                                          <Minimize2 className="h-3.5 w-3.5" />
                                          Voir uniquement la partie pertinente
                                        </Button>
                                      )}
                                    </>
                                  )}
                                </div>

                                {/* Bouton pour afficher tous les extraits */}
                                {message.context.length > 1 && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="mt-2 text-xs flex items-center gap-1"
                                    onClick={() => toggleAllContexts(message.id)}
                                  >
                                    {showAllContexts[message.id] ? (
                                      <>
                                        <ChevronUp className="h-3.5 w-3.5" />
                                        Masquer les autres extraits
                                      </>
                                    ) : (
                                      <>
                                        <Plus className="h-3.5 w-3.5" />
                                        Afficher {message.context.length - 1} autre
                                        {message.context.length - 1 > 1 ? "s" : ""} extrait
                                        {message.context.length - 1 > 1 ? "s" : ""}
                                      </>
                                    )}
                                  </Button>
                                )}
                              </div>
                            )}

                            {/* Afficher les autres extraits si demandé */}
                            {showAllContexts[message.id] &&
                              message.context
                                .sort((a, b) => b.score - a.score)
                                .slice(1)
                                .map((contextItem, index) => (
                                  <div key={index} className="mb-4 last:mb-0">
                                    <div className="flex items-center justify-between mb-1">
                                      <div className="font-medium text-xs text-slate-500">
                                        Extrait supplémentaire {index + 1}
                                      </div>
                                      <div className="flex items-center gap-1">
                                        <BarChart className="h-3 w-3 text-slate-400" />
                                        <Badge className={cn("text-xs", getScoreColor(contextItem.score))}>
                                          Pertinence: {contextItem.score}%
                                        </Badge>
                                      </div>
                                    </div>

                                    {/* Segment pertinent avec option d'expansion */}
                                    <div className="p-3 bg-white rounded border border-slate-200">
                                      {contextItem.relevantSegment &&
                                      !expandedSegments[`${message.id}-${index + 1}`] ? (
                                        <>
                                          <div
                                            dangerouslySetInnerHTML={{
                                              __html: highlightKeywords(
                                                contextItem.relevantSegment,
                                                message.question || "",
                                              ),
                                            }}
                                            className="whitespace-pre-wrap"
                                          />
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            className="mt-2 text-xs flex items-center gap-1"
                                            onClick={() => toggleSegment(message.id, index + 1)}
                                          >
                                            <Maximize2 className="h-3.5 w-3.5" />
                                            Voir l'extrait complet
                                          </Button>
                                        </>
                                      ) : (
                                        <>
                                          <div
                                            dangerouslySetInnerHTML={{
                                              __html: highlightKeywords(contextItem.content, message.question || ""),
                                            }}
                                            className="whitespace-pre-wrap"
                                          />
                                          {contextItem.relevantSegment && (
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              className="mt-2 text-xs flex items-center gap-1"
                                              onClick={() => toggleSegment(message.id, index + 1)}
                                            >
                                              <Minimize2 className="h-3.5 w-3.5" />
                                              Voir uniquement la partie pertinente
                                            </Button>
                                          )}
                                        </>
                                      )}
                                    </div>

                                    {index < message.context!.length - 2 && <hr className="my-3 border-slate-200" />}
                                  </div>
                                ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
                {isLoading && (
                  <div className="flex items-center gap-3 rounded-lg bg-blue-50 p-4">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100">
                      <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <div className="mb-1">
                        <span className="font-medium">Assistant</span>
                      </div>
                      <p className="text-slate-700">En train de réfléchir...</p>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          <div className="mt-4 flex items-center gap-2">
            <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
            <Button
              variant="outline"
              size="icon"
              type="button"
              onClick={() => fileInputRef.current?.click()}
              title="Téléverser un fichier"
            >
              <Paperclip className="h-5 w-5" />
            </Button>

            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Posez votre question..."
              className="flex-1"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault()
                  handleSend()
                }
              }}
              disabled={isLoading}
            />
            <Button onClick={handleSend} disabled={!input.trim() || isLoading}>
              <Send className="h-5 w-5" />
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="files" className="h-[calc(100%-56px)]">
          <FileUpload />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function MessageCircleIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </svg>
  )
}