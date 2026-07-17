import pino from "pino";

// pino-pretty spawns a worker thread via a file path — that path does not
// survive serverless bundling/deployment and can crash the function at cold
// start. Only enable it for explicit local development, never on Vercel.
const usePretty =
  process.env.NODE_ENV === "development" && !process.env.VERCEL;

export const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
  redact: [
    "req.headers.authorization",
    "req.headers.cookie",
    "res.headers['set-cookie']",
  ],
  ...(usePretty
    ? {
        transport: {
          target: "pino-pretty",
          options: { colorize: true },
        },
      }
    : {}),
});
