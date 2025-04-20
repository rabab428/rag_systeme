"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { updateProfile, changePassword } from "@/app/actions/user"
import { useToast } from "@/components/ui/use-toast"
import { useRouter } from "next/navigation"

interface User {
  id: string
  email: string
  firstName: string
  lastName: string
}

interface SettingsFormProps {
  user: User
}

export default function SettingsForm({ user: initialUser }: SettingsFormProps) {
  const [user, setUser] = useState(initialUser)
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false)
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [profileError, setProfileError] = useState<string | null>(null)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const { toast } = useToast()
  const router = useRouter()

  async function handleUpdateProfile(formData: FormData) {
    setIsUpdatingProfile(true)
    setProfileError(null)

    try {
      const result = await updateProfile(formData)

      if (result.success) {
        toast({
          title: "Succès",
          description: "Votre profil a été mis à jour avec succès.",
        })

        // Si nous avons besoin de rafraîchir la page pour voir les changements
        if (result.needsRefresh) {
          // Mettre à jour l'utilisateur localement si disponible
          if (result.user) {
            setUser(result.user)
          }

          // Rafraîchir la page pour obtenir la nouvelle session après une courte pause
          setTimeout(() => {
            window.location.reload()
          }, 500)
        }
      } else {
        setProfileError(result.error || "Une erreur s'est produite")
        toast({
          title: "Erreur",
          description: result.error || "Une erreur s'est produite lors de la mise à jour du profil",
          variant: "destructive",
        })
      }
    } catch (error) {
      const errorMessage = "Une erreur s'est produite lors de la mise à jour du profil"
      setProfileError(errorMessage)
      toast({
        title: "Erreur",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsUpdatingProfile(false)
    }
  }

  async function handleChangePassword(formData: FormData) {
    setIsChangingPassword(true)
    setPasswordError(null)

    try {
      const result = await changePassword(formData)

      if (result.success) {
        toast({
          title: "Succès",
          description: "Votre mot de passe a été changé avec succès.",
        })

        // Réinitialiser le formulaire
        const form = document.getElementById("password-form") as HTMLFormElement
        form.reset()
      } else {
        setPasswordError(result.error || "Une erreur s'est produite")
        toast({
          title: "Erreur",
          description: result.error || "Une erreur s'est produite lors du changement de mot de passe",
          variant: "destructive",
        })
      }
    } catch (error) {
      const errorMessage = "Une erreur s'est produite lors du changement de mot de passe"
      setPasswordError(errorMessage)
      toast({
        title: "Erreur",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsChangingPassword(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <h2 className="mb-4 text-lg font-medium">Profil utilisateur</h2>
        {profileError && <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-800">{profileError}</div>}
        <form action={handleUpdateProfile} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">Prénom</Label>
              <Input id="firstName" name="firstName" defaultValue={user.firstName} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Nom</Label>
              <Input id="lastName" name="lastName" defaultValue={user.lastName} required />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" defaultValue={user.email} required />
          </div>
          <Button type="submit" disabled={isUpdatingProfile}>
            {isUpdatingProfile ? "Enregistrement..." : "Enregistrer les modifications"}
          </Button>
        </form>
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
              <p className="font-medium">Historique des conversations</p>
              <p className="text-sm text-slate-500">Sauvegarder l'historique des conversations</p>
            </div>
            <Switch defaultChecked />
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <h2 className="mb-4 text-lg font-medium">Sécurité</h2>
        {passwordError && <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-800">{passwordError}</div>}
        <form id="password-form" action={handleChangePassword} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="currentPassword">Mot de passe actuel</Label>
            <Input id="currentPassword" name="currentPassword" type="password" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="newPassword">Nouveau mot de passe</Label>
            <Input id="newPassword" name="newPassword" type="password" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
            <Input id="confirmPassword" name="confirmPassword" type="password" required />
          </div>
          <Button type="submit" disabled={isChangingPassword}>
            {isChangingPassword ? "Changement en cours..." : "Changer le mot de passe"}
          </Button>
        </form>
      </div>
    </div>
  )
}

