import { useState } from 'react';
import { useStore } from '../store/index.js';
import { searchPubMed, formatCitation } from '../utils/pubmed.js';

export default function PubMedModal({ editorRef }) {
  const { closePubMed, pubmedApiKey, addPubMedContext, toast } = useStore();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [added, setAdded] = useState(new Set());

  async function handleSearch(e) {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setError('');
    setResults([]);
    try {
      const refs = await searchPubMed(query.trim(), { maxResults: 8, apiKey: pubmedApiKey || '' });
      if (!refs.length) setError('Nenhum artigo encontrado.');
      setResults(refs);
    } catch (err) {
      setError(err.message || 'Erro ao buscar no PubMed.');
    } finally {
      setLoading(false);
    }
  }

  function handleCiteEditor(ref) {
    if (!editorRef?.current) return;
    const citation = `<p><em>${formatCitation(ref)}</em> <a href="${ref.url}" target="_blank">[PubMed]</a></p>`;
    editorRef.current.innerHTML += citation;
    toast('Citação inserida na lousa!');
  }

  function handleAddContext(ref) {
    if (added.has(ref.pmid)) return;
    addPubMedContext(ref);
    setAdded(prev => new Set([...prev, ref.pmid]));
    toast(`Artigo adicionado ao contexto IA!`);
  }

  return (
    <div className="modal-bg open" onClick={e => { if (e.target === e.currentTarget) closePubMed(); }}>
      <div className="pubmed-modal glass">
        <div className="pubmed-header">
          <span className="pubmed-logo">🔬</span>
          <div>
            <div className="pubmed-title">PubMed — Referências Científicas</div>
            <div className="pubmed-sub">Busque artigos e adicione citações ou contexto para a IA</div>
          </div>
          <button className="pubmed-close" onClick={closePubMed}>✕</button>
        </div>

        <form className="pubmed-searchbar" onSubmit={handleSearch}>
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Ex: tirzepatida diabetes type 2…" />
          <button type="submit" disabled={loading}>{loading ? '…' : 'Buscar'}</button>
        </form>

        {error && <div className="pubmed-error">{error}</div>}

        {loading && (
          <div className="pubmed-loading">
            <div className="thinking-dots"><span /><span /><span /></div>
            <span>Buscando no PubMed…</span>
          </div>
        )}

        <div className="pubmed-results">
          {results.map(ref => (
            <div key={ref.pmid} className="pubmed-card">
              <a className="pubmed-card-title" href={ref.url} target="_blank" rel="noreferrer">{ref.title}</a>
              <div className="pubmed-card-meta">
                <span className="pubmed-journal">{ref.journal}</span>
                {ref.year && <><span className="meta-sep">·</span><span>{ref.year}</span></>}
                <span className="meta-sep">·</span>
                <span>{ref.authors}</span>
              </div>
              <div className="pubmed-actions">
                <button className="btn-ghost pubmed-btn" onClick={() => handleCiteEditor(ref)}>📝 Citar na lousa</button>
                <button
                  className={`btn-ghost pubmed-btn ${added.has(ref.pmid) ? 'pubmed-btn-added' : ''}`}
                  onClick={() => handleAddContext(ref)}
                  disabled={added.has(ref.pmid)}
                >
                  {added.has(ref.pmid) ? '✓ Adicionado' : '🤖 + Contexto IA'}
                </button>
              </div>
            </div>
          ))}
        </div>

        {added.size > 0 && (
          <div className="pubmed-ctx-hint">
            <strong>{added.size}</strong> {added.size === 1 ? 'artigo adicionado' : 'artigos adicionados'} ao contexto —
            a IA vai citar esses estudos nas próximas gerações.
          </div>
        )}
      </div>
    </div>
  );
}
