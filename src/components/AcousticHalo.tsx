import { useEffect, useRef } from "react";
import type { ConnectionStatus } from "../hooks/useLiveVoice";

interface AcousticHaloProps {
  status: ConnectionStatus;
  isAssistantSpeaking: boolean;
  isMuted: boolean;
  getAudioLevels: () => { input: number; output: number };
}

export function AcousticHalo({
  status,
  isAssistantSpeaking,
  isMuted,
  getAudioLevels,
}: AcousticHaloProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    let animationId = 0;
    let phase = 0;
    let smoothLevel = 0;

    const render = () => {
      const dpr = window.devicePixelRatio || 1;
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
        canvas.width = width * dpr;
        canvas.height = height * dpr;
      }

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, width, height);

      const cx = width / 2;
      const cy = height / 2;
      const { input, output } = getAudioLevels();
      const targetLevel =
        status === "connected"
          ? Math.max(output, isMuted ? 0 : input)
          : status === "connecting"
            ? 0.15
            : 0;

      smoothLevel += (targetLevel - smoothLevel) * 0.16;
      if (!prefersReducedMotion) {
        phase += status === "connected" ? 0.035 + smoothLevel * 0.05 : 0.012;
      }

      const baseRadius = Math.min(width, height) * 0.28;
      const ringCount = 3;

      for (let r = 0; r < ringCount; r++) {
        const ringRatio = 1 + r * 0.24;
        const amplitude =
          status === "connected"
            ? (3 + smoothLevel * 18) * (1 - r * 0.2)
            : status === "connecting"
              ? 2
              : 0.8;

        ctx.beginPath();
        const steps = 96;
        for (let i = 0; i <= steps; i++) {
          const angle = (i / steps) * Math.PI * 2;
          const wave =
            Math.sin(angle * 3 + phase + r * 1.1) * amplitude * 0.6 +
            Math.cos(angle * 5 - phase * 1.3 + r) * amplitude * 0.4;
          const radius = baseRadius * ringRatio + wave;
          const x = cx + Math.cos(angle) * radius;
          const y = cy + Math.sin(angle) * radius;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();

        if (r === 0) {
          ctx.strokeStyle =
            status === "connected"
              ? isAssistantSpeaking
                ? "rgba(122, 70, 52, 0.85)"
                : "rgba(35, 29, 25, 0.72)"
              : "rgba(111, 98, 88, 0.35)";
          ctx.lineWidth = 1.5;
        } else if (r === 1) {
          ctx.strokeStyle =
            status === "connected"
              ? "rgba(122, 70, 52, 0.32)"
              : "rgba(111, 98, 88, 0.18)";
          ctx.lineWidth = 1;
        } else {
          ctx.strokeStyle =
            status === "connected"
              ? "rgba(122, 70, 52, 0.14)"
              : "rgba(111, 98, 88, 0.09)";
          ctx.lineWidth = 1;
        }
        ctx.stroke();
      }

      // Inner warm fill circle
      ctx.beginPath();
      ctx.arc(
        cx,
        cy,
        Math.max(12, baseRadius * 0.72 + smoothLevel * 6),
        0,
        Math.PI * 2
      );
      ctx.fillStyle =
        status === "connected"
          ? isAssistantSpeaking
            ? "rgba(122, 70, 52, 0.08)"
            : "rgba(35, 29, 25, 0.04)"
          : "rgba(111, 98, 88, 0.04)";
      ctx.fill();

      ctx.restore();
      animationId = requestAnimationFrame(render);
    };

    animationId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animationId);
  }, [getAudioLevels, isAssistantSpeaking, isMuted, status]);

  return (
    <div className="relative flex items-center justify-center w-full h-44 select-none">
      <canvas
        ref={canvasRef}
        className="w-full h-full block"
        aria-hidden="true"
      />
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="font-serif text-2xl tracking-tight text-[#231D19]">
          Maud
        </span>
        <span className="mt-0.5 text-[11px] tracking-wide text-[#6F6258]">
          {status === "idle" && "Prête à vous répondre"}
          {status === "connecting" && "Connexion vocale…"}
          {status === "error" && "Session interrompue"}
          {status === "connected" &&
            (isAssistantSpeaking
              ? "Vous répond…"
              : isMuted
                ? "Micro coupé"
                : "À votre écoute")}
        </span>
      </div>
    </div>
  );
}
