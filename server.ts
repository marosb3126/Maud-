import "dotenv/config";
import express from "express";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { WebSocketServer, WebSocket } from "ws";
import { GoogleGenAI, Modality } from "@google/genai";
import type { LiveServerMessage } from "@google/genai";
import { buildSystemInstruction } from "./lib/maudPrompt.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);

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
