import type { IncomingMessage, ServerResponse } from "node:http";

type VercelResponse = ServerResponse & {
  status: (code: number) => VercelResponse;
  json: (data: unknown) => void;
};

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

export default function handler(_req: IncomingMessage, res: VercelResponse) {
  res.status(200).json({
    ok: true,
    hasApiKey: Boolean(resolveApiKey()),
    transport: "ephemeral",
  });
}
