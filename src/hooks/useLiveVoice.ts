import { useCallback, useEffect, useRef, useState } from "react";

export type VoiceLanguage = "fr" | "en" | "es";
export type VoicePersona = "Kore" | "Zephyr";
export type ConnectionStatus = "idle" | "connecting" | "connected" | "error";

export interface TranscriptEntry {
  id: string;
  speaker: "user" | "assistant";
  text: string;
}

type TransportMode = "ws" | "ephemeral";

function float32ToBase64Pcm16(
  input: Float32Array,
  inputSampleRate: number,
  targetSampleRate = 16000
): string {
  let samples = input;

  if (inputSampleRate !== targetSampleRate) {
    const ratio = inputSampleRate / targetSampleRate;
    const newLength = Math.max(1, Math.floor(input.length / ratio));
    const resampled = new Float32Array(newLength);
    for (let i = 0; i < newLength; i++) {
      const srcIndex = i * ratio;
      const idx0 = Math.floor(srcIndex);
      const idx1 = Math.min(idx0 + 1, input.length - 1);
      const frac = srcIndex - idx0;
      resampled[i] = input[idx0] * (1 - frac) + input[idx1] * frac;
    }
    samples = resampled;
  }

  const buffer = new ArrayBuffer(samples.length * 2);
  const view = new DataView(buffer);
  for (let i = 0; i < samples.length; i++) {
    const clamped = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(i * 2, clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff, true);
  }

  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

function base64Pcm16ToFloat32(base64: string): Float32Array {
  const binary = atob(base64);
  const byteLength = binary.length;
  const bytes = new Uint8Array(byteLength);
  for (let i = 0; i < byteLength; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  const sampleCount = Math.floor(byteLength / 2);
  const float32 = new Float32Array(sampleCount);
  const view = new DataView(bytes.buffer);
  for (let i = 0; i < sampleCount; i++) {
    float32[i] = view.getInt16(i * 2, true) / 32768;
  }
  return float32;
}

async function decodeWsData(data: unknown): Promise<string> {
  if (typeof data === "string") return data;
  if (data instanceof Blob) return data.text();
  if (data instanceof ArrayBuffer) return new TextDecoder().decode(data);
  return "";
}

function getDefaultGreeting(language: VoiceLanguage): string {
  if (language === "en") {
    return "The visitor just started the voice conversation. Greet them briefly and warmly in English as Maud, Marion Server's voice assistant.";
  }
  if (language === "es") {
    return "El visitante acaba de iniciar la conversación de voz. Salúdale brevemente y con amabilidad en español como Maud, la asistente de voz de Marion Server.";
  }
  return "Le visiteur vient de lancer la conversation vocale. Accueille-le chaleureusement et brièvement en français en te présentant comme Maud, l'assistante vocale de Marion Server.";
}

export function useLiveVoice() {
  const [status, setStatus] = useState<ConnectionStatus>("idle");
  const [isMuted, setIsMuted] = useState(false);
  const [isAssistantSpeaking, setIsAssistantSpeaking] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);

  const wsRef = useRef<WebSocket | null>(null);
  const transportModeRef = useRef<TransportMode>("ws");
  const inputAudioCtxRef = useRef<AudioContext | null>(null);
  const outputAudioCtxRef = useRef<AudioContext | null>(null);
  const outputAnalyserRef = useRef<AnalyserNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const activeSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const nextStartTimeRef = useRef<number>(0);

  const isMutedRef = useRef(false);
  const isConnectedRef = useRef(false);
  const inputLevelRef = useRef(0);
  const pendingPromptRef = useRef<string | null>(null);
  const activeSpeakerRef = useRef<"user" | "assistant" | null>(null);

  const clearScheduledPlayback = useCallback(() => {
    for (const source of activeSourcesRef.current) {
      try {
        source.stop();
      } catch {
        // Already stopped
      }
    }
    activeSourcesRef.current.clear();
    if (outputAudioCtxRef.current) {
      nextStartTimeRef.current = outputAudioCtxRef.current.currentTime;
    } else {
      nextStartTimeRef.current = 0;
    }
    setIsAssistantSpeaking(false);
  }, []);

  const cleanupResources = useCallback(() => {
    isConnectedRef.current = false;
    pendingPromptRef.current = null;
    inputLevelRef.current = 0;
    activeSpeakerRef.current = null;

    clearScheduledPlayback();

    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current.onaudioprocess = null;
      processorRef.current = null;
    }

    if (mediaStreamRef.current) {
      for (const track of mediaStreamRef.current.getTracks()) {
        track.stop();
      }
      mediaStreamRef.current = null;
    }

    if (inputAudioCtxRef.current) {
      void inputAudioCtxRef.current.close();
      inputAudioCtxRef.current = null;
    }

    if (outputAudioCtxRef.current) {
      void outputAudioCtxRef.current.close();
      outputAudioCtxRef.current = null;
    }
    outputAnalyserRef.current = null;

    if (wsRef.current) {
      try {
        wsRef.current.close();
      } catch {
        // Ignore close error
      }
      wsRef.current = null;
    }

    setIsMuted(false);
    isMutedRef.current = false;
  }, [clearScheduledPlayback]);

  const stopSession = useCallback(() => {
    cleanupResources();
    setStatus("idle");
  }, [cleanupResources]);

  const appendTranscript = useCallback(
    (speaker: "user" | "assistant", chunk: string) => {
      const cleaned = chunk;
      if (!cleaned) return;

      setTranscript((prev) => {
        if (
          prev.length > 0 &&
          activeSpeakerRef.current === speaker &&
          prev[prev.length - 1].speaker === speaker
        ) {
          const updated = [...prev];
          updated[updated.length - 1] = {
            ...updated[updated.length - 1],
            text: updated[updated.length - 1].text + cleaned,
          };
          return updated;
        }
        activeSpeakerRef.current = speaker;
        return [
          ...prev,
          {
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            speaker,
            text: cleaned.trimStart(),
          },
        ];
      });
    },
    []
  );

  const playAudioChunk = useCallback((base64Audio: string) => {
    const ctx = outputAudioCtxRef.current;
    const analyser = outputAnalyserRef.current;
    if (!ctx || !analyser) return;

    if (ctx.state === "suspended") {
      void ctx.resume();
    }

    const float32 = base64Pcm16ToFloat32(base64Audio);
    if (float32.length === 0) return;

    const audioBuffer = ctx.createBuffer(1, float32.length, 24000);
    audioBuffer.getChannelData(0).set(float32);

    const source = ctx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(analyser);

    const startTime = Math.max(ctx.currentTime, nextStartTimeRef.current);
    source.start(startTime);
    nextStartTimeRef.current = startTime + audioBuffer.duration;

    activeSourcesRef.current.add(source);
    setIsAssistantSpeaking(true);

    source.onended = () => {
      activeSourcesRef.current.delete(source);
      if (activeSourcesRef.current.size === 0) {
        setIsAssistantSpeaking(false);
      }
    };
  }, []);

  const sendWireText = useCallback(
    (ws: WebSocket, text: string) => {
      if (transportModeRef.current === "ephemeral") {
        ws.send(JSON.stringify({ realtimeInput: { text } }));
      } else {
        ws.send(JSON.stringify({ text }));
      }
    },
    []
  );

  const sendWireAudio = useCallback((ws: WebSocket, base64Audio: string) => {
    if (transportModeRef.current === "ephemeral") {
      ws.send(
        JSON.stringify({
          realtimeInput: {
            audio: {
              data: base64Audio,
              mimeType: "audio/pcm;rate=16000",
            },
          },
        })
      );
    } else {
      ws.send(JSON.stringify({ audio: base64Audio }));
    }
  }, []);

  const sendTextPrompt = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      const ws = wsRef.current;
      if (!ws || ws.readyState !== WebSocket.OPEN) return;

      activeSpeakerRef.current = null;
      setTranscript((prev) => [
        ...prev,
        {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          speaker: "user",
          text: trimmed,
        },
      ]);
      sendWireText(ws, trimmed);
    },
    [sendWireText]
  );

  const startSession = useCallback(
    async (
      language: VoiceLanguage,
      voice: VoicePersona = "Kore",
      initialPrompt?: string
    ) => {
      cleanupResources();
      setErrorMessage(null);
      setStatus("connecting");
      pendingPromptRef.current = initialPrompt ?? null;

      if (!navigator.mediaDevices?.getUserMedia) {
        setErrorMessage(
          "L'accès au microphone n'est pas pris en charge par ce navigateur."
        );
        setStatus("error");
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });
        mediaStreamRef.current = stream;

        const inputCtx = new AudioContext({ sampleRate: 16000 });
        inputAudioCtxRef.current = inputCtx;

        const outputCtx = new AudioContext({ sampleRate: 24000 });
        outputAudioCtxRef.current = outputCtx;
        nextStartTimeRef.current = outputCtx.currentTime;

        const analyser = outputCtx.createAnalyser();
        analyser.fftSize = 128;
        analyser.connect(outputCtx.destination);
        outputAnalyserRef.current = analyser;

        // Detect whether the host supports local WebSocket proxy (AI Studio / Node)
        // or serverless ephemeral tokens (Vercel).
        let mode: TransportMode = "ephemeral";
        try {
          const healthRes = await fetch("/api/health");
          if (healthRes.ok) {
            const health = (await healthRes.json()) as {
              transport?: string;
              hasApiKey?: boolean;
            };
            if (health.hasApiKey === false) {
              throw new Error(
                "La variable d'environnement GEMINI_API_KEY n'est pas configurée sur le serveur."
              );
            }
            if (health.transport === "ws") {
              mode = "ws";
            }
          }
        } catch (healthErr) {
          if (
            healthErr instanceof Error &&
            healthErr.message.includes("GEMINI_API_KEY")
          ) {
            throw healthErr;
          }
          mode = "ephemeral";
        }

        transportModeRef.current = mode;

        let wsUrl: string;
        let setupModel = "models/gemini-3.8-live";

        if (mode === "ws") {
          const wsProtocol =
            window.location.protocol === "https:" ? "wss:" : "ws:";
          wsUrl = `${wsProtocol}//${window.location.host}/live?lang=${language}&voice=${voice}`;
        } else {
          const tokenRes = await fetch("/api/live-token", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ lang: language, voice }),
          });
          const tokenData = (await tokenRes.json()) as {
            token?: string;
            model?: string;
            error?: string;
          };
          if (!tokenRes.ok || !tokenData.token) {
            throw new Error(
              tokenData.error ||
                "Impossible d'obtenir un jeton de session Gemini Live."
            );
          }
          if (tokenData.model) setupModel = tokenData.model;
          wsUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContentConstrained?access_token=${encodeURIComponent(tokenData.token)}`;
        }

        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        const attachAudioProcessor = () => {
          const source = inputCtx.createMediaStreamSource(stream);
          const processor = inputCtx.createScriptProcessor(4096, 1, 1);
          const silentGain = inputCtx.createGain();
          silentGain.gain.value = 0;

          source.connect(processor);
          processor.connect(silentGain);
          silentGain.connect(inputCtx.destination);
          processorRef.current = processor;

          processor.onaudioprocess = (event) => {
            if (
              !isConnectedRef.current ||
              isMutedRef.current ||
              ws.readyState !== WebSocket.OPEN
            ) {
              inputLevelRef.current = 0;
              return;
            }

            const channel = event.inputBuffer.getChannelData(0);
            let sum = 0;
            for (let i = 0; i < channel.length; i++) {
              sum += channel[i] * channel[i];
            }
            const rms = Math.sqrt(sum / channel.length);
            inputLevelRef.current = Math.min(1, rms * 5);

            const base64Audio = float32ToBase64Pcm16(
              channel,
              inputCtx.sampleRate,
              16000
            );
            sendWireAudio(ws, base64Audio);
          };
        };

        const markSessionReady = () => {
          isConnectedRef.current = true;
          setStatus("connected");
          if (pendingPromptRef.current) {
            const promptToSend = pendingPromptRef.current;
            pendingPromptRef.current = null;
            sendWireText(ws, promptToSend);
          } else {
            sendWireText(ws, getDefaultGreeting(language));
          }
        };

        ws.onopen = () => {
          attachAudioProcessor();
          if (mode === "ephemeral") {
            ws.send(JSON.stringify({ setup: { model: setupModel } }));
          }
        };

        ws.onmessage = async (event) => {
          try {
            const rawText = await decodeWsData(event.data);
            if (!rawText) return;
            const msg = JSON.parse(rawText) as {
              // Proxy WS format
              status?: string;
              audio?: string;
              inputTranscript?: string;
              outputTranscript?: string;
              interrupted?: boolean;
              turnComplete?: boolean;
              error?: string;
              // Direct Gemini Live BidiGenerateContent format
              setupComplete?: unknown;
              serverContent?: {
                inputTranscription?: { text?: string };
                outputTranscription?: { text?: string };
                modelTurn?: {
                  parts?: Array<{ inlineData?: { data?: string } }>;
                };
                interrupted?: boolean;
                turnComplete?: boolean;
              };
            };

            if (msg.error) {
              cleanupResources();
              setErrorMessage(msg.error);
              setStatus("error");
              return;
            }

            if (msg.status === "connected" || msg.setupComplete) {
              if (!isConnectedRef.current) {
                markSessionReady();
              }
              return;
            }

            if (msg.status === "disconnected") {
              stopSession();
              return;
            }

            if (mode === "ws") {
              if (msg.inputTranscript) {
                appendTranscript("user", msg.inputTranscript);
              }
              if (msg.outputTranscript) {
                appendTranscript("assistant", msg.outputTranscript);
              }
              if (msg.audio) {
                playAudioChunk(msg.audio);
              }
              if (msg.interrupted) {
                clearScheduledPlayback();
                activeSpeakerRef.current = null;
              }
              if (msg.turnComplete) {
                activeSpeakerRef.current = null;
              }
            } else if (msg.serverContent) {
              const sc = msg.serverContent;
              if (sc.inputTranscription?.text) {
                appendTranscript("user", sc.inputTranscription.text);
              }
              if (sc.outputTranscription?.text) {
                appendTranscript("assistant", sc.outputTranscription.text);
              }
              for (const part of sc.modelTurn?.parts ?? []) {
                if (part.inlineData?.data) {
                  playAudioChunk(part.inlineData.data);
                }
              }
              if (sc.interrupted) {
                clearScheduledPlayback();
                activeSpeakerRef.current = null;
              }
              if (sc.turnComplete) {
                activeSpeakerRef.current = null;
              }
            }
          } catch {
            // Ignore unparseable messages
          }
        };

        ws.onerror = () => {
          cleanupResources();
          setErrorMessage(
            "La connexion temps réel avec Gemini Live a été interrompue."
          );
          setStatus("error");
        };

        ws.onclose = (event) => {
          if (isConnectedRef.current) {
            stopSession();
          } else if (wsRef.current === ws) {
            cleanupResources();
            const reason = event.reason
              ? ` (${event.reason})`
              : event.code
                ? ` (code ${event.code})`
                : "";
            setErrorMessage(
              `La connexion vocale avec Gemini Live a été fermée${reason}.`
            );
            setStatus("error");
          }
        };
      } catch (err) {
        const message =
          err instanceof Error && err.name === "NotAllowedError"
            ? "L'accès au microphone a été refusé. Veuillez l'autoriser dans votre navigateur pour parler avec Maud."
            : err instanceof Error && err.message
              ? err.message
              : "Impossible d'accéder au microphone ou d'établir la session vocale.";
        cleanupResources();
        setErrorMessage(message);
        setStatus("error");
      }
    },
    [
      appendTranscript,
      cleanupResources,
      clearScheduledPlayback,
      playAudioChunk,
      sendWireAudio,
      sendWireText,
      stopSession,
    ]
  );

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev;
      isMutedRef.current = next;
      return next;
    });
  }, []);

  const clearTranscript = useCallback(() => {
    setTranscript([]);
  }, []);

  const getAudioLevels = useCallback((): { input: number; output: number } => {
    let output = 0;
    const analyser = outputAnalyserRef.current;
    if (analyser && activeSourcesRef.current.size > 0) {
      const data = new Uint8Array(analyser.frequencyBinCount);
      analyser.getByteFrequencyData(data);
      let sum = 0;
      for (let i = 0; i < data.length; i++) {
        sum += data[i];
      }
      output = Math.min(1, sum / (data.length * 140));
    }
    return {
      input: isMutedRef.current ? 0 : inputLevelRef.current,
      output,
    };
  }, []);

  useEffect(() => {
    return () => {
      stopSession();
    };
  }, [stopSession]);

  return {
    status,
    isMuted,
    isAssistantSpeaking,
    errorMessage,
    transcript,
    startSession,
    stopSession,
    toggleMute,
    sendTextPrompt,
    clearTranscript,
    getAudioLevels,
  };
}
