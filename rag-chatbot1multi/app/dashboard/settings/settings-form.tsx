"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { updateProfile, changePassword } from "@/app/actions/user"
import { CheckCircle2, AlertCircle, X } from "lucide-react"
import { cn } from "@/lib/utils"

interface User {
  id: string
  email: string
  firstName: string
  lastName: string
}

interface SettingsFormProps {
  user: User
}

interface AlertProps {
  message: string
  type: "success" | "error"
  onDismiss?: () => void
}

function Alert({ message, type, onDismiss }: AlertProps) {
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    // Auto-dismiss success messages after 5 seconds
    if (type === "success") {
      const timer = setTimeout(() => {
        setIsVisible(false)
        if (onDismiss) onDismiss()
      }, 5000)

      return () => clearTimeout(timer)
    }
  }, [type, onDismiss])

  if (!isVisible) return null

  return (
    <div
      className={cn(
        "mb-4 flex items-start justify-between rounded-md p-4 text-sm transition-all",
        type === "success"
          ? "bg-green-50 text-green-800 border border-green-200"
          : "bg-red-50 text-red-800 border border-red-200",
      )}
      role="alert"
    >
      <div className="flex items-center gap-2">
        {type === "success" ? (
          <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
        ) : (
          <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
        )}
        <span className="font-medium">{message}</span>
      </div>
      {onDismiss && (
        <button
          onClick={() => {
            setIsVisible(false)
            onDismiss()
          }}
          className="ml-4 text-slate-500 hover:text-slate-700"
          aria-label="Fermer"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  )
}

export default function SettingsForm({ user }: SettingsFormProps) {
  const router = useRouter()
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false)
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [profileError, setProfileError] = useState<string | null>(null)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [profileSuccessMessage, setProfileSuccessMessage] = useState<string | null>(null)
  const [passwordSuccessMessage, setPasswordSuccessMessage] = useState<string | null>(null)

  async function handleUpdateProfile(formData: FormData) {
    setIsUpdatingProfile(true)
    setProfileError(null)
    setProfileSuccessMessage(null)

    try {
      const result = await updateProfile(formData)

      if (result.success) {
        // Rafraîchir la page pour avoir les nouvelles données
        router.refresh()
        setProfileSuccessMessage("Votre profil a été mis à jour avec succès.")

        // Scroll to the top of the form to show the success message
        document.getElementById("profile-form")?.scrollIntoView({ behavior: "smooth" })
      } else {
        setProfileError(result.error || "Une erreur s'est produite lors de la mise à jour du profil")
      }
    } catch (error) {
      console.error("Erreur:", error)
      setProfileError("Une erreur s'est produite lors de la mise à jour du profil")
    } finally {
      setIsUpdatingProfile(false)
    }
  }

  async function handleChangePassword(formData: FormData) {
    setIsChangingPassword(true)
    setPasswordError(null)
    setPasswordSuccessMessage(null)

    const newPassword = formData.get("newPassword") as string
    const confirmPassword = formData.get("confirmPassword") as string

    // Vérification côté client que les mots de passe correspondent
    if (newPassword !== confirmPassword) {
      setPasswordError("Les mots de passe ne correspondent pas")
      setIsChangingPassword(false)
      return
    }

    try {
      const result = await changePassword(formData)

      if (result.success) {
        setPasswordSuccessMessage("Votre mot de passe a été changé avec succès.")
        const form = document.getElementById("password-form") as HTMLFormElement
        form?.reset()

        // Scroll to the password form to show the success message
        document.getElementById("security-section")?.scrollIntoView({ behavior: "smooth" })
      } else {
        setPasswordError(result.error || "Une erreur s'est produite lors du changement de mot de passe")
      }
    } catch (error) {
      console.error("Erreur:", error)
      setPasswordError("Une erreur s'est produite lors du changement de mot de passe")
    } finally {
      setIsChangingPassword(false)
    }
  }

  return (
    <div className="space-y-6">
      <div id="profile-form" className="rounded-lg border border-slate-200 bg-white p-6">
        <h2 className="mb-4 text-lg font-medium">Profil utilisateur</h2>

        {profileError && <Alert message={profileError} type="error" onDismiss={() => setProfileError(null)} />}

        {profileSuccessMessage && (
          <Alert message={profileSuccessMessage} type="success" onDismiss={() => setProfileSuccessMessage(null)} />
        )}

        <form action={handleUpdateProfile} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
          <Button type="submit" disabled={isUpdatingProfile} className="relative">
            {isUpdatingProfile ? (
              <>
                <span className="opacity-0">Enregistrer les modifications</span>
                <span className="absolute inset-0 flex items-center justify-center">
                  <svg
                    className="h-5 w-5 animate-spin text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                </span>
              </>
            ) : (
              "Enregistrer les modifications"
            )}
          </Button>
        </form>
      </div>

      <div id="security-section" className="rounded-lg border border-slate-200 bg-white p-6">
        <h2 className="mb-4 text-lg font-medium">Sécurité</h2>

        {passwordError && <Alert message={passwordError} type="error" onDismiss={() => setPasswordError(null)} />}

        {passwordSuccessMessage && (
          <Alert message={passwordSuccessMessage} type="success" onDismiss={() => setPasswordSuccessMessage(null)} />
        )}

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
          <Button type="submit" disabled={isChangingPassword} className="relative">
            {isChangingPassword ? (
              <>
                <span className="opacity-0">Changer le mot de passe</span>
                <span className="absolute inset-0 flex items-center justify-center">
                  <svg
                    className="h-5 w-5 animate-spin text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                </span>
              </>
            ) : (
              "Changer le mot de passe"
            )}
          </Button>
        </form>
      </div>
    </div>
  )
}


