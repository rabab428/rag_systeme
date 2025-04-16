import { getSession } from "@/lib/auth"
import { redirect } from "next/navigation"
import DashboardLayout from "@/components/dashboard/layout"
import FileUpload from "@/components/dashboard/file-upload"

export default async function DocumentsPage() {
  const session = await getSession()

  if (!session) {
    redirect("/login")
  }

  return (
    <DashboardLayout user={session.user}>
      <div className="max-w-4xl">
        <h1 className="mb-6 text-2xl font-bold">Gestion des documents</h1>
        <FileUpload />
      </div>
    </DashboardLayout>
  )
}
