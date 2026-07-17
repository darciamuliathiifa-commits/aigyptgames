import express, {
  type Express,
  type Request,
  type Response,
  type NextFunction,
} from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors({ origin: true, credentials: true }));
app.use(cookieParser());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

// JSON 404 for unknown /api/* routes (instead of Express HTML page)
app.use("/api", (_req: Request, res: Response) => {
  res.status(404).json({ error: "Not found" });
});

// Global error handler — turns any thrown/rejected error (including missing
// env vars) into readable JSON instead of crashing the serverless function,
// which would otherwise surface as an opaque FUNCTION_INVOCATION_FAILED.
app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
  const status = Number(err?.statusCode ?? err?.status ?? 500);
  const message =
    err?.expose || status < 500
      ? String(err?.message ?? "Request error")
      : String(err?.message ?? "Internal server error");

  try {
    (req as any).log?.error({ err }, "Unhandled request error");
  } catch {
    // logging must never take down the handler
  }

  if (!res.headersSent) {
    res.status(Number.isFinite(status) ? status : 500).json({ error: message });
  }
});

export default app;
