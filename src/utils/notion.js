// ─── Notion API Client ───
// Uses CORS proxy since Notion API doesn't allow browser-origin requests.
// User must create an Internal Integration at https://www.notion.so/my-integrations
// and share desired pages with the integration.

const NOTION_API = 'https://api.notion.com/v1';
const NOTION_VERSION = '2022-06-28';

// Multiple proxy fallbacks — corsproxy.io can be unreliable
const PROXY_LIST = [
  'https://corsproxy.io/?',
  'https://api.allorigins.win/raw?url=',
  'https://cors-anywhere.herokuapp.com/',
];

function headers(token) {
  return {
    'Authorization': `Bearer ${token}`,
    'Notion-Version': NOTION_VERSION,
    'Content-Type': 'application/json',
  };
}

/**
 * Extract a Notion page ID from a URL or raw ID string.
 * Accepts:
 *   - Full URL: https://www.notion.so/My-Page-ffbedecaeb2d459b8bc03f56e0...
 *   - Raw 32-char hex: ffbedecaeb2d459b8bc03f56e012345
 *   - UUID format: ffbedeca-eb2d-459b-8bc0-3f56e012345
 */
export function extractPageId(input) {
  if (!input) return '';
  const trimmed = input.trim();

  // Try to extract 32-char hex from URL (last segment after -)
  const urlMatch = trimmed.match(/([a-f0-9]{32})(?:\?|$)/i);
  if (urlMatch) return urlMatch[1];

  // Try UUID format (remove dashes)
  const uuidMatch = trimmed.match(/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i);
  if (uuidMatch) return trimmed.replace(/-/g, '');

  // Already a raw 32-char hex?
  if (/^[a-f0-9]{32}$/i.test(trimmed)) return trimmed;

  // Last resort: try to find 32 hex chars anywhere in the string
  const anyMatch = trimmed.match(/[a-f0-9]{32}/i);
  if (anyMatch) return anyMatch[0];

  return trimmed; // return as-is, let the API fail with a clear error
}

/**
 * Fetch with proxy fallback — tries multiple proxies if the first fails.
 */
async function fetchWithProxy(url, options, customProxy) {
  if (customProxy) {
    const resp = await fetch(customProxy + encodeURIComponent(url), options);
    return resp;
  }

  let lastError;
  for (const proxy of PROXY_LIST) {
    try {
      const resp = await fetch(proxy + encodeURIComponent(url), {
        ...options,
        signal: AbortSignal.timeout(12000),
      });
      if (resp.ok || resp.status === 401 || resp.status === 404) return resp;
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError || new Error('Todos os proxies CORS falharam');
}

/**
 * Search Notion pages accessible by the integration.
 */
export async function searchNotionPages(token, query = '', { proxy } = {}) {
  const resp = await fetchWithProxy(`${NOTION_API}/search`, {
    method: 'POST',
    headers: headers(token),
    body: JSON.stringify({
      query,
      filter: { value: 'page', property: 'object' },
      page_size: 20,
      sort: { direction: 'descending', timestamp: 'last_edited_time' },
    }),
  }, proxy);

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
    const url = `${NOTION_API}/blocks/${pageId}/children?page_size=100${cursor ? `&start_cursor=${cursor}` : ''}`;
    const resp = await fetchWithProxy(url, {
      headers: headers(token),
    }, proxy);

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
