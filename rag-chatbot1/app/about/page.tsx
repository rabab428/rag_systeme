import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Database, Search, Bot, BookOpen, Zap, Shield } from "lucide-react"

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200">
        <div className="container mx-auto py-6">
          <Link href="/" className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900">
            <ArrowLeft className="h-4 w-4" />
            Retour à l'accueil
          </Link>
        </div>
      </header>

      <main className="container mx-auto py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 mb-6">Comprendre notre système RAG</h1>

          <p className="text-xl text-slate-600 mb-12">
            Découvrez comment notre technologie de Retrieval-Augmented Generation (RAG) révolutionne l'interaction avec
            vos documents et données.
          </p>

          <section className="mb-16">
            <h2 className="text-2xl font-bold text-slate-900 mb-6">Qu'est-ce que RAG ?</h2>
            <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm">
              <p className="mb-4">
                RAG (Retrieval-Augmented Generation) est une approche avancée qui combine la puissance des grands
                modèles de langage (LLM) avec une recherche précise dans vos propres documents.
              </p>
              <p className="mb-4">
                Contrairement aux chatbots traditionnels qui s'appuient uniquement sur leurs connaissances
                préentraînées, notre système RAG peut rechercher des informations spécifiques dans vos documents et les
                utiliser pour générer des réponses précises et contextuelles.
              </p>
              <p>
                Cette approche hybride permet d'obtenir des réponses plus pertinentes, plus précises et toujours à jour
                avec vos informations les plus récentes.
              </p>
            </div>
          </section>

          <section className="mb-16">
            <h2 className="text-2xl font-bold text-slate-900 mb-6">Comment fonctionne notre système RAG ?</h2>
            <div className="grid gap-8 md:grid-cols-3">
              <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
                  <Database className="h-6 w-6 text-slate-700" />
                </div>
                <h3 className="text-lg font-semibold mb-2">1. Indexation</h3>
                <p className="text-slate-600">
                  Vos documents sont analysés, segmentés et indexés pour permettre une recherche rapide et précise.
                </p>
              </div>

              <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
                  <Search className="h-6 w-6 text-slate-700" />
                </div>
                <h3 className="text-lg font-semibold mb-2">2. Recherche</h3>
                <p className="text-slate-600">
                  Lorsque vous posez une question, le système recherche les informations les plus pertinentes dans votre
                  base documentaire.
                </p>
              </div>

              <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
                  <Bot className="h-6 w-6 text-slate-700" />
                </div>
                <h3 className="text-lg font-semibold mb-2">3. Génération</h3>
                <p className="text-slate-600">
                  Le modèle de langage génère une réponse précise en s'appuyant sur les informations récupérées et ses
                  propres connaissances.
                </p>
              </div>
            </div>
          </section>

          <section className="mb-16">
            <h2 className="text-2xl font-bold text-slate-900 mb-6">Avantages du système RAG</h2>
            <div className="grid gap-6 md:grid-cols-2">
              <div className="flex gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100">
                  <BookOpen className="h-5 w-5 text-slate-700" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-1">Connaissances spécifiques</h3>
                  <p className="text-slate-600">
                    Accédez à des informations précises issues de vos propres documents, même les plus récents.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100">
                  <Zap className="h-5 w-5 text-slate-700" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-1">Réponses rapides</h3>
                  <p className="text-slate-600">
                    Obtenez des réponses instantanées sans avoir à parcourir manuellement vos documents.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100">
                  <Shield className="h-5 w-5 text-slate-700" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-1">Confidentialité</h3>
                  <p className="text-slate-600">
                    Vos données restent privées et sécurisées, sans être partagées avec des tiers.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100">
                  <Bot className="h-5 w-5 text-slate-700" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-1">Intelligence augmentée</h3>
                  <p className="text-slate-600">
                    Combinez la puissance des LLM avec vos connaissances spécifiques pour des réponses optimales.
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="mb-16">
            <h2 className="text-2xl font-bold text-slate-900 mb-6">Cas d'utilisation</h2>
            <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm">
              <ul className="space-y-4">
                <li className="flex gap-3">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-medium">
                    1
                  </div>
                  <div>
                    <h4 className="font-medium">Support client</h4>
                    <p className="text-slate-600">
                      Répondez instantanément aux questions des clients en vous basant sur votre documentation
                      technique, vos FAQ et vos guides d'utilisation.
                    </p>
                  </div>
                </li>

                <li className="flex gap-3">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-medium">
                    2
                  </div>
                  <div>
                    <h4 className="font-medium">Recherche documentaire</h4>
                    <p className="text-slate-600">
                      Trouvez rapidement des informations spécifiques dans de vastes ensembles de documents, rapports ou
                      archives.
                    </p>
                  </div>
                </li>

                <li className="flex gap-3">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-medium">
                    3
                  </div>
                  <div>
                    <h4 className="font-medium">Formation et onboarding</h4>
                    <p className="text-slate-600">
                      Aidez les nouveaux employés à se former en leur permettant d'interroger facilement les manuels
                      internes et les procédures.
                    </p>
                  </div>
                </li>

                <li className="flex gap-3">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-medium">
                    4
                  </div>
                  <div>
                    <h4 className="font-medium">Analyse de données</h4>
                    <p className="text-slate-600">
                      Posez des questions sur vos rapports et données pour obtenir des insights sans avoir à maîtriser
                      des outils d'analyse complexes.
                    </p>
                  </div>
                </li>
              </ul>
            </div>
          </section>

          <section className="mb-16">
            <h2 className="text-2xl font-bold text-slate-900 mb-6">Questions fréquentes</h2>
            <div className="space-y-6">
              <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm">
                <h3 className="text-lg font-semibold mb-2">Quels types de documents puis-je utiliser ?</h3>
                <p className="text-slate-600">
                  Notre système prend en charge une large gamme de formats, notamment PDF, Word, Excel, PowerPoint,
                  HTML, Markdown et texte brut. Nous pouvons également nous connecter à des bases de données et des API.
                </p>
              </div>

              <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm">
                <h3 className="text-lg font-semibold mb-2">Mes données sont-elles sécurisées ?</h3>
                <p className="text-slate-600">
                  Absolument. Vos documents restent privés et ne sont jamais partagés. Nous utilisons un chiffrement de
                  bout en bout et respectons les normes de sécurité les plus strictes pour protéger vos informations.
                </p>
              </div>

              <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm">
                <h3 className="text-lg font-semibold mb-2">Comment puis-je commencer ?</h3>
                <p className="text-slate-600">
                  C'est simple ! Inscrivez-vous, téléchargez vos documents et commencez à poser des questions. Notre
                  système indexera automatiquement vos documents et vous pourrez immédiatement interagir avec eux.
                </p>
              </div>
            </div>
          </section>
          <section className="mb-16">
           <h2 className="text-2xl font-bold text-slate-900 mb-6">Nous contacter</h2>
           <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm">
            <p className="text-slate-600 mb-4">
              Pour toute question, demande d'information ou assistance, vous pouvez nous contacter aux adresses suivantes :
            </p>
            <ul className="text-slate-600 list-disc pl-5 space-y-2">
             <li>✉️ Rabab HANZAZ – <a href="mailto:jean.dupont@example.com" className="text-blue-600 hover:underline">hanzazrabab4@gmail.com</a></li>
             <li>✉️ Yasmina El HAFI – <a href="mailto:marie.curie@example.com" className="text-blue-600 hover:underline">Yasminaelhafi2@gmail.com</a></li>
             <li>✉️ Oumaima LOUALI – <a href="mailto:alain.turing@example.com" className="text-blue-600 hover:underline">Loualioumaima13@gmail.com</a></li>
            </ul>
           </div>
          </section>




          <div className="text-center">
            <Link href="/signup">
              <Button size="lg" className="px-8">
                Commencer maintenant
              </Button>
            </Link>
          </div>
        </div>
      </main>

      <footer className="bg-white border-t border-slate-200 py-8">
        <div className="container mx-auto px-4 text-center text-sm text-slate-500">
          <p>© 2025 RAGBot. Tous droits réservés.</p>
        </div>
      </footer>
    </div>
  )
}
