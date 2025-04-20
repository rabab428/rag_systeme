"use server"

import { cookies } from "next/headers"
import { revalidatePath } from "next/cache"

// Action pour mettre à jour le profil utilisateur
export async function updateProfile(formData: FormData) {
  try {
    const firstName = formData.get("firstName") as string
    const lastName = formData.get("lastName") as string
    const email = formData.get("email") as string

    // Récupérer le cookie de session avec await
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get("session")

    const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || ""}/api/user/update-profile`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        // Passer le cookie de session s'il existe
        ...(sessionCookie ? { Cookie: `session=${sessionCookie.value}` } : {}),
      },
      body: JSON.stringify({ firstName, lastName, email }),
    })

    const data = await response.json()

    if (!response.ok) {
      return { success: false, error: data.error || "Une erreur s'est produite" }
    }

    // Revalider toutes les pages qui pourraient utiliser les données utilisateur
    revalidatePath("/", "layout") // Revalider toute l'application
    
    // Retourner le succès avec needsRefresh pour forcer un rafraîchissement
    return {
      success: true,
      needsRefresh: true,
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

    // Récupérer le cookie de session avec await
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get("session")

    const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || ""}/api/user/change-password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Passer le cookie de session s'il existe
        ...(sessionCookie ? { Cookie: `session=${sessionCookie.value}` } : {}),
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

