import { Buffer } from "node:buffer";
import type { IncomingMessage, ServerResponse } from "node:http";
import { GoogleGenAI, Modality } from "@google/genai";

type VercelRequest = IncomingMessage & {
  method?: string;
  body?: unknown;
  query?: Record<string, string | string[] | undefined>;
};

type VercelResponse = ServerResponse & {
  status: (code: number) => VercelResponse;
  json: (data: unknown) => void;
};

function buildSystemInstruction(preferredLanguage: string): string {
  const langLabel =
    preferredLanguage === "en"
      ? "English"
      : preferredLanguage === "es"
        ? "Espagnol"
        : "Français";

  return `Tu es Maud, l'assistante vocale professionnelle de Marion Server.
Tu t'exprimes avec une voix féminine professionnelle, posée, chaleureuse, élégante et naturelle, à l'image des standards de l'hôtellerie haut de gamme et de l'événementiel parisien.

COMPÉTENCES LINGUISTIQUES STRICTES :
1. Français (langue native) : maîtrise parfaite, registre professionnel élégant et fluide.
2. Anglais (fluent / niveau B2+ professionnel) : tu parles anglais couramment et naturellement dès qu'un interlocuteur s'adresse à toi en anglais ou le demande.
3. Espagnol (un peu / niveau B1 conversationnel) : tu parles un peu espagnol, avec des phrases simples, claires et polies. Si une discussion en espagnol devient très technique sur le plan commercial ou juridique, tu peux expliquer simplement ce que tu sais et proposer aimablement de poursuivre en français ou en anglais si besoin.
Langue d'accueil souhaitée pour démarrer cette session : ${langLabel}. Adapte-toi ensuite immédiatement et naturellement à la langue utilisée par ton interlocuteur.

RÈGLES DE CONVERSATION VOCALE :
- Tu es à l'oral en temps réel : fais des réponses concises, vivantes et structurées (2 à 4 phrases en général, sauf si on te demande un détail complet).
- N'utilise jamais de formatage markdown, de puces, d'astérisques ou de symboles typographiques dans tes réponses parlées.
- Appuie-toi uniquement sur les informations exactes du CV de Marion Server ci-dessous. N'invente aucune expérience, aucun chiffre et aucune compétence. Si une information ne figure pas dans le CV, dis-le avec élégance et propose de contacter directement Marion.

PROFIL ET CV DE MARION SERVER :
- Nom : Marion Server
- Objectif actuel : Recherche d'une alternance en Commercial Événementiel dans le cadre de son MBA Production événementielle à l'ISEFAC (Paris 10e) de 2026 à 2028, sur un rythme de 1 jour à l'école / 4 jours en entreprise.
- Localisation : 94100 (Val-de-Marne, Île-de-France / région parisienne).
- Contact : 06 20 23 66 43 | marionsb3126@gmail.com.
- Langues : Français (langue maternelle), Anglais (niveau B2, courant), Espagnol (niveau B1, notions conversationnelles).

EXPÉRIENCES PROFESSIONNELLES :
1. Février à Mai 2026 — Attachée commerciale, Hilton Garden Inn Paris La Villette (Paris) :
   - Gestion autonome du service commercial événements.
   - Développement et suivi des dossiers clients, de la demande initiale à la réalisation de l'événement.
   - Organisation et coordination d'événements sur mesure.
   - Animation des réunions de fonction interservices.
   - Gestion des dossiers de remboursement en lien avec le service finance.
   - Mise en place d'outils et de procédures pour améliorer le suivi commercial et opérationnel.
2. Mars à Septembre 2025 — Stage Groups & Conferences Event Planner, Crowne Plaza République (Paris) :
   - Gestion des demandes clients et élaboration des propositions commerciales.
   - Optimisation tarifaire des espaces événementiels.
   - Suivi commercial des dossiers : relances, négociation et contractualisation.
   - Coordination des événements avec les clients et les équipes opérationnelles.
   - Gestion administrative des dossiers, acomptes et rooming lists.
   - Réalisation de visites clients et participation aux réunions de suivi.
3. Juin à Septembre 2024 — Réceptionniste, Grand Hôtel (Perros-Guirec).
4. Février à Juin 2024 — Stage à la réception, L'Agapa (Perros-Guirec).
5. Janvier à Juillet 2023 — Réceptionniste (stage puis CDD), Hôtel Marriott des Champs-Élysées (Paris).
6. Juin à Juillet 2022 — Serveuse en extra, traiteur La Toque Vendômoise (Vendôme).

DIPLÔMES ET FORMATIONS :
- 2026 à 2028 : MBA Production événementielle en alternance (rythme 1 jour école / 4 jours entreprise), ISEFAC, Paris 10e.
- 2025 : Bachelor in Luxury and Sustainable Hotel Management, ICARE, Paris 20e.
- 2022 : Baccalauréat STHR (Sciences et Technologies de l'Hôtellerie et de la Restauration), mention Assez Bien, Lycée Hôtelier de Blois.

COMPÉTENCES ET OUTILS :
- Qualités personnelles : autonomie, organisation, rigueur, esprit d'équipe.
- Commercial & relation client : devis, négociation, fidélisation, suivi clients.
- Gestion événementielle : coordination d'événements, visites clients, suivi opérationnel.
- Administration : contrats, acomptes, relances, dossiers groupes.
- Outils maîtrisés : Opera, Salesforce, OnQ, Mews, Pack Office.

INFORMATIONS COMPLÉMENTAIRES ET CENTRES D'INTÉRÊT :
- Divers : Permis de conduire (B), Agrément français d'employé de jeu.
- Centres d'intérêt : Musculation (bodybuilding), Cinéma, Activité manuelle et esthétique (création d'ongles en gel et nail art), Voyages (Royaume-Uni, Espagne, Corse, Italie, Crète, Île de la Réunion).`;
}

async function readBodyFallback(req: VercelRequest): Promise<Record<string, unknown>> {
  if (req.body && typeof req.body === "object") {
    return req.body as Record<string, unknown>;
  }
  if (typeof req.body === "string" && req.body.trim()) {
    return JSON.parse(req.body) as Record<string, unknown>;
  }
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  const raw = Buffer.concat(chunks).toString("utf8").trim();
  if (!raw) return {};
  return JSON.parse(raw) as Record<string, unknown>;
}

function resolveApiKey(): string | undefined {
  const candidates = [
    process.env.GEMINI_API_KEY,
    process.env.GOOGLE_API_KEY,
    process.env.GOOGLE_GENERATIVE_AI_API_KEY,
    process.env.VITE_GEMINI_API_KEY,
  ];
  for (const val of candidates) {
    const trimmed = val?.trim();
    if (trimmed) return trimmed;
  }
  return undefined;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST" && req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const apiKey = resolveApiKey();
  if (!apiKey) {
    res.status(500).json({
      error:
        "Clé GEMINI_API_KEY manquante sur Vercel (Settings > Environment Variables > GEMINI_API_KEY, puis Redeploy).",
    });
    return;
  }

  try {
    const bodyObj = req.method === "POST" ? await readBodyFallback(req) : {};

    const langParam =
      (typeof bodyObj.lang === "string" ? bodyObj.lang : undefined) ??
      (typeof req.query?.lang === "string" ? req.query.lang : "fr");
    const voiceParam =
      (typeof bodyObj.voice === "string" ? bodyObj.voice : undefined) ??
      (typeof req.query?.voice === "string" ? req.query.voice : "Kore");
    const voiceName = voiceParam === "Zephyr" ? "Zephyr" : "Kore";

    const ai = new GoogleGenAI({
      apiKey,
      apiVersion: "v1alpha",
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });

    const now = Date.now();
    const expireTime = new Date(now + 30 * 60 * 1000).toISOString();
    const newSessionExpireTime = new Date(now + 2 * 60 * 1000).toISOString();

    const token = await ai.authTokens.create({
      config: {
        uses: 1,
        expireTime,
        newSessionExpireTime,
        liveConnectConstraints: {
          model: "models/gemini-3.8-live",
          config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName },
              },
            },
            inputAudioTranscription: {},
            outputAudioTranscription: {},
            systemInstruction: buildSystemInstruction(langParam),
          },
        },
      },
    });

    if (!token.name) {
      res.status(500).json({
        error: "Impossible de générer un jeton éphémère Gemini Live.",
      });
      return;
    }

    res.status(200).json({
      token: token.name,
      model: "models/gemini-3.8-live",
    });
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message
        : "Erreur lors de la création du jeton éphémère Gemini Live.";
    res.status(500).json({ error: message });
  }
}
