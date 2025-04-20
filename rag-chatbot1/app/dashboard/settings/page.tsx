import { getSession } from "@/lib/auth"
import { redirect } from "next/navigation"
import DashboardLayout from "@/components/dashboard/layout"
import SettingsForm from "./settings-form"

export default async function SettingsPage() {
  const session = await getSession()

  if (!session) {
    redirect("/login")
  }

  return (
    <DashboardLayout user={session.user}>
      <div className="max-w-2xl">
        <h1 className="mb-6 text-2xl font-bold">Paramètres</h1>
        <SettingsForm user={session.user} />
      </div>
    </DashboardLayout>
  )
}
