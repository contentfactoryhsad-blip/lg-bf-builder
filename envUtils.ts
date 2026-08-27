import fs from 'node:fs';
import path from 'node:path';

/**
 * Resolve the Anthropic API key for the runtime AI endpoint
 * (gallery-slide-text). Checks process.env first (Railway / inline shell var),
 * then falls back to .env.local / .env in the project root so local dev works
 * with a one-time setup instead of prefixing every `npm run dev`.
 * No dotenv dependency — parses simple KEY=VALUE lines.
 */
export function getAnthropicApiKey(): string | undefined {
  const fromEnv = process.env.ANTHROPIC_API_KEY || process.env.VITE_ANTHROPIC_API_KEY;
  if (fromEnv) return fromEnv;
  for (const file of ['.env.local', '.env']) {
    try {
      const txt = fs.readFileSync(path.resolve(process.cwd(), file), 'utf8');
      const m = txt.match(/^\s*(?:VITE_)?ANTHROPIC_API_KEY\s*=\s*("?)([^"\r\n]+)\1\s*$/m);
      if (m) return m[2].trim();
    } catch { /* file absent — keep looking */ }
  }
  return undefined;
}
