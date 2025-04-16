"use client"

import { useState } from "react"
import { MessageCircle, Search, Trash2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

// Simulated chat history data
const initialChats = [
  {
    id: "1",
    title: "Recherche sur les énergies renouvelables",
    preview: "Quelles sont les dernières avancées dans le domaine des énergies renouvelables ?",
    date: new Date(2023, 3, 15),
  },
  {
    id: "2",
    title: "Analyse des données financières",
    preview: "Peux-tu analyser ces données financières et me donner un résumé ?",
    date: new Date(2023, 3, 10),
  },
  {
    id: "3",
    title: "Questions sur le rapport annuel",
    preview: "J'ai des questions concernant le rapport annuel de 2022.",
    date: new Date(2023, 3, 5),
  },
]

export default function ChatHistory() {
  const [chats, setChats] = useState(initialChats)
  const [searchQuery, setSearchQuery] = useState("")

  const filteredChats = chats.filter((chat) => chat.title.toLowerCase().includes(searchQuery.toLowerCase()))

  const deleteChat = (chatId: string) => {
    setChats((prev) => prev.filter((chat) => chat.id !== chatId))
  }

  const formatDate = (date: Date) => {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const chatDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())

    const diffTime = today.getTime() - chatDate.getTime()
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

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          placeholder="Rechercher..."
          className="pl-8"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {filteredChats.length === 0 ? (
        <div className="py-4 text-center text-sm text-slate-500">
          {searchQuery ? "Aucun résultat trouvé" : "Aucune conversation"}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredChats.map((chat) => (
            <div key={chat.id} className={cn("group flex cursor-pointer flex-col rounded-md p-2 hover:bg-slate-100")}>
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-2">
                  <MessageCircle className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{chat.title}</p>
                    <p className="truncate text-xs text-slate-500">{chat.preview}</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
                  onClick={(e) => {
                    e.stopPropagation()
                    deleteChat(chat.id)
                  }}
                >
                  <Trash2 className="h-4 w-4 text-slate-400 hover:text-red-500" />
                </Button>
              </div>
              <div className="mt-1 pl-6">
                <p className="text-xs text-slate-400">{formatDate(chat.date)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
