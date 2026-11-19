import "dotenv/config";
import express from "express";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { WebSocketServer, WebSocket } from "ws";
import { GoogleGenAI, Modality } from "@google/genai";
import type { LiveServerMessage } from "@google/genai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);

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

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured on the server.");
  }
  return new GoogleGenAI({
    apiKey,
    apiVersion: "v1beta",
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

async function startServer() {
  const app = express();
  app.use(express.json());

  app.get("/api/health", (_req, res) => {
    res.json({
      ok: true,
      hasApiKey: Boolean(process.env.GEMINI_API_KEY),
      transport: "ws",
    });
  });

  app.post("/api/live-token", async (req, res) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        res.status(500).json({ error: "GEMINI_API_KEY is not configured." });
        return;
      }
      const lang = typeof req.body?.lang === "string" ? req.body.lang : "fr";
      const voice = req.body?.voice === "Zephyr" ? "Zephyr" : "Kore";

      const ai = new GoogleGenAI({
        apiKey,
        apiVersion: "v1alpha",
        httpOptions: { headers: { "User-Agent": "aistudio-build" } },
      });

      const now = Date.now();
      const token = await ai.authTokens.create({
        config: {
          uses: 1,
          expireTime: new Date(now + 30 * 60 * 1000).toISOString(),
          newSessionExpireTime: new Date(now + 2 * 60 * 1000).toISOString(),
          liveConnectConstraints: {
            model: "models/gemini-3.8-live",
            config: {
              responseModalities: [Modality.AUDIO],
              speechConfig: {
                voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } },
              },
              inputAudioTranscription: {},
              outputAudioTranscription: {},
              systemInstruction: buildSystemInstruction(lang),
            },
          },
        },
      });

      res.json({
        token: token.name,
        model: "models/gemini-3.8-live",
      });
    } catch (err) {
      res.status(500).json({
        error:
          err instanceof Error
            ? err.message
            : "Erreur lors de la création du jeton éphémère.",
      });
    }
  });

  if (process.env.NODE_ENV === "production") {
    const distDir = path.resolve(__dirname, "dist");
    app.use(express.static(distDir));
    app.get("/{*path}", (_req, res) => {
      res.sendFile(path.join(distDir, "index.html"));
    });
  } else {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  }

  const server = http.createServer(app);
  const wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", (request, socket, head) => {
    const url = new URL(request.url || "/", `http://${request.headers.host}`);
    if (url.pathname === "/live") {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit("connection", ws, request);
      });
    } else {
      socket.destroy();
    }
  });

  wss.on("connection", async (clientWs, request) => {
    const url = new URL(request.url || "/", `http://${request.headers.host}`);
    const lang = url.searchParams.get("lang") || "fr";
    const voiceParam = url.searchParams.get("voice");
    const voiceName = voiceParam === "Zephyr" ? "Zephyr" : "Kore";

    let session: Awaited<ReturnType<GoogleGenAI["live"]["connect"]>> | null =
      null;
    let closed = false;

    const safeSend = (payload: Record<string, unknown>) => {
      if (clientWs.readyState === WebSocket.OPEN) {
        clientWs.send(JSON.stringify(payload));
      }
    };

    try {
      const ai = getGeminiClient();

      session = await ai.live.connect({
        model: "gemini-3.8-live",
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName },
            },
          },
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          systemInstruction: buildSystemInstruction(lang),
        },
        callbacks: {
          onmessage: (message: LiveServerMessage) => {
            const content = message.serverContent;
            if (!content) return;

            if (content.inputTranscription?.text) {
              safeSend({
                inputTranscript: content.inputTranscription.text,
              });
            }

            if (content.outputTranscription?.text) {
              safeSend({
                outputTranscript: content.outputTranscription.text,
              });
            }

            for (const part of content.modelTurn?.parts ?? []) {
              if (part.inlineData?.data) {
                safeSend({ audio: part.inlineData.data });
              }
            }

            if (content.interrupted) {
              safeSend({ interrupted: true });
            }

            if (content.turnComplete) {
              safeSend({ turnComplete: true });
            }
          },
          onerror: (err: unknown) => {
            console.error("Gemini Live error:", err);
            const errObj = err as { message?: string; error?: { message?: string } };
            const msg =
              err instanceof Error
                ? err.message
                : errObj?.error?.message ||
                  errObj?.message ||
                  "Erreur de connexion avec Gemini Live.";
            safeSend({ error: msg });
          },
          onclose: () => {
            if (!closed) {
              safeSend({ status: "disconnected" });
            }
          },
        },
      });

      if (closed) {
        try {
          session.close();
        } catch {
          // Already closed
        }
        return;
      }

      safeSend({ status: "connected" });
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : "Impossible d'initialiser la session vocale.";
      safeSend({ error: msg });
      clientWs.close();
      return;
    }

    clientWs.on("message", (raw) => {
      if (!session || closed) return;
      try {
        const parsed = JSON.parse(raw.toString()) as {
          audio?: string;
          text?: string;
        };

        if (parsed.audio) {
          session.sendRealtimeInput({
            audio: {
              data: parsed.audio,
              mimeType: "audio/pcm;rate=16000",
            },
          });
        } else if (parsed.text) {
          session.sendRealtimeInput({
            text: parsed.text,
          });
        }
      } catch {
        // Ignore malformed JSON frames
      }
    });

    clientWs.on("close", () => {
      closed = true;
      try {
        session?.close();
      } catch {
        // Session already closed
      }
    });
  });

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server listening on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
