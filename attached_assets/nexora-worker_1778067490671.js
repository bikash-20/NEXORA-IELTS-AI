/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║        NEXORA — Cloudflare AI Worker Proxy v3.0                 ║
 * ║  + /ai       endpoint: AI chat completions                      ║
 * ║  + /podcast  endpoint: AI script generation                     ║
 * ║  + /tts      endpoint: Text-to-Speech via CF MeloTTS            ║
 * ║  + /image    endpoint: AI image generation                      ║
 * ║  + /search   endpoint: Web search (DDG + Wikipedia)             ║
 * ╚══════════════════════════════════════════════════════════════════╝
 *
 * BINDINGS REQUIRED (Workers → Settings → Variables & Bindings):
 *   AI  → Workers AI binding (free)
 *
 * ROUTES:
 *   GET  /              → health check
 *   GET  /health        → health check
 *   POST /ai            → AI chat completions
 *   POST /podcast       → Generate podcast script from topic or text
 *   POST /tts           → Text-to-Speech → returns audio/wav binary
 *   POST /image         → AI image generation → returns image/png
 *   POST /search        → Web search (DuckDuckGo + Wikipedia fallback)
 */

// ── Constants ────────────────────────────────────────────────────────
const TTS_MAX_CHARS    = 500;
const SEARCH_TIMEOUT   = 8_000;
const SEARCH_MAX       = 10;
const IMAGE_MAX_DIM    = 1024;
const IMAGE_MIN_DIM    = 256;
const IMAGE_MIN_STEPS  = 10;
const IMAGE_MAX_STEPS  = 30;
const SCRIPT_MAX_CHARS = 3_500;

// ── AI Models ────────────────────────────────────────────────────────
const CF_LLAMA_70B  = '@cf/meta/llama-3.3-70b-instruct-fp8-fast';
const CF_LLAMA_8B   = '@cf/meta/llama-3.1-8b-instruct';
const CF_MISTRAL_7B = '@cf/mistral/mistral-7b-instruct-v0.2';
const CF_GEMMA_12B  = '@cf/google/gemma-3-12b-it';
const CF_DEEPSEEK   = '@cf/deepseek-ai/deepseek-r1-distill-qwen-32b';
const CF_TTS        = '@cf/myshell-ai/melotts';

const MODEL_CONFIGS = {
  'cf-claude': {
    primary:   CF_LLAMA_70B,
    fallbacks: [CF_LLAMA_8B, CF_MISTRAL_7B],
    label:     'CF Claude (Llama 70B)',
  },
  'cf-llama': {
    primary:   CF_LLAMA_70B,
    fallbacks: [CF_LLAMA_8B],
    label:     'CF Llama 3.3 70B',
  },
  'cf-qwen': {
    primary:   CF_LLAMA_8B,
    fallbacks: [CF_MISTRAL_7B],
    label:     'CF Qwen (Llama 8B)',
  },
  'cf-gemma': {
    primary:   CF_GEMMA_12B,
    fallbacks: [CF_LLAMA_8B, CF_MISTRAL_7B],
    label:     'CF Gemma 3 12B',
  },
  'cf-mistral': {
    primary:   CF_MISTRAL_7B,
    fallbacks: [CF_LLAMA_8B],
    label:     'CF Mistral 7B',
  },
  'cf-deepseek': {
    primary:   CF_DEEPSEEK,
    fallbacks: [CF_LLAMA_70B, CF_LLAMA_8B],
    label:     'CF DeepSeek R1',
  },
};

const MODEL_MAX_TOKENS = {
  [CF_LLAMA_70B]:  768,
  [CF_LLAMA_8B]:   768,
  [CF_MISTRAL_7B]: 768,
  [CF_DEEPSEEK]:   1_536,
  [CF_GEMMA_12B]:  768,
};

const SCRIPT_MODELS = [CF_LLAMA_70B, CF_LLAMA_8B];
const SCRIPT_TOKENS = 2_048;

const IMAGE_MODELS = [
  '@cf/bytedance/stable-diffusion-xl-lightning',
  '@cf/runwayml/stable-diffusion-v1-5-inpainting',
  '@cf/lykon/dreamshaper-8-lcm',
];

const IMAGE_BLOCKED_KEYWORDS = [
  'nude', 'naked', 'nsfw', 'porn', 'explicit',
  'violence', 'gore', 'blood',
];

// ── Router ───────────────────────────────────────────────────────────
export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') return corsResponse(null, 204);

    const url = new URL(request.url);

    if (request.method === 'GET') {
      if (url.pathname === '/' || url.pathname === '/health') {
        return handleHealth();
      }
    }

    if (request.method === 'POST') {
      switch (url.pathname) {
        case '/ai':      return handleAI(request, env);
        case '/podcast': return handlePodcast(request, env);
        case '/tts':     return handleTTS(request, env);
        case '/image':   return handleImage(request, env);
        case '/search':  return handleSearch(request, env);
      }
    }

    return jsonResponse({ error: 'Not found' }, 404);
  },
};

// ── Health ────────────────────────────────────────────────────────────
function handleHealth() {
  return jsonResponse({
    status:    'ok',
    worker:    'Nexora CF AI Proxy v3.0',
    endpoints: ['/ai', '/podcast', '/tts', '/image', '/search'],
    models:    Object.keys(MODEL_CONFIGS),
    timestamp: new Date().toISOString(),
  });
}

// ══════════════════════════════════════════════════════════════════════
//  /ai — Chat completions with multi-model fallback
// ══════════════════════════════════════════════════════════════════════
async function handleAI(request, env) {
  if (!env.AI) return missingBinding();

  let body;
  try { body = await request.json(); }
  catch { return jsonResponse({ error: 'Invalid JSON body' }, 400); }

  const { model: alias, messages, max_tokens, temperature } = body;

  if (!Array.isArray(messages) || messages.length === 0)
    return jsonResponse({ error: 'messages must be a non-empty array' }, 400);

  const meta  = MODEL_CONFIGS[alias] ?? MODEL_CONFIGS['cf-llama'];
  const chain = [meta.primary, ...(meta.fallbacks ?? [])];

  const system = messages.find(m => m.role === 'system');
  const chats  = messages.filter(m => m.role !== 'system');
  const all    = system
    ? [{ role: 'system', content: system.content }, ...chats]
    : chats;

  let lastErr = 'Unknown error';

  for (const cfModel of chain) {
    try {
      const result = await env.AI.run(cfModel, {
        messages:    all,
        max_tokens:  max_tokens ?? MODEL_MAX_TOKENS[cfModel] ?? 768,
        temperature: temperature ?? 0.7,
      });

      const text = extractText(result);
      if (text.length > 2) {
        return jsonResponse({
          id:      'cf-' + Date.now(),
          object:  'chat.completion',
          model:   cfModel,
          choices: [{ index: 0, message: { role: 'assistant', content: text }, finish_reason: 'stop' }],
          usage:   { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
          _nexora: { alias, cfModel, label: meta.label },
        });
      }
      lastErr = `${cfModel} returned an empty response`;

    } catch (e) {
      lastErr = e?.message ?? String(e);
      if (isRateLimitError(lastErr))
        return jsonResponse({ error: 'Daily free limit reached. Resets at midnight UTC.' }, 429);
      if (isOverloadedError(lastErr)) continue;
    }
  }

  return jsonResponse({ error: 'All models failed', tried: chain, last_error: lastErr }, 502);
}

// ══════════════════════════════════════════════════════════════════════
//  /podcast — Generate a 2-voice podcast script
//
//  Body:    { topic?, text?, style?: 'dialogue'|'monologue', length?: 'short'|'medium'|'long' }
//  Returns: { ok, script, lines, title, summary, model, length, style, truncated }
// ══════════════════════════════════════════════════════════════════════
async function handlePodcast(request, env) {
  if (!env.AI) return missingBinding();

  let body;
  try { body = await request.json(); }
  catch { return jsonResponse({ error: 'Invalid JSON' }, 400); }

  const { topic, text, style = 'dialogue', length = 'medium' } = body;
  if (!topic && !text)
    return jsonResponse({ error: 'Provide either topic or text' }, 400);

  const lengthGuide = {
    short:  '3–4 minutes',
    medium: '6–8 minutes',
    long:   '10–12 minutes',
  }[length] ?? '6–8 minutes';

  let inputSection = '';
  let truncated    = false;

  if (text?.trim().length > 20) {
    const safe  = text.trim();
    truncated   = safe.length > SCRIPT_MAX_CHARS;
    inputSection = `The student has uploaded these notes/document:\n\n"""\n${safe.slice(0, SCRIPT_MAX_CHARS)}\n"""\n\nConvert all key concepts from these notes into the podcast script.`;
  } else {
    inputSection = `Topic: "${topic}"`;
  }

  const styleGuide = style === 'dialogue'
    ? `Write as a friendly dialogue between two people:\n- HOST: an enthusiastic, knowledgeable teacher (warm, clear, uses analogies)\n- STUDENT: a curious student who asks the questions everyone is thinking\nFormat EVERY line strictly as:\nHOST: <text>\nSTUDENT: <text>\nNo other prefixes. No stage directions. No asterisks.`
    : `Write as a single-voice narration. Format every line as:\nHOST: <text>`;

  const systemPrompt = `You are a world-class educational podcast scriptwriter. You create engaging, clear, memorable audio lessons that feel like listening to a brilliant friend explain something.`;

  const userPrompt = `${inputSection}

Create a ${lengthGuide} educational podcast script about this topic.
${styleGuide}

Structure:
1. Hook opening — grab attention in the first 10 seconds with a question or surprising fact
2. Introduction — what we're learning today and why it matters
3. Core concepts — explained step by step using simple language and relatable analogies
4. Real-world examples — at least 2 concrete, vivid examples
5. Common misconceptions — address 1-2 things people get wrong
6. Quick recap — key takeaways in 3 bullet-point style sentences
7. Outro — friendly sign-off with encouragement

Tone: conversational, friendly, smart but not condescending. Simple English. Short sentences.
Do NOT include music cues, sound effects, or stage directions.
Do NOT use markdown formatting — plain text only.
Start directly with the first HOST line.`;

  let lastErr = '';

  for (const cfModel of SCRIPT_MODELS) {
    try {
      const result = await env.AI.run(cfModel, {
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user',   content: userPrompt },
        ],
        max_tokens:  SCRIPT_TOKENS,
        temperature: 0.72,
      });

      const rawScript = extractText(result);
      if (rawScript.length < 50) {
        lastErr = `${cfModel} returned an empty script`;
        continue;
      }

      const lines     = parseScript(rawScript);
      const title     = topic ? `📻 ${topic}` : '📻 Study Podcast';
      const firstHost = lines.find(l => l.speaker === 'HOST');
      const summary   = firstHost
        ? firstHost.text.slice(0, 120) + (firstHost.text.length > 120 ? '…' : '')
        : '';

      return jsonResponse({
        ok: true, title, summary,
        script: rawScript, lines,
        model: cfModel, length, style, truncated,
      });

    } catch (e) {
      lastErr = e?.message ?? String(e);
      if (isRateLimitError(lastErr))
        return jsonResponse({ error: 'Daily free limit reached. Resets at midnight UTC.' }, 429);
    }
  }

  return jsonResponse({ error: 'Script generation failed', last_error: lastErr }, 502);
}

function parseScript(raw) {
  const lines    = [];
  const rawLines = raw.split('\n').map(l => l.trim()).filter(Boolean);

  for (const line of rawLines) {
    if (line.startsWith('HOST:')) {
      const text = line.slice('HOST:'.length).trim();
      if (text) lines.push({ speaker: 'HOST', text });
    } else if (line.startsWith('STUDENT:')) {
      const text = line.slice('STUDENT:'.length).trim();
      if (text) lines.push({ speaker: 'STUDENT', text });
    }
    // Drop unrecognized lines (model disclaimers, stage directions, etc.)
  }

  // Fallback: model ignored the format — treat all lines as HOST
  if (lines.length === 0) {
    for (const line of rawLines) {
      if (line.length > 10) lines.push({ speaker: 'HOST', text: line });
    }
  }

  return lines;
}

// ══════════════════════════════════════════════════════════════════════
//  /tts — Text-to-Speech via Cloudflare MeloTTS
//
//  Body:    { text: string }
//  Returns: audio/wav binary  (or JSON 502 with hint on failure)
//
//  Notes:
//  - MeloTTS returns base64-encoded WAV (not MP3 despite docs saying MP3)
//  - lang must be 'en-US' — bare 'en' is unreliable
//  - Frontend detects WAV vs MP3 from magic bytes, so Content-Type is advisory
// ══════════════════════════════════════════════════════════════════════
async function handleTTS(request, env) {
  if (!env.AI) return missingBinding();

  let body;
  try { body = await request.json(); }
  catch { return jsonResponse({ error: 'Invalid JSON' }, 400); }

  const rawText = (body?.text ?? '').trim();
  if (!rawText) return jsonResponse({ error: 'text is required' }, 400);

  const truncated = rawText.length > TTS_MAX_CHARS;
  const safeText  = rawText.slice(0, TTS_MAX_CHARS);

  try {
    const result = await env.AI.run(CF_TTS, {
      prompt: safeText,
      lang:   'en-US',   // must be full locale — bare 'en' fails silently
    });

    // MeloTTS returns the base64 string directly as the result value
    // (confirmed by CF community: plain string, not { audio: "..." })
    const audioB64 = typeof result === 'string'
      ? result
      : (result?.audio ?? result?.result?.audio ?? '');

    if (!audioB64 || audioB64.length < 50) {
      return ttsUnavailable('TTS returned empty audio');
    }

    const audioBytes = Uint8Array.from(atob(audioB64), c => c.charCodeAt(0));

    if (audioBytes.length < 100) {
      return ttsUnavailable('TTS audio too short');
    }

    return new Response(audioBytes, {
      status: 200,
      headers: {
        ...CORS_HEADERS,
        'Content-Type':    'audio/wav',   // MeloTTS outputs WAV
        'Content-Length':  String(audioBytes.length),
        'Cache-Control':   'no-store',
        'X-TTS-Truncated': String(truncated),
      },
    });

  } catch (e) {
    return ttsUnavailable(e?.message);
  }
}

// ══════════════════════════════════════════════════════════════════════
//  /image — AI Image Generation (Stable Diffusion via CF)
//
//  Body:    { prompt: string, width?: number, height?: number, steps?: number }
//  Returns: image/png binary  (or JSON error)
// ══════════════════════════════════════════════════════════════════════
async function handleImage(request, env) {
  if (!env.AI) return missingBinding();

  let body;
  try { body = await request.json(); }
  catch { return jsonResponse({ error: 'Invalid JSON' }, 400); }

  const { prompt, width = 512, height = 512, steps = 20 } = body;
  if (!prompt?.trim()) return jsonResponse({ error: 'prompt is required' }, 400);

  const lower = prompt.toLowerCase();
  if (IMAGE_BLOCKED_KEYWORDS.some(w => lower.includes(w)))
    return jsonResponse({ error: 'Prompt contains disallowed content.' }, 400);

  const safeWidth  = clamp(width,  IMAGE_MIN_DIM, IMAGE_MAX_DIM);
  const safeHeight = clamp(height, IMAGE_MIN_DIM, IMAGE_MAX_DIM);
  const safeSteps  = clamp(steps,  IMAGE_MIN_STEPS, IMAGE_MAX_STEPS);
  const enhanced   = `${prompt.trim()}, high quality, detailed, professional`;

  let lastErr = '';

  for (const modelId of IMAGE_MODELS) {
    try {
      const result = await env.AI.run(modelId, {
        prompt:    enhanced,
        width:     safeWidth,
        height:    safeHeight,
        num_steps: safeSteps,
      });

      if (!result) { lastErr = `${modelId} returned empty result`; continue; }

      const imageBytes = await readableToUint8Array(result);
      if (!imageBytes || imageBytes.length < 100) {
        lastErr = `${modelId} returned too-small image`;
        continue;
      }

      return new Response(imageBytes, {
        status: 200,
        headers: {
          'Content-Type':                'image/png',
          'Content-Length':              String(imageBytes.length),
          'X-Model-Used':                modelId,
          'Access-Control-Allow-Origin': '*',
          'Cache-Control':               'public, max-age=3600',
        },
      });

    } catch (e) {
      lastErr = e?.message ?? String(e);
    }
  }

  return jsonResponse({
    error:      'Image generation failed',
    last_error: lastErr,
    hint:       'CF image models may not be available in your Worker region.',
  }, 502);
}

// ══════════════════════════════════════════════════════════════════════
//  /search — Web search (DuckDuckGo → Wikipedia fallback)
//
//  Body:    { query: string, maxResults?: number }
//  Returns: { ok, results, summary, query, total, source, timestamp }
// ══════════════════════════════════════════════════════════════════════
async function handleSearch(request, env) {
  let body;
  try { body = await request.json(); }
  catch { return jsonResponse({ error: 'Invalid JSON' }, 400); }

  const { query, maxResults = 5 } = body;
  if (!query?.trim()) return jsonResponse({ error: 'query is required' }, 400);

  const safeQuery = query.trim().slice(0, 200);
  const safeMax   = clamp(maxResults, 1, SEARCH_MAX);

  // Strategy 1: DuckDuckGo
  const ddgResults = await fetchDDG(safeQuery, safeMax);
  if (ddgResults.length > 0) {
    const summary = await aiSummarise(ddgResults, safeQuery, env);
    return jsonResponse({
      ok: true, query: safeQuery, total: ddgResults.length,
      results: ddgResults, summary, source: 'duckduckgo',
      timestamp: new Date().toISOString(),
    });
  }

  // Strategy 2: Wikipedia
  const wikiResults = await fetchWikipedia(safeQuery, safeMax);
  if (wikiResults.length > 0) {
    const summary = await aiSummarise(wikiResults, safeQuery, env);
    return jsonResponse({
      ok: true, query: safeQuery, total: wikiResults.length,
      results: wikiResults, summary, source: 'wikipedia',
      timestamp: new Date().toISOString(),
    });
  }

  return jsonResponse({
    ok: true, query: safeQuery, total: 0, results: [], summary: '',
    source: 'none', hint: 'No results found. Try a different search query.',
  });
}

async function fetchDDG(query, max) {
  try {
    const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Nexora AI/3.0 (educational assistant)' },
      signal:  AbortSignal.timeout(SEARCH_TIMEOUT),
    });
    if (!res.ok) return [];

    const data    = await res.json();
    const results = [];

    if (data.Abstract?.length > 20) {
      results.push({
        title:   data.Heading || query,
        url:     data.AbstractURL || ddgFallbackURL(query),
        snippet: data.Abstract.slice(0, 300),
        source:  'DuckDuckGo Abstract',
      });
    }

    for (const topic of (data.RelatedTopics ?? [])) {
      if (results.length >= max) break;
      if (topic.Text && topic.FirstURL) {
        results.push({
          title:   topic.Text.split(' - ')[0]?.slice(0, 80) || query,
          url:     topic.FirstURL,
          snippet: topic.Text.slice(0, 250),
          source:  'DuckDuckGo',
        });
      }
      for (const sub of (topic.Topics ?? [])) {
        if (results.length >= max) break;
        if (sub.Text && sub.FirstURL) {
          results.push({
            title:   sub.Text.split(' - ')[0]?.slice(0, 80) || query,
            url:     sub.FirstURL,
            snippet: sub.Text.slice(0, 250),
            source:  'DuckDuckGo',
          });
        }
      }
    }

    if (data.Answer && results.length === 0) {
      results.push({
        title:   `Answer: ${query}`,
        url:     ddgFallbackURL(query),
        snippet: String(data.Answer),
        source:  'DuckDuckGo Answer',
      });
    }

    if (data.Definition && results.length < max) {
      results.push({
        title:   `Definition: ${data.Heading || query}`,
        url:     data.DefinitionURL || ddgFallbackURL(query),
        snippet: data.Definition.slice(0, 300),
        source:  'DuckDuckGo Definition',
      });
    }

    return results.slice(0, max);
  } catch {
    return [];
  }
}

async function fetchWikipedia(query, max) {
  try {
    const url = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&srlimit=${max}&format=json&origin=*`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Nexora AI/3.0 (educational assistant)' },
      signal:  AbortSignal.timeout(SEARCH_TIMEOUT),
    });
    if (!res.ok) return [];

    const data  = await res.json();
    const items = data?.query?.search ?? [];

    return items.map(item => ({
      title:   item.title,
      url:     `https://en.wikipedia.org/wiki/${encodeURIComponent(item.title.replace(/ /g, '_'))}`,
      snippet: stripHtml(item.snippet).slice(0, 280),
      source:  'Wikipedia',
    }));
  } catch {
    return [];
  }
}

async function aiSummarise(results, query, env) {
  if (!env.AI) return '';
  try {
    const snippets = results.slice(0, 3)
      .map((r, i) => `${i + 1}. ${r.title}: ${r.snippet}`)
      .join('\n');
    const result = await env.AI.run(CF_LLAMA_8B, {
      messages: [
        { role: 'system', content: 'Summarise the search results in 2-3 clear, factual sentences.' },
        { role: 'user',   content: `Query: "${query}"\n\n${snippets}` },
      ],
      max_tokens:  150,
      temperature: 0.3,
    });
    return extractText(result);
  } catch {
    return '';
  }
}

// ── Utilities ─────────────────────────────────────────────────────────

function extractText(result) {
  return (result?.response ?? result?.result?.response ?? '').trim();
}

async function readableToUint8Array(result) {
  if (result instanceof ReadableStream) {
    const reader = result.getReader();
    const chunks = [];
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }
    const total  = chunks.reduce((a, c) => a + c.length, 0);
    const out    = new Uint8Array(total);
    let   offset = 0;
    for (const chunk of chunks) { out.set(chunk, offset); offset += chunk.length; }
    return out;
  }
  if (result instanceof ArrayBuffer) return new Uint8Array(result);
  if (result instanceof Uint8Array)  return result;
  const b64 = typeof result === 'string'
    ? result
    : (result?.audio ?? result?.result?.audio ?? '');
  if (!b64) return null;
  return Uint8Array.from(atob(b64), c => c.charCodeAt(0));
}

function clamp(val, min, max) {
  return Math.min(Math.max(Number(val) || 0, min), max);
}

function stripHtml(str) {
  return str
    .replace(/<[^>]+>/g, '')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function isRateLimitError(msg) {
  const low = (msg ?? '').toLowerCase();
  return low.includes('limit') || low.includes('quota') || low.includes('rate');
}

function isOverloadedError(msg) {
  const low = (msg ?? '').toLowerCase();
  return low.includes('unavailable') || low.includes('overloaded');
}

function ddgFallbackURL(query) {
  return `https://duckduckgo.com/?q=${encodeURIComponent(query)}`;
}

// ── Response helpers ──────────────────────────────────────────────────

const CORS_HEADERS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  });
}

function corsResponse(body, status = 200) {
  return new Response(body, { status, headers: CORS_HEADERS });
}

function missingBinding() {
  return jsonResponse({
    error: 'Workers AI binding (AI) is missing. Add it in Workers → Settings → Variables & Bindings.',
  }, 500);
}

function ttsUnavailable(detail) {
  return jsonResponse({
    error: detail ? `TTS failed: ${detail}` : 'TTS returned empty audio.',
    hint:  'The CF TTS model may not be available in your Worker region. The frontend will fall back to the Web Speech API.',
  }, 502);
}
