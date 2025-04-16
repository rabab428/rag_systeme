"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Send, Paperclip, Bot, User, Loader2, Upload } from "lucide-react"
import FileUpload from "./file-upload"
import { cn } from "@/lib/utils"

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: Date
}

export default function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Bonjour ! Je suis votre assistant RAG. Je peux répondre à vos questions basées sur vos documents. Commencez par télécharger des fichiers ou posez-moi directement une question.",
      timestamp: new Date(),
    },
  ])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState("chat")
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const handleSend = async () => {
    if (!input.trim() || isLoading) return

    // Generate a random ID for the message
    const userMessageId = Math.random().toString(36).substring(2, 15)

    // Add user message
    const userMessage: Message = {
      id: userMessageId,
      role: "user",
      content: input,
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput("")
    setIsLoading(true)

    try {
      // In a real application, this would be an API call to your RAG backend
      // For now, we'll simulate a response after a delay
      await new Promise((resolve) => setTimeout(resolve, 1500))

      // Add assistant response
      const assistantMessage: Message = {
        id: Math.random().toString(36).substring(2, 15),
        role: "assistant",
        content: `Voici une réponse simulée à votre question: "${input}". Dans une implémentation réelle, cette réponse serait générée par le système RAG basé sur vos documents.`,
        timestamp: new Date(),
      }

      setMessages((prev) => [...prev, assistantMessage])
    } catch (error) {
      console.error("Error sending message:", error)
      // Add error message
      setMessages((prev) => [
        ...prev,
        {
          id: Math.random().toString(36).substring(2, 15),
          role: "assistant",
          content: "Désolé, une erreur s'est produite lors du traitement de votre demande.",
          timestamp: new Date(),
        },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex h-full flex-col">
      <Tabs defaultValue="chat" className="h-full" onValueChange={setActiveTab}>
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
          {/* Chat messages */}
          <div className="flex-1 overflow-y-auto rounded-lg border border-slate-200 bg-white p-4">
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
                      <span className="ml-2 text-xs text-slate-500">
                        {new Date(message.timestamp).toLocaleTimeString()}
                      </span>
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
          </div>

          {/* Input area */}
          <div className="mt-4 flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              type="button"
              onClick={() => setActiveTab("files")}
              title="Télécharger des fichiers"
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
