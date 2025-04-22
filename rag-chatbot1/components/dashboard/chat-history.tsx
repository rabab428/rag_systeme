"use client"

import { useState, useEffect } from "react"
import { MessageCircle, Search, Trash2, Loader2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { chatService } from "@/lib/api-service"
import { useToast } from "@/components/ui/use-toast"
import { useRouter, usePathname } from "next/navigation"

interface Conversation {
  id: string
  title: string
  createdAt: Date
  updatedAt: Date
}

export default function ChatHistory() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    fetchConversations()
  }, [pathname]) // Recharger les conversations quand le chemin change

  const fetchConversations = async () => {
    try {
      setIsLoading(true)
      const data = await chatService.getConversations()

      // Transformer les données de l'API en format utilisable par le composant
      const formattedConversations: Conversation[] = (data.conversations || []).map((conv: any) => ({
        id: conv._id,
        title: conv.title || "Conversation sans titre",
        createdAt: new Date(conv.createdAt || Date.now()),
        updatedAt: new Date(conv.updatedAt || Date.now()),
      }))

      setConversations(formattedConversations)
    } catch (error) {
      console.error("Error fetching conversations:", error)
      toast({
        title: "Erreur",
        description: "Impossible de charger l'historique des conversations.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const deleteConversation = async (conversationId: string) => {
    try {
      await chatService.deleteConversation(conversationId)
      setConversations((prev) => prev.filter((conv) => conv.id !== conversationId))

      // Si la conversation supprimée est celle actuellement affichée, rediriger vers le dashboard
      if (pathname.includes(conversationId)) {
        router.push("/dashboard")
      }

      toast({
        title: "Succès",
        description: "Conversation supprimée avec succès.",
      })
    } catch (error) {
      console.error("Error deleting conversation:", error)

      toast({
        title: "Erreur",
        description: "Impossible de supprimer la conversation.",
        variant: "destructive",
      })
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

  const filteredConversations = conversations.filter((conv) =>
    conv.title.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  const formatDate = (date: Date) => {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const convDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())

    const diffTime = today.getTime() - convDate.getTime()
    const diffDays = diffTime / (1000 * 60 * 60 * 24)

    if (diffDays === 0) {
      return "Aujourd'hui"
    } else if (diffDays === 1) {
      return "Hier"
    } else if (diffDays < 7) {
      return `Il y a ${Math.floor(diffDays)} jours`
    } else {
      return date.toLocaleDateString()
    }
  }

  // Vérifier si une conversation est active
  const isConversationActive = (id: string) => {
    return pathname === `/dashboard/chat/${id}`
  }

  return (
    <div className="space-y-3">
      <Button
        variant="outline"
        className="w-full flex items-center justify-center gap-2 mb-2"
        onClick={createNewConversation}
      >
        <MessageCircle className="h-4 w-4" />
        Nouvelle conversation
      </Button>

      <div className="relative">
        <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          placeholder="Rechercher..."
          className="pl-8"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
        </div>
      ) : filteredConversations.length === 0 ? (
        <div className="py-4 text-center text-sm text-slate-500">
          {searchQuery ? "Aucun résultat trouvé" : "Aucune conversation"}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredConversations.map((conversation) => (
            <div
              key={conversation.id}
              className={cn(
                "group flex cursor-pointer flex-col rounded-md p-2 hover:bg-slate-100",
                isConversationActive(conversation.id) && "bg-slate-100",
              )}
              onClick={() => router.push(`/dashboard/chat/${conversation.id}`)}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-2">
                  <MessageCircle
                    className={cn(
                      "mt-0.5 h-4 w-4 shrink-0",
                      isConversationActive(conversation.id) ? "text-blue-500" : "text-slate-500",
                    )}
                  />
                  <div className="min-w-0">
                    <p
                      className={cn(
                        "truncate text-sm",
                        isConversationActive(conversation.id) ? "font-semibold text-blue-600" : "font-medium",
                      )}
                    >
                      {conversation.title}
                    </p>
                    <p className="text-xs text-slate-500">{formatDate(conversation.updatedAt)}</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
                  onClick={(e) => {
                    e.stopPropagation()
                    deleteConversation(conversation.id)
                  }}
                >
                  <Trash2 className="h-4 w-4 text-slate-400 hover:text-red-500" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

