import mongoose from "mongoose"

// Définition du schéma pour les messages
const messageSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    enum: ["user", "assistant"],
    required: true,
  },
  content: {
    type: String,
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
})

// Définition du schéma pour les conversations
const conversationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  title: {
    type: String,
    default: "Nouvelle conversation",
  },
  messages: [messageSchema],
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
})

// Middleware pour mettre à jour le champ updatedAt avant chaque sauvegarde
conversationSchema.pre("save", function (next) {
  this.updatedAt = new Date()

  // Générer un titre basé sur le premier message de l'utilisateur si le titre est par défaut
  if (this.title === "Nouvelle conversation" && this.messages.length > 0) {
    const userMessages = this.messages.filter((msg) => msg.role === "user")
    if (userMessages.length > 0) {
      const firstUserMessage = userMessages[0].content
      this.title = firstUserMessage.length > 30 ? firstUserMessage.substring(0, 30) + "..." : firstUserMessage
    }
  }

  next()
})

// Création du modèle Conversation
export const Conversation = mongoose.models.Conversation || mongoose.model("Conversation", conversationSchema)
