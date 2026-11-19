import type { IncomingMessage, ServerResponse } from "node:http";
import { GoogleGenAI, Modality } from "@google/genai";
import { buildSystemInstruction } from "../lib/maudPrompt.js";

type VercelRequest = IncomingMessage & {
  method?: string;
  body?: unknown;
  query?: Record<string, string | string[] | undefined>;
};

type VercelResponse = ServerResponse & {
  status: (code: number) => VercelResponse;
  json: (data: unknown) => void;
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST" && req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    res.status(500).json({
      error:
        "Clé GEMINI_API_KEY manquante dans les variables d'environnement du serveur.",
    });
    return;
  }

  try {
    let bodyObj: Record<string, unknown> = {};
    if (req.body && typeof req.body === "object") {
      bodyObj = req.body as Record<string, unknown>;
    } else if (typeof req.body === "string" && req.body.trim()) {
      bodyObj = JSON.parse(req.body) as Record<string, unknown>;
    }

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
