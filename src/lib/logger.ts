/**
 * Minimal server-side logger.
 *
 * In production (Vercel), console.* output streams to Runtime Logs and is
 * searchable in the dashboard. In development, it prints to the terminal.
 * Deliberately not using a 3rd-party library — one less dep, fewer cold-start
 * seconds. If you later need Sentry/Axiom/Datadog, swap the impl here.
 */

type LogLevel = "info" | "warn" | "error";

interface LogPayload {
  route?: string;
  event: string;
  [key: string]: unknown;
}

function emit(level: LogLevel, payload: LogPayload): void {
  const line = JSON.stringify({ ts: new Date().toISOString(), level, ...payload });
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

export const log = {
  info: (payload: LogPayload) => emit("info", payload),
  warn: (payload: LogPayload) => emit("warn", payload),
  error: (payload: LogPayload) => emit("error", payload),
};
