import { useEffect, useRef, useState } from "react";
import {
  Mic,
  MicOff,
  PhoneOff,
  Send,
  Volume2,
  AlertCircle,
  RotateCcw,
} from "lucide-react";
import { SUGGESTED_PROMPTS } from "../data/cvData";
import {
  useLiveVoice,
  type VoiceLanguage,
  type VoicePersona,
} from "../hooks/useLiveVoice";
import { AcousticHalo } from "./AcousticHalo";

interface VoiceConsoleProps {
  selectedLanguage: VoiceLanguage;
  onSelectLanguage: (lang: VoiceLanguage) => void;
  externalTriggerCount: number;
}

const LANGUAGE_LABELS: Record<VoiceLanguage, { label: string; hint: string }> = {
  fr: { label: "Français", hint: "Langue native" },
  en: { label: "English", hint: "Fluent (B2)" },
  es: { label: "Español", hint: "Notions (B1)" },
};

export function VoiceConsole({
  selectedLanguage,
  onSelectLanguage,
  externalTriggerCount,
}: VoiceConsoleProps) {
  const {
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
  } = useLiveVoice();

  const [voicePersona, setVoicePersona] = useState<VoicePersona>("Kore");
  const [textInput, setTextInput] = useState("");
  const transcriptEndRef = useRef<HTMLDivElement | null>(null);
  const lastTriggerRef = useRef(externalTriggerCount);

  useEffect(() => {
    if (externalTriggerCount !== lastTriggerRef.current) {
      lastTriggerRef.current = externalTriggerCount;
      if (status === "idle" || status === "error") {
        void startSession(selectedLanguage, voicePersona);
      }
    }
  }, [externalTriggerCount, selectedLanguage, startSession, status, voicePersona]);

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcript]);

  const handleLanguageChange = (lang: VoiceLanguage) => {
    onSelectLanguage(lang);
    if (status === "connected") {
      const transitionPrompt =
        lang === "en"
          ? "Please switch to English now and briefly invite the visitor to continue in English."
          : lang === "es"
            ? "Por favor, continúa ahora hablando un poco en español sencillo y amable."
            : "Repassons maintenant au français et invite brièvement l'interlocuteur à poursuivre.";
      sendTextPrompt(transitionPrompt);
    }
  };

  const handleSuggestedPrompt = (lang: VoiceLanguage, prompt: string) => {
    onSelectLanguage(lang);
    if (status === "connected") {
      sendTextPrompt(prompt);
    } else {
      void startSession(lang, voicePersona, prompt);
    }
  };

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!textInput.trim()) return;
    if (status === "connected") {
      sendTextPrompt(textInput);
      setTextInput("");
    } else {
      const prompt = textInput;
      setTextInput("");
      void startSession(selectedLanguage, voicePersona, prompt);
    }
  };

  const isSessionActive = status === "connected" || status === "connecting";

  return (
    <section
      id="assistant"
      aria-label="Console vocale Maud"
      className="flex flex-col justify-between bg-[#F3ECE2] border border-[#E2D6C5] rounded-2xl p-6 md:p-8"
    >
      {/* Top row: language selector + voice timbre */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-[#E4D8C8]">
        <div
          className="inline-flex items-center gap-1 p-1 bg-[#EAE0D3] rounded-lg"
          role="group"
          aria-label="Langue de conversation"
        >
          {(["fr", "en", "es"] as VoiceLanguage[]).map((lang) => {
            const active = selectedLanguage === lang;
            return (
              <button
                key={lang}
                type="button"
                onClick={() => handleLanguageChange(lang)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7A4634] ${
                  active
                    ? "bg-[#FAF6F0] text-[#231D19] shadow-xs"
                    : "text-[#6F6258] hover:text-[#231D19]"
                }`}
              >
                {LANGUAGE_LABELS[lang].label}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2 text-xs text-[#6F6258]">
          <Volume2 className="w-3.5 h-3.5 text-[#7A4634]" aria-hidden="true" />
          <label htmlFor="voice-timbre-select" className="sr-only">
            Timbre de voix féminine
          </label>
          <select
            id="voice-timbre-select"
            value={voicePersona}
            disabled={isSessionActive}
            onChange={(e) => setVoicePersona(e.target.value as VoicePersona)}
            className="bg-transparent text-xs font-medium text-[#231D19] focus:outline-none disabled:opacity-60 cursor-pointer"
          >
            <option value="Kore">Voix posée (Kore)</option>
            <option value="Zephyr">Voix claire (Zephyr)</option>
          </select>
        </div>
      </div>

      {/* Center acoustic halo & primary voice controls */}
      <div className="py-5 flex flex-col items-center">
        <AcousticHalo
          status={status}
          isAssistantSpeaking={isAssistantSpeaking}
          isMuted={isMuted}
          getAudioLevels={getAudioLevels}
        />

        <p className="mt-1 text-xs text-[#6F6258] text-center">
          {LANGUAGE_LABELS[selectedLanguage].label} ·{" "}
          {LANGUAGE_LABELS[selectedLanguage].hint}
        </p>

        {/* Primary controls */}
        <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
          {!isSessionActive ? (
            <button
              type="button"
              onClick={() => void startSession(selectedLanguage, voicePersona)}
              className="inline-flex items-center gap-2.5 px-6 py-3 text-sm font-medium text-[#FAF6F0] bg-[#231D19] rounded-xl hover:bg-[#3A302A] transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7A4634]"
            >
              <Mic className="w-4 h-4" aria-hidden="true" />
              <span>Démarrer l'échange vocal</span>
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={toggleMute}
                disabled={status !== "connected"}
                className={`inline-flex items-center gap-2 px-4 py-2.5 text-xs font-medium rounded-xl border transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7A4634] ${
                  isMuted
                    ? "bg-[#7A4634] text-[#FAF6F0] border-[#7A4634]"
                    : "bg-[#FAF6F0] text-[#231D19] border-[#D4C5B3] hover:bg-[#EAE0D3]"
                }`}
              >
                {isMuted ? (
                  <>
                    <MicOff className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Réactiver le micro</span>
                  </>
                ) : (
                  <>
                    <Mic className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Couper le micro</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={stopSession}
                className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-medium text-[#FAF6F0] bg-[#7A4634] rounded-xl hover:bg-[#623728] transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#231D19]"
              >
                <PhoneOff className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Terminer</span>
              </button>
            </>
          )}
        </div>

        {errorMessage && (
          <div
            role="alert"
            className="mt-4 w-full flex items-start gap-2.5 px-4 py-3 text-xs text-[#6B2D22] bg-[#FAF6F0] border border-[#D8B4AC] rounded-xl"
          >
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
            <p className="leading-relaxed">{errorMessage}</p>
          </div>
        )}
      </div>

      {/* Live transcript area */}
      <div className="border-t border-[#E4D8C8] pt-4">
        <div className="flex items-center justify-between mb-2.5">
          <span className="text-xs font-medium text-[#6F6258]">
            Transcription en direct
          </span>
          {transcript.length > 0 && (
            <button
              type="button"
              onClick={clearTranscript}
              className="inline-flex items-center gap-1 text-xs text-[#6F6258] hover:text-[#231D19] transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" aria-hidden="true" />
              <span>Effacer</span>
            </button>
          )}
        </div>

        <div className="h-36 overflow-y-auto pr-1 space-y-2.5 text-sm leading-relaxed">
          {transcript.length === 0 ? (
            <p className="text-xs text-[#6F6258] italic py-4">
              Démarrez l'échange vocal ou choisissez une question ci-dessous pour
              entendre Maud présenter le parcours de Marion Server.
            </p>
          ) : (
            transcript.map((entry) => (
              <div key={entry.id} className="text-xs leading-relaxed">
                <span className="font-medium text-[#7A4634] mr-1.5">
                  {entry.speaker === "assistant" ? "Maud :" : "Vous :"}
                </span>
                <span className="text-[#231D19]">{entry.text}</span>
              </div>
            ))
          )}
          <div ref={transcriptEndRef} />
        </div>

        {/* Optional text prompt input */}
        <form onSubmit={handleTextSubmit} className="mt-3 flex items-center gap-2">
          <input
            type="text"
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            placeholder={
              selectedLanguage === "en"
                ? "Ask Maud a question in English…"
                : selectedLanguage === "es"
                  ? "Haz una pregunta a Maud en español…"
                  : "Poser une question par écrit à Maud…"
            }
            className="flex-1 min-w-0 px-3.5 py-2 text-xs bg-[#FAF6F0] text-[#231D19] placeholder:text-[#8E8075] border border-[#DFD2C2] rounded-lg focus:outline-none focus:border-[#7A4634]"
          />
          <button
            type="submit"
            aria-label="Envoyer la question"
            className="inline-flex items-center justify-center w-9 h-9 bg-[#231D19] text-[#FAF6F0] rounded-lg hover:bg-[#3A302A] transition-colors shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7A4634]"
          >
            <Send className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        </form>

        {/* Suggested prompts */}
        <div className="mt-3 pt-3 border-t border-[#E4D8C8] flex flex-wrap gap-x-4 gap-y-1.5">
          {SUGGESTED_PROMPTS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => handleSuggestedPrompt(item.language, item.prompt)}
              className="text-xs text-[#6F6258] hover:text-[#7A4634] underline decoration-[#D4C5B3] underline-offset-4 transition-colors cursor-pointer whitespace-nowrap"
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
