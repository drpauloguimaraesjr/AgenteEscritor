import { useEffect } from 'react';
import { useStore } from '../store/index.js';

export function useIPAgentHealth() {
  const agentUrl = useStore(s => s.agentUrl);
  const agentApiKey = useStore(s => s.agentApiKey);
  const setAgentStatus = useStore(s => s.setAgentStatus);

  useEffect(() => {
    let active = true;

    async function check() {
      if (!agentUrl) { setAgentStatus(false, 0); return; }
      try {
        const headers = {};
        if (agentApiKey) headers['Authorization'] = `Bearer ${agentApiKey}`;
        const r = await fetch(`${agentUrl}/api/content/health`, {
          headers,
          signal: AbortSignal.timeout(4000),
        });
        if (!active) return;
        if (r.ok) {
          const d = await r.json();
          setAgentStatus(true, d.doc_count ?? 0);
        } else {
          setAgentStatus(false, 0);
        }
      } catch {
        if (active) setAgentStatus(false, 0);
      }
    }

    check();
    const id = setInterval(check, 15000);
    return () => { active = false; clearInterval(id); };
  }, [agentUrl, agentApiKey, setAgentStatus]);
}

export async function searchKnowledge(agentUrl, agentApiKey, query, nResults = 5) {
  const headers = { 'Content-Type': 'application/json' };
  if (agentApiKey) headers['Authorization'] = `Bearer ${agentApiKey}`;
  const resp = await fetch(`${agentUrl}/api/knowledge/search`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ query, n_results: nResults }),
    signal: AbortSignal.timeout(8000),
  });
  if (!resp.ok) throw new Error(`Knowledge search: HTTP ${resp.status}`);
  return resp.json();
}
