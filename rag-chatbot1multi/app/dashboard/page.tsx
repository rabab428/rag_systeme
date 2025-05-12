import { getSession } from "@/lib/auth"
import { redirect } from "next/navigation"
import DashboardLayout from "@/components/dashboard/layout"
import ChatInterface from "@/components/dashboard/chat-interface"

export default async function Dashboard() {
  const session = await getSession()

  if (!session) {
    redirect("/login")
  }

  return (
    <DashboardLayout user={session.user}>
      <ChatInterface />
    </DashboardLayout>
  )
}

