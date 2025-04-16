import { getSession } from "@/lib/auth"
import { redirect } from "next/navigation"
import DashboardLayout from "@/components/dashboard/layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"

export default async function SettingsPage() {
  const session = await getSession()

  if (!session) {
    redirect("/login")
  }

  return (
    <DashboardLayout user={session.user}>
      <div className="max-w-2xl">
        <h1 className="mb-6 text-2xl font-bold">Paramètres</h1>

        <div className="space-y-6">
          <div className="rounded-lg border border-slate-200 bg-white p-6">
            <h2 className="mb-4 text-lg font-medium">Profil utilisateur</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">Prénom</Label>
                  <Input id="firstName" defaultValue={session.user.firstName} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Nom</Label>
                  <Input id="lastName" defaultValue={session.user.lastName} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" defaultValue={session.user.email} />
              </div>
              <Button>Enregistrer les modifications</Button>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-6">
            <h2 className="mb-4 text-lg font-medium">Préférences du chatbot</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Réponses détaillées</p>
                  <p className="text-sm text-slate-500">Obtenir des réponses plus détaillées du chatbot</p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Citations des sources</p>
                  <p className="text-sm text-slate-500">Inclure les citations des sources dans les réponses</p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Historique des conversations</p>
                  <p className="text-sm text-slate-500">Sauvegarder l'historique des conversations</p>
                </div>
                <Switch defaultChecked />
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-6">
            <h2 className="mb-4 text-lg font-medium">Sécurité</h2>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Mot de passe actuel</Label>
                <Input id="currentPassword" type="password" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="newPassword">Nouveau mot de passe</Label>
                <Input id="newPassword" type="password" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
                <Input id="confirmPassword" type="password" />
              </div>
              <Button>Changer le mot de passe</Button>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
