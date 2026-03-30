// Vercel Serverless Function — Notion API Proxy
// Solves CORS: browser → /api/notion → api.notion.com → browser
//
// Usage: POST /api/notion
// Body: { endpoint: "/search", method: "POST", body: {...}, token: "ntn_..." }

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { endpoint, method = 'POST', body, token } = req.body;

    if (!endpoint || !token) {
      return res.status(400).json({ error: 'Missing endpoint or token' });
    }

    const notionUrl = `https://api.notion.com/v1${endpoint}`;

    const fetchOpts = {
      method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json',
      },
    };

    if (body && method !== 'GET') {
      fetchOpts.body = JSON.stringify(body);
    }

    const resp = await fetch(notionUrl, fetchOpts);
    const data = await resp.json();

    return res.status(resp.status).json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Proxy error' });
  }
}
