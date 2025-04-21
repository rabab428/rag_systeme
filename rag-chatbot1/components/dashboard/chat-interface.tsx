"use client"

import React, { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Send, Paperclip, Bot, User, Loader2, Upload } from "lucide-react"
import FileUpload from "./file-upload"
import { cn } from "@/lib/utils"

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
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

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
      const response = await fetch("http://localhost:8000/ask_question/", {
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
    } catch (error) {
      console.error("Erreur lors de l'envoi :", error)
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content:
            "Désolé, une erreur s'est produite lors du traitement de votre demande.",
          timestamp: new Date(),
        },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0]
    if (file) {
      const formData = new FormData()
      formData.append("file", file)

      try {
        const response = await fetch("http://localhost:8000/upload_file/", {
          method: "POST",
          body: formData,
        })

        if (!response.ok) {
          throw new Error("Erreur lors du téléversement du fichier")
        }

        const data = await response.json()

        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: "assistant",
            content: `✅ Fichier "${file.name}" téléversé avec succès.`,
            timestamp: new Date(),
          },
        ])
      } catch (error) {
        console.error(error)
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: "assistant",
            content: `❌ Erreur lors du téléversement du fichier "${file.name}".`,
            timestamp: new Date(),
          },
        ])
      }
    }
  }

  return (
    <div className="flex h-full flex-col">
      <Tabs
        defaultValue="chat"
        className="h-full"
        onValueChange={(value) => setActiveTab(value)}
      >
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
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "flex items-start gap-3 rounded-lg p-4",
                    message.role === "user" ? "bg-slate-100" : "bg-blue-50"
                  )}
                >
                  <div
                    className={cn(
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                      message.role === "user" ? "bg-slate-300" : "bg-blue-100"
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
                      <span className="font-medium">
                        {message.role === "user" ? "Vous" : "Assistant"}
                      </span>
                      <ChatMessageTimestamp timestamp={message.timestamp} />
                    </div>
                    <p className="text-slate-700 whitespace-pre-wrap">
                      {message.content}
                    </p>
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

          <div className="mt-4 flex items-center gap-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              className="hidden"
            />
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
