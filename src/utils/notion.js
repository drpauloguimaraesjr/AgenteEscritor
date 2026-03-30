// ─── Notion API Client ───
// Uses Vercel serverless proxy at /api/notion to bypass CORS.
// Fallback to direct CORS proxies if Vercel proxy unavailable (local dev).

const NOTION_VERSION = '2022-06-28';

/**
 * Call Notion API through our Vercel proxy.
 * Falls back to direct fetch with CORS proxy if proxy unavailable.
 */
async function notionFetch(endpoint, token, { method = 'GET', body, proxy } = {}) {
  // Try Vercel proxy first (works in production)
  try {
    const resp = await fetch('/api/notion', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endpoint, method, body, token }),
      signal: AbortSignal.timeout(15000),
    });
    if (resp.ok || resp.status === 401 || resp.status === 404) {
      return resp;
    }
  } catch {
    // Proxy unavailable (local dev) — try CORS fallback
  }

  // Fallback: direct with CORS proxy
  const corsProxy = proxy || 'https://corsproxy.io/?';
  const url = `https://api.notion.com/v1${endpoint}`;
  const fetchOpts = {
    method,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Notion-Version': NOTION_VERSION,
      'Content-Type': 'application/json',
    },
    signal: AbortSignal.timeout(12000),
  };
  if (body && method !== 'GET') fetchOpts.body = JSON.stringify(body);

  return fetch(corsProxy + encodeURIComponent(url), fetchOpts);
}

/**
 * Extract a Notion page ID from a URL or raw ID string.
 */
export function extractPageId(input) {
  if (!input) return '';
  const trimmed = input.trim();

  // Full URL: extract 32-char hex
  const urlMatch = trimmed.match(/([a-f0-9]{32})(?:\?|$)/i);
  if (urlMatch) return urlMatch[1];

  // UUID format
  const uuidMatch = trimmed.match(/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i);
  if (uuidMatch) return trimmed.replace(/-/g, '');

  // Raw 32-char hex
  if (/^[a-f0-9]{32}$/i.test(trimmed)) return trimmed;

  // Last resort
  const anyMatch = trimmed.match(/[a-f0-9]{32}/i);
  if (anyMatch) return anyMatch[0];

  return trimmed;
}

/**
 * Search Notion pages accessible by the integration.
 */
export async function searchNotionPages(token, query = '', { proxy } = {}) {
  const resp = await notionFetch('/search', token, {
    method: 'POST',
    body: {
      query,
      filter: { value: 'page', property: 'object' },
      page_size: 20,
      sort: { direction: 'descending', timestamp: 'last_edited_time' },
    },
    proxy,
  });

  if (!resp.ok) {
    if (resp.status === 401) throw new Error('Token Notion inválido ou expirado.');
    throw new Error(`Notion API: HTTP ${resp.status}`);
  }

  const { results } = await resp.json();

  return (results || []).map(page => {
    const titleProp = Object.values(page.properties || {}).find(p => p.type === 'title');
    const titleParts = titleProp?.title || [];
    const title = titleParts.map(t => t.plain_text).join('') || 'Sem título';

    return {
      id: page.id,
      title,
      url: page.url || '',
      lastEdited: page.last_edited_time || '',
      icon: page.icon?.emoji || '📄',
    };
  });
}

/**
 * Fetch the text content of a Notion page (all blocks).
 */
export async function fetchPageContent(token, pageIdOrUrl, { proxy } = {}) {
  const pageId = extractPageId(pageIdOrUrl);
  const blocks = [];
  let cursor = undefined;
  let safety = 0;

  while (safety++ < 5) {
    const endpoint = `/blocks/${pageId}/children?page_size=100${cursor ? `&start_cursor=${cursor}` : ''}`;
    const resp = await notionFetch(endpoint, token, { method: 'GET', proxy });

    if (!resp.ok) throw new Error(`Notion blocks: HTTP ${resp.status}`);
    const data = await resp.json();
    blocks.push(...(data.results || []));

    if (!data.has_more) break;
    cursor = data.next_cursor;
  }

  return blocksToText(blocks);
}

/** Extract plain text from Notion block objects */
function blocksToText(blocks) {
  return blocks.map(block => {
    const type = block.type;
    const data = block[type];
    if (!data) return '';

    const richText = data.rich_text || data.text;
    if (richText) {
      const text = richText.map(t => t.plain_text).join('');
      switch (type) {
        case 'heading_1': return `# ${text}`;
        case 'heading_2': return `## ${text}`;
        case 'heading_3': return `### ${text}`;
        case 'bulleted_list_item': return `• ${text}`;
        case 'numbered_list_item': return `- ${text}`;
        case 'quote': return `> ${text}`;
        case 'callout': return `💡 ${text}`;
        case 'toggle': return `▸ ${text}`;
        default: return text;
      }
    }

    if (type === 'divider') return '---';
    return '';
  }).filter(Boolean).join('\n');
}

/**
 * Truncate text to a max char count, keeping whole sentences.
 */
export function truncateForContext(text, maxChars = 3000) {
  if (text.length <= maxChars) return text;
  const cut = text.slice(0, maxChars);
  const lastPeriod = cut.lastIndexOf('.');
  return lastPeriod > maxChars * 0.5 ? cut.slice(0, lastPeriod + 1) : cut + '…';
}
