# RAGBot - Assistant IA avec Retrieval-Augmented Generation

RAGBot est une application web moderne qui permet aux utilisateurs d'interagir avec leurs documents via un chatbot intelligent utilisant la technologie RAG (Retrieval-Augmented Generation). Cette application combine la puissance des grands modèles de langage (LLM) avec une recherche précise dans vos propres documents pour fournir des réponses contextuelles et pertinentes.

![RAGBot Screenshot](https://github.com/rabab428/rag_systeme/raw/main/rag-chatbot1/dashboard.png)

## 🌟 Fonctionnalités

- **Chatbot intelligent** : Posez des questions en langage naturel et obtenez des réponses basées sur vos documents
- **Gestion de documents** : Téléchargez, visualisez et organisez vos documents (PDF, TXT, JSON, etc.)
- **Historique des conversations** : Accédez à l'historique complet de vos échanges avec le chatbot
- **Authentification sécurisée** : Système complet d'inscription et de connexion
- **Interface responsive** : Expérience utilisateur optimisée sur tous les appareils
- **Prévisualisation de documents** : Visualisez vos documents directement dans l'application

## 🛠️ Technologies utilisées

### Frontend
- **Next.js 14** : Framework React avec App Router pour le rendu côté serveur et client
- **TypeScript** : Pour un code typé et plus robuste
- **Tailwind CSS** : Pour le style et la mise en page
- **shadcn/ui** : Composants UI réutilisables et accessibles
- **Lucide React** : Icônes modernes et personnalisables

### Backend
- **FastAPI** : API Python rapide pour le traitement des documents et les requêtes RAG
- **MongoDB** : Base de données NoSQL pour stocker les utilisateurs, conversations et métadonnées
- **Mongoose** : ODM pour faciliter les interactions avec MongoDB

### Fonctionnalités RAG
- **Indexation de documents** : Traitement et indexation des documents téléchargés
- **Recherche sémantique** : Recherche basée sur le sens plutôt que sur les mots-clés
- **Génération augmentée** : Réponses générées à partir des documents pertinents

## 📁 Structure du projet

```
📁 rag-chatbot/

├── 📁 app/                      # Dossiers et fichiers Next.js (App Router)
│   ├── 📁 actions/             # Server Actions pour l'authentification et les utilisateurs
│   ├── 📁 api/                 # Routes API Next.js
│   ├── 📁 dashboard/           # Pages du tableau de bord (chat, documents, paramètres)
│   ├── 📁 login/               # Page de connexion
│   ├── 📁 signup/              # Page d'inscription
│   ├── 📁 about/               # Page d'information sur RAG
│   ├── 📄 layout.tsx           # Layout principal de l'application
│   └── 📄 page.tsx             # Page d'accueil
│
├── 📁 components/              # Composants React réutilisables
│   ├── 📁 dashboard/           # Composants spécifiques au tableau de bord
│   │   ├── 📄 chat-history.tsx     # Historique des conversations
│   │   ├── 📄 chat-interface.tsx   # Interface de chat principale
│   │   ├── 📄 file-upload.tsx      # Composant de téléchargement de fichiers
│   │   └── 📄 layout.tsx           # Layout du tableau de bord
│   └── 📁 ui/                  # Composants UI réutilisables (shadcn/ui)
│
├── 📁 lib/                     # Utilitaires et services
│   ├── 📄 api-service.ts       # Service pour communiquer avec l'API
│   ├── 📄 auth.ts              # Fonctions d'authentification
│   ├── 📄 mongodb.ts           # Configuration et connexion MongoDB
│   ├── 📁 models/              # Modèles de données Mongoose
│   └── 📄 utils.ts             # Fonctions utilitaires
│
├── 📁 public/                  # Fichiers statiques
│
├── 📁 backend/                 # Backend du modèle RAG
│   ├── 📄 apptesto.py          # Fichier FastAPI du modèle
│   └── 📄 requirements.txt     # Fichier des bibliothèques
│
└── 📄 .env.local               # Variables d'environnement locales
```


## 🚀 Installation et configuration

### Prérequis
- Node.js 18+ et npm/yarn
- MongoDB
- Python 3.8+ (pour le backend FastAPI)

### Installation

1. **Cloner le dépôt**
   \`\`\`bash
   git clone https://github.com/rabab428/rag_systeme.git
   cd rag-chatbot
   \`\`\`

2. **Installer les dépendances**

    
⚙️ Installer Ollama
🔽 Télécharger l’installateur
Téléchargez Ollama depuis le site officiel :

👉 https://ollama.com/download


🚀 Lancer le service Ollama
Dans un terminal, exécutez la commande suivante pour démarrer le service Ollama :

    \`\`\`bash
     ollama serve

🤖 Télécharger le modèle LLaMA 3.2

  Une fois Ollama installé, utilisez cette commande pour télécharger le modèle LLaMA 3.2 :

        \`\`\`bash
        ollama run llama3:latest
  💡 Cette commande téléchargera automatiquement le modèle (~4GB) et le rendra prêt à l’emploi.
     


  ## 📦 Installation des dépendances front-end

Installez les dépendances du projet avec l'une des commandes suivantes :

\`\`\`bash
 npm install

# ou

\`\`\`bash
 yarn install

 \`\`\`
   

4. **Configurer les variables d'environnement**
   Créez un fichier `.env.local` à la racine du projet avec les variables suivantes :
   \`\`\`
   MONGODB_URI=mongodb://localhost:27017/ragbot
   NEXT_PUBLIC_API_BASE_URL=http://localhost:3000
   NEXT_PUBLIC_API_URL=http://localhost:8000
   \`\`\`

5. **Installer et configurer le backend FastAPI**
   
   \`\`\`bash
   cd backend
   pip install -r requirements.txt
   \`\`\`

7. **Lancer l'application**
   
   
   # Terminal 1 - Frontend Next.js
   
   \`\`\`bash
   npm run dev
   
   # ou

   \`\`\`bash
   yarn dev
   
   # Terminal 2 - Backend FastAPI

   \`\`\`bash
   cd backend
   uvicorn apptesto:app --reload --port 8000
   \`\`\`

9. Ouvrez votre navigateur à l'adresse `http://localhost:3000`

## 📘 Guide d'utilisation

### Inscription et connexion
1. Accédez à la page d'accueil et cliquez sur "S'inscrire"
2. Remplissez le formulaire avec vos informations
3. Une fois inscrit, connectez-vous avec votre email et mot de passe

### Téléchargement de documents
1. Accédez à l'onglet "Documents" dans le tableau de bord
2. Cliquez sur "Sélectionner des fichiers" ou glissez-déposez vos documents
3. Attendez que le téléchargement et l'indexation soient terminés

### Utilisation du chatbot
1. Accédez à l'onglet "Chat" dans le tableau de bord
2. Posez vos questions dans la zone de texte en bas
3. Le chatbot analysera vos documents et fournira des réponses pertinentes
4. Vous pouvez créer de nouvelles conversations en cliquant sur "Nouvelle conversation"

### Gestion des paramètres
1. Accédez à l'onglet "Paramètres" dans le tableau de bord
2. Modifiez vos informations personnelles ou votre mot de passe
3. Ajustez les préférences du chatbot selon vos besoins

## 🔌 API et intégrations

### API FastAPI
Le backend FastAPI expose les endpoints suivants :

- `POST /ask_question/` : Envoie une question au système RAG et reçoit une réponse
- `POST /upload_file/` : Télécharge et indexe un nouveau document
- `GET /documents/` : Récupère la liste des documents d'un utilisateur

### API Next.js
L'application Next.js expose les endpoints API suivants :

- `POST /api/auth/check-email` : Vérifie si un email est déjà utilisé
- `GET /api/conversations` : Récupère les conversations d'un utilisateur
- `POST /api/conversations` : Crée une nouvelle conversation
- `GET /api/conversations/[id]` : Récupère une conversation spécifique
- `PUT /api/conversations/[id]` : Ajoute un message à une conversation
- `DELETE /api/conversations/[id]` : Supprime une conversation

## 🤝 Contribuer au projet

Les contributions sont les bienvenues ! Pour contribuer :

1. Forkez le projet
2. Créez une branche pour votre fonctionnalité (`git checkout -b feature/amazing-feature`)
3. Committez vos changements (`git commit -m 'Add some amazing feature'`)
4. Poussez vers la branche (`git push origin feature/amazing-feature`)
5. Ouvrez une Pull Request

## 📜 Licence

Ce projet est sous licence MIT. Voir le fichier `LICENSE` pour plus d'informations.

## 📞 Contact

Pour toute question ou suggestion, n'hésitez pas à ouvrir une issue sur GitHub ou à contacter l'équipe de développement.

   hanzazrabab4@gmail.com
   Yasminaelhafi2@gmail.com
   Loualioumaima13@gmail.com

Développé avec ❤️ par [Rabab HANZAZ/Yasmina EL HAFI/Oumaima LOUALI]
