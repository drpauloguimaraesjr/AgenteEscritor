// ─── Notion API Client ───
// Uses CORS proxy since Notion API doesn't allow browser-origin requests.
// User must create an Internal Integration at https://www.notion.so/my-integrations
// and share desired pages with the integration.

const NOTION_API = 'https://api.notion.com/v1';
const DEFAULT_PROXY = 'https://corsproxy.io/?';
const NOTION_VERSION = '2022-06-28';

function proxyUrl(url, proxy) {
  return (proxy || DEFAULT_PROXY) + encodeURIComponent(url);
}

function headers(token) {
  return {
    'Authorization': `Bearer ${token}`,
    'Notion-Version': NOTION_VERSION,
    'Content-Type': 'application/json',
  };
}

/**
 * Search Notion pages accessible by the integration.
 * @param {string} token - Internal Integration token
 * @param {string} query - search text (empty = list all)
 * @param {{ proxy?: string }} opts
 * @returns {Promise<NotionPage[]>}
 */
export async function searchNotionPages(token, query = '', { proxy } = {}) {
  const resp = await fetch(proxyUrl(`${NOTION_API}/search`, proxy), {
    method: 'POST',
    headers: headers(token),
    body: JSON.stringify({
      query,
      filter: { value: 'page', property: 'object' },
      page_size: 20,
      sort: { direction: 'descending', timestamp: 'last_edited_time' },
    }),
    signal: AbortSignal.timeout(10000),
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
 * @param {string} token
 * @param {string} pageId
 * @param {{ proxy?: string }} opts
 * @returns {Promise<string>} plain text content
 */
export async function fetchPageContent(token, pageId, { proxy } = {}) {
  const blocks = [];
  let cursor = undefined;
  let safety = 0;

  // Paginate through all blocks (max 5 pages = ~500 blocks)
  while (safety++ < 5) {
    const url = `${NOTION_API}/blocks/${pageId}/children?page_size=100${cursor ? `&start_cursor=${cursor}` : ''}`;
    const resp = await fetch(proxyUrl(url, proxy), {
      headers: headers(token),
      signal: AbortSignal.timeout(10000),
    });

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

    // Rich text blocks
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

    // Divider
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
