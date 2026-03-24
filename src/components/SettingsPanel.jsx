import { useState } from 'react';
import { useStore } from '../store/index.js';

const MODELS = [
  { value: 'anthropic/claude-sonnet-4-6',         label: 'Claude Sonnet 4.6 (recomendado)' },
  { value: 'anthropic/claude-opus-4-6',            label: 'Claude Opus 4.6 (máx qualidade)' },
  { value: 'anthropic/claude-haiku-4-5-20251001',  label: 'Claude Haiku 4.5 (rápido)' },
  { value: 'anthropic/claude-3.5-sonnet',          label: 'Claude 3.5 Sonnet' },
  { value: 'openai/gpt-4o',                        label: 'GPT-4o' },
];

export default function SettingsPanel({ onClose }) {
  const store = useStore();
  const [key,       setKey]       = useState(store.openrouterKey);
  const [model,     setModel]     = useState(store.openrouterModel);
  const [url,       setUrl]       = useState(store.agentUrl);
  const [apiKey,    setApiKey]    = useState(store.agentApiKey);
  const [pubmedKey,    setPubmedKey]    = useState(store.pubmedApiKey);
  const [notionToken,  setNotionToken]  = useState(store.notionToken);
  const [notionProxy,  setNotionProxy]  = useState(store.notionProxy);
  const [saved,        setSaved]        = useState(false);
  const [testResult,   setTestResult]   = useState('');
  const [testing,      setTesting]      = useState(false);

  function save() {
    store.saveSettings({ openrouterKey: key, openrouterModel: model, agentUrl: url, agentApiKey: apiKey });
    store.savePubmedApiKey(pubmedKey);
    store.saveNotionToken(notionToken);
    store.saveNotionProxy(notionProxy);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function testConnection() {
    setTesting(true);
    setTestResult('');
    const results = [];

    // Test IPAgent
    try {
      const r = await fetch(`${url || 'http://localhost:5050'}/api/content/health`, {
        signal: AbortSignal.timeout(4000),
      });
      if (r.ok) {
        const d = await r.json();
        results.push(`✅ IPAgent online — ${d.doc_count ?? '?'} docs`);
      } else {
        results.push(`⚠️ IPAgent respondeu com status ${r.status}`);
      }
    } catch {
      results.push('❌ IPAgent inacessível (verifique se está rodando)');
    }

    // Test PubMed
    try {
      const r = await fetch(
        `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=testosterone&retmax=1&retmode=json${pubmedKey ? `&api_key=${pubmedKey}` : ''}`,
        { signal: AbortSignal.timeout(5000) }
      );
      if (r.ok) results.push('✅ PubMed API acessível');
      else results.push('⚠️ PubMed: resposta inesperada');
    } catch {
      results.push('❌ PubMed inacessível');
    }

    // Test Notion (only if token set)
    if (notionToken) {
      try {
        const proxy = notionProxy || 'https://corsproxy.io/?';
        const r = await fetch(proxy + encodeURIComponent('https://api.notion.com/v1/search'), {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${notionToken}`,
            'Notion-Version': '2022-06-28',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ page_size: 1 }),
          signal: AbortSignal.timeout(8000),
        });
        if (r.ok) {
          const d = await r.json();
          const count = d.results?.length || 0;
          results.push(`✅ Notion: token válido (${count > 0 ? 'páginas encontradas' : 'nenhuma página compartilhada'})`);
        } else if (r.status === 401) {
          results.push('❌ Notion: token inválido');
        } else {
          results.push(`⚠️ Notion: resposta HTTP ${r.status}`);
        }
      } catch {
        results.push('❌ Notion: inacessível (verifique proxy CORS)');
      }
    } else {
      results.push('ℹ️ Notion: token não configurado');
    }

    // Test OpenRouter (only if key set)
    if (key) {
      try {
        const r = await fetch('https://openrouter.ai/api/v1/models', {
          headers: { Authorization: `Bearer ${key}` },
          signal: AbortSignal.timeout(5000),
        });
        if (r.ok) results.push('✅ OpenRouter: chave válida');
        else results.push('❌ OpenRouter: chave inválida ou sem crédito');
      } catch {
        results.push('❌ OpenRouter inacessível');
      }
    } else {
      results.push('ℹ️ OpenRouter: chave não configurada');
    }

    setTestResult(results.join('\n'));
    setTesting(false);
  }

  return (
    <div className="modal-bg open" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal" style={{ width: 500, maxWidth: '95vw' }}>
        <h3>⚙ Configurações</h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 20 }}>
          <Section title="OpenRouter / Claude API">
            <Field label="Chave da API (OpenRouter)">
              <input type="password" value={key} onChange={e => setKey(e.target.value)} placeholder="sk-or-..." />
            </Field>
            <Field label="Modelo">
              <select value={model} onChange={e => setModel(e.target.value)}>
                {MODELS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </Field>
          </Section>

          <Section title="IPAgent Local (RAG)">
            <Field label="URL do agente">
              <input value={url} onChange={e => setUrl(e.target.value)} placeholder="http://localhost:5050" />
            </Field>
            <Field label="Chave de acesso (opcional)">
              <input type="password" value={apiKey} onChange={e => setApiKey(e.target.value)} placeholder="Deixe em branco se não usar" />
            </Field>
          </Section>

          <Section title="PubMed / NCBI">
            <Field label="Chave API NCBI (opcional — gratuito sem chave, limite maior com chave)">
              <input
                type="password"
                value={pubmedKey}
                onChange={e => setPubmedKey(e.target.value)}
                placeholder="Obtenha em: ncbi.nlm.nih.gov/account"
              />
            </Field>
            <div style={{ fontSize: 11, color: 'var(--text-3)' }}>
              Sem chave: 3 req/s · Com chave NCBI gratuita: 10 req/s
            </div>
          </Section>

          <Section title="Notion (Referência de Estilo)">
            <Field label="Token da Integração Interna">
              <input
                type="password"
                value={notionToken}
                onChange={e => setNotionToken(e.target.value)}
                placeholder="ntn_... (crie em notion.so/my-integrations)"
              />
            </Field>
            <Field label="Proxy CORS (opcional — padrão: corsproxy.io)">
              <input
                value={notionProxy}
                onChange={e => setNotionProxy(e.target.value)}
                placeholder="https://corsproxy.io/? (deixe vazio para padrão)"
              />
            </Field>
            <div style={{ fontSize: 11, color: 'var(--text-3)', lineHeight: 1.5 }}>
              1. Crie uma integração em <strong>notion.so/my-integrations</strong><br/>
              2. Copie o token (ntn_…) e cole acima<br/>
              3. No Notion, compartilhe suas páginas com a integração
            </div>
          </Section>

          {/* Test result */}
          {testResult && (
            <div style={{ background: 'var(--bg-3)', borderRadius: 6, padding: '10px 12px', fontSize: 12, color: 'var(--text-2)', whiteSpace: 'pre-line', lineHeight: 1.7 }}>
              {testResult}
            </div>
          )}
        </div>

        <div className="modal-btns">
          <button className="btn-cancel" onClick={onClose}>Fechar</button>
          <button
            className="btn-ghost"
            style={{ marginRight: 'auto', fontSize: 12, padding: '6px 14px' }}
            onClick={testConnection}
            disabled={testing}
          >
            {testing ? '⏳ Testando…' : '🔌 Testar conexões'}
          </button>
          <button className="btn-primary" style={{ padding: '7px 20px', fontSize: 13 }} onClick={save}>
            {saved ? '✓ Salvo!' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        {title}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {children}
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 12, color: 'var(--text-2)', marginBottom: 4 }}>{label}</label>
      {children}
    </div>
  );
}

// Add inline styles for inputs/selects in settings
const inputStyle = `
.modal input[type="text"], .modal input[type="password"], .modal select {
  width: 100%; padding: 8px 10px;
  border: 1px solid var(--border-input);
  border-radius: var(--r-sm); font-size: 13px;
  color: var(--text-1); background: var(--bg-input); outline: none;
}
.modal input:focus, .modal select:focus { border-color: var(--border-active); }
`;
if (typeof document !== 'undefined' && !document.getElementById('settings-style')) {
  const s = document.createElement('style');
  s.id = 'settings-style';
  s.textContent = inputStyle;
  document.head.appendChild(s);
}
