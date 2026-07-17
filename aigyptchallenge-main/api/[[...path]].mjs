// Vercel Serverless Function — catch-all /api/* handler.
// Plain .mjs on purpose: tidak ada compile step TypeScript, jadi crash
// "exports is not defined in ES module scope" tidak mungkin terjadi.
import mod from "./_bundled/app.cjs";

let app = mod?.default ?? mod;
for (let i = 0; i < 3 && app && typeof app !== "function" && app.default; i++) {
  app = app.default;
}

if (typeof app !== "function") {
  throw new Error("aigypt api: bundled Express app did not resolve to a function");
}

export default app;
