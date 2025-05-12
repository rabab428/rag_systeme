import { getSession } from "@/lib/auth"
import { redirect } from "next/navigation"
import DashboardLayout from "@/components/dashboard/layout"
import ChatInterface from "@/components/dashboard/chat-interface"

interface ChatPageProps {
  params: Promise<{ id: string }>
}

export default async function ChatPage({ params }: ChatPageProps) {
  const session = await getSession()

  if (!session) {
    redirect("/login")
  }

  // Attendre l'objet params complet
  const { id } = await params

  return (
    <DashboardLayout user={session.user}>
      <ChatInterface conversationId={id} />
    </DashboardLayout>
  )
}



