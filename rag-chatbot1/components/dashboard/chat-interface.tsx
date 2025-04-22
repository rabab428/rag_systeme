"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Send, Paperclip, Bot, User, Loader2, Upload, PlusCircle } from "lucide-react"
import FileUpload from "./file-upload"
import { cn } from "@/lib/utils"
import { chatService } from "@/lib/api-service"
import { useToast } from "@/components/ui/use-toast"
import { useRouter } from "next/navigation"

const ChatMessageTimestamp = ({ timestamp }: { timestamp: Date }) => {
  const [time, setTime] = useState<string | null>(null)

  useEffect(() => {
    setTime(new Date(timestamp).toLocaleTimeString())
  }, [timestamp])

  return <span className="ml-2 text-xs text-slate-500">{time}</span>
}

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: Date
}

interface ChatInterfaceProps {
  conversationId?: string
}

export default function ChatInterface({ conversationId }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState("chat")
  const [isInitialLoad, setIsInitialLoad] = useState(true)
  const [currentConversationId, setCurrentConversationId] = useState<string | undefined>(conversationId)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()
  const router = useRouter()

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

      if (data.conversation && data.conversation.messages) {
        setMessages(
          data.conversation.messages.map((msg: any) => ({
            ...msg,
            timestamp: new Date(msg.timestamp),
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
        body: JSON.stringify({ question: input }),
      })

      if (!response.ok) {
        throw new Error("Échec de la requête au backend")
      }

      const data = await response.json()

      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: data.response || "Je n'ai pas pu trouver une réponse.",
        timestamp: new Date(),
      }

      setMessages((prev) => [...prev, assistantMessage])

      // Sauvegarder la réponse de l'assistant dans la conversation
      if (currentConversationId) {
        await chatService.addMessageToConversation(currentConversationId, assistantMessage)
      }
    } catch (error) {
      console.error("Erreur lors de l'envoi :", error)

      const errorMessage: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: "Désolé, une erreur s'est produite lors du traitement de votre demande.",
        timestamp: new Date(),
      }

      setMessages((prev) => [...prev, errorMessage])

      if (currentConversationId) {
        await chatService.addMessageToConversation(currentConversationId, errorMessage).catch(console.error)
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const formData = new FormData()
    formData.append("file", file)

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/upload_file/`, {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        throw new Error("Erreur lors du téléversement du fichier")
      }

      const data = await response.json()

      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: `Fichier "${file.name}" téléversé avec succès.`,
        timestamp: new Date(),
      }

      setMessages((prev) => [...prev, assistantMessage])

      // Si nous n'avons pas d'ID de conversation, créer une nouvelle conversation
      if (!currentConversationId) {
        const newId = await createConversationWithMessage(assistantMessage)
        setCurrentConversationId(newId)
      } else {
        // Sauvegarder le message dans la conversation existante
        await chatService.addMessageToConversation(currentConversationId, assistantMessage)
      }
    } catch (error) {
      console.error(error)

      const errorMessage: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: `Erreur lors du téléversement du fichier "${file.name}".`,
        timestamp: new Date(),
      }

      setMessages((prev) => [...prev, errorMessage])

      if (currentConversationId) {
        await chatService.addMessageToConversation(currentConversationId, errorMessage).catch(console.error)
      }
    }

    // Réinitialiser l'input file
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
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

      <Tabs defaultValue="chat" className="h-full" onValueChange={(value) => setActiveTab(value)}>
        <div className="mb-4 flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="chat" className="flex items-center gap-2">
              <MessageCircleIcon className="h-4 w-4" />
              Chat
            </TabsTrigger>
            <TabsTrigger value="files" className="flex items-center gap-2">
              <Upload className="h-4 w-4" />
              Fichiers
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="chat" className="flex h-[calc(100%-56px)] flex-col">
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
                      "flex items-start gap-3 rounded-lg p-4",
                      message.role === "user" ? "bg-slate-100" : "bg-blue-50",
                    )}
                  >
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
