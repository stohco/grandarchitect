/**
 * LLM Provider — DeepSeek API client for the Grand Architect.
 *
 * The GA and all text-generation paths use DeepSeek
 * (https://api.deepseek.com, OpenAI-compatible). Vision stays on gemma-4
 * (Google) and sound is procedural synthesis — only text reasoning runs
 * through DeepSeek.
 *
 * Config (env, all optional):
 *   DEEPSEEK_API_KEY  — required for real answers (else callers fall back)
 *   DEEPSEEK_MODEL    — default "deepseek-chat"
 *   DEEPSEEK_BASE_URL — default "https://api.deepseek.com"
 */

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

const BASE = process.env.DEEPSEEK_BASE_URL ?? 'https://api.deepseek.com';
const MODEL = process.env.DEEPSEEK_MODEL ?? 'deepseek-v4-flash';

export function deepseekConfigured(): boolean {
  return Boolean(process.env.DEEPSEEK_API_KEY);
}

/** One DeepSeek chat completion. Returns null when unconfigured or on failure. */
export async function askDeepSeek(
  messages: ChatMessage[],
  opts?: { maxTokens?: number; temperature?: number },
): Promise<string | null> {
  const key = process.env.DEEPSEEK_API_KEY;
  if (!key) return null;
  try {
    const res = await fetch(`${BASE}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: MODEL,
        messages,
        max_tokens: opts?.maxTokens ?? 900,
        temperature: opts?.temperature ?? 0.7,
      }),
      signal: AbortSignal.timeout(60_000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    return data.choices?.[0]?.message?.content ?? null;
  } catch {
    return null;
  }
}

/** Convenience: system + user, returns trimmed text or null. */
export async function askDeepSeekSimple(system: string, user: string): Promise<string | null> {
  return askDeepSeek([
    { role: 'system', content: system },
    { role: 'user', content: user },
  ]);
}
