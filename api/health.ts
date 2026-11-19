import type { IncomingMessage, ServerResponse } from "node:http";

type VercelResponse = ServerResponse & {
  status: (code: number) => VercelResponse;
  json: (data: unknown) => void;
};

export default function handler(_req: IncomingMessage, res: VercelResponse) {
  res.status(200).json({
    ok: true,
    hasApiKey: Boolean(process.env.GEMINI_API_KEY),
    transport: "ephemeral",
  });
}
