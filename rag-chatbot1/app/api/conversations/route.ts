import { connectToDatabase, Conversation } from "@/lib/mongodb"
import { getSession } from "@/lib/auth"
import { NextResponse } from "next/server"

// Route pour récupérer toutes les conversations d'un utilisateur
export async function GET() {
  try {
    const session = await getSession()

    if (!session) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
    }

    await connectToDatabase()

    const conversations = await Conversation.find({ userId: session.user.id })
      .sort({ updatedAt: -1 })
      .select("_id title createdAt updatedAt messages")
      .lean()

    return NextResponse.json({ conversations })
  } catch (error) {
    console.error("Erreur lors de la récupération des conversations:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}

// Route pour créer une nouvelle conversation
export async function POST() {
  try {
    const session = await getSession()

    if (!session) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
    }

    await connectToDatabase()

    const newConversation = await Conversation.create({
      userId: session.user.id,
      title: "Nouvelle conversation",
      messages: [
        {
          id: "welcome",
          role: "assistant",
          content:
            "Bonjour ! Je suis votre assistant RAG. Je peux répondre à vos questions basées sur vos documents. Commencez par télécharger des fichiers ou posez-moi directement une question.",
          timestamp: new Date(),
        },
      ],
    })

    return NextResponse.json({
      conversation: {
        id: newConversation._id,
        title: newConversation.title,
        messages: newConversation.messages,
      },
    })
  } catch (error) {
    console.error("Erreur lors de la création d'une conversation:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
