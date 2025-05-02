import { cookies } from "next/headers"
import { connectToDatabase, User } from "@/lib/mongodb"

interface Session {
  id: string
  user: {
    id: string
    email: string
    firstName: string
    lastName: string
  }
}

export async function getSession(): Promise<Session | null> {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get("session")

  if (!sessionCookie) {
    return null
  }

  try {
    const session = JSON.parse(sessionCookie.value) as Session

    await connectToDatabase()
    const user = await User.findById(session.user.id)

    if (!user) {
      return null
    }

    // Reconstruire l'objet avec les infos mises à jour depuis MongoDB
    return {
      id: session.id,
      user: {
        id: user._id.toString(),
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      },
    }
  } catch (error) {
    console.error("Erreur dans getSession:", error)
    return null
  }
}
