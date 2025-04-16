import { cookies } from "next/headers"

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
  const cookieStore = await cookies()  //  utilise 'await'
  const sessionCookie = cookieStore.get("session")

  if (!sessionCookie) {
    return null
  }

  try {
    return JSON.parse(sessionCookie.value) as Session
  } catch (error) {
    return null
  }
}
