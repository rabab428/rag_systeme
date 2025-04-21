"use server"

import { cookies } from "next/headers"
import { revalidatePath } from "next/cache"

// Action pour mettre à jour le profil utilisateur
export async function updateProfile(formData: FormData) {
  try {
    const firstName = formData.get("firstName") as string
    const lastName = formData.get("lastName") as string
    const email = formData.get("email") as string

    // Récupérer le cookie de session
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get("session")

    if (!sessionCookie) {
      return { success: false, error: "Session non trouvée" }
    }

    // Appeler l'API pour mettre à jour le profil
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || ""}/api/user/update-profile`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Cookie: `session=${sessionCookie.value}`,
      },
      body: JSON.stringify({ firstName, lastName, email }),
    })

    const data = await response.json()

    if (!response.ok) {
      return { success: false, error: data.error || "Une erreur s'est produite" }
    }

    // Revalider les chemins pour forcer le rafraîchissement des données
    revalidatePath("/dashboard", "layout")
    revalidatePath("/dashboard/settings")

    return {
      success: true,
      user: data.user,
    }
  } catch (error) {
    console.error("Erreur lors de la mise à jour du profil:", error)
    return { success: false, error: "Une erreur s'est produite lors de la mise à jour du profil" }
  }
}

// Action pour changer le mot de passe
export async function changePassword(formData: FormData) {
  try {
    const currentPassword = formData.get("currentPassword") as string
    const newPassword = formData.get("newPassword") as string
    const confirmPassword = formData.get("confirmPassword") as string

    // Vérifier si les mots de passe correspondent
    if (newPassword !== confirmPassword) {
      return { success: false, error: "Les mots de passe ne correspondent pas" }
    }

    // Récupérer le cookie de session
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get("session")

    if (!sessionCookie) {
      return { success: false, error: "Session non trouvée" }
    }

    const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || ""}/api/user/change-password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `session=${sessionCookie.value}`,
      },
      body: JSON.stringify({ currentPassword, newPassword }),
    })

    const data = await response.json()

    if (!response.ok) {
      return { success: false, error: data.error || "Une erreur s'est produite" }
    }

    return { success: true }
  } catch (error) {
    console.error("Erreur lors du changement de mot de passe:", error)
    return { success: false, error: "Une erreur s'est produite lors du changement de mot de passe" }
  }
}

