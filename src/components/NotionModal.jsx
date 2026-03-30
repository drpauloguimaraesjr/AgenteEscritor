import { useState } from 'react';
import { useStore } from '../store/index.js';
import { searchNotionPages, fetchPageContent, truncateForContext } from '../utils/notion.js';
import { formatContent } from '../utils/format.js';

export default function NotionModal({ editorRef }) {
  const { closeNotion, notionToken, addNotionStyle, openCanvas, editorVisible, toast } = useStore();

  const [query,    setQuery]    = useState('');
  const [results,  setResults]  = useState([]);
  const [loading,  setLoading]  = useState(false);
  const [fetching, setFetching] = useState(null);
  const [error,    setError]    = useState('');
  const [added,    setAdded]    = useState(new Set());

  async function handleSearch(e) {
    e.preventDefault();
    if (!notionToken) { setError('Configure o token do Notion em Configurações.'); return; }
    setLoading(true);
    setError('');
    setResults([]);
    try {
      const pages = await searchNotionPages(notionToken, query.trim());
      if (!pages.length) setError('Nenhuma página encontrada. Verifique se compartilhou as páginas com a integração.');
      setResults(pages);
    } catch (err) {
      setError(err.message || 'Erro ao conectar com o Notion.');
    } finally {
      setLoading(false);
    }
  }

  async function handleAddStyle(page) {
    if (added.has(page.id)) return;
    setFetching(page.id);
    try {
      const content = await fetchPageContent(notionToken, page.id);
      if (!content.trim()) { toast('Página sem conteúdo de texto.'); return; }
      const excerpt = truncateForContext(content, 3000);
      addNotionStyle({ id: page.id, title: page.title, icon: page.icon, content: excerpt });
      setAdded(prev => new Set([...prev, page.id]));
      toast(`"${page.title}" adicionado como referência de estilo!`);
    } catch (err) {
      toast('Erro ao carregar conteúdo: ' + err.message);
    } finally {
      setFetching(null);
    }
  }

  async function handleInsertCanvas(page) {
    setFetching(page.id);
    try {
      const content = await fetchPageContent(notionToken, page.id);
      if (!content.trim()) { toast('Página sem conteúdo.'); return; }

      // Open canvas if closed
      if (!editorVisible) openCanvas();

      setTimeout(() => {
        const editor = editorRef?.current || document.querySelector('.editor-canvas');
        if (!editor) { toast('Abra a lousa primeiro.'); return; }
        const html = formatContent(content);
        editor.innerHTML = (editor.innerHTML && editor.innerText.trim())
          ? editor.innerHTML + '<br><hr><br>' + html
          : html;
        editor.dispatchEvent(new Event('input', { bubbles: true }));
        toast(`"${page.title}" inserido na lousa!`);
      }, 150);
    } catch (err) {
      toast('Erro: ' + err.message);
    } finally {
      setFetching(null);
    }
  }

  function formatDate(iso) {
    if (!iso) return '';
    try { return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }); }
    catch { return ''; }
  }

  return (
    <div className="modal-bg open" onClick={e => { if (e.target === e.currentTarget) closeNotion(); }}>
      <div className="notion-modal glass">
        {/* Header */}
        <div className="notion-header">
          <span className="notion-logo">📓</span>
          <div>
            <div className="notion-modal-title">Notion</div>
            <div className="notion-sub">Busque textos para usar como estilo ou inserir na lousa</div>
          </div>
          <button className="pubmed-close" onClick={closeNotion}>✕</button>
        </div>

        {/* Token warning */}
        {!notionToken && (
          <div className="notion-warning">
            Token não configurado. Vá em <strong>Configurações → Notion</strong> e cole seu token.
          </div>
        )}

        {/* Search */}
        <form className="pubmed-searchbar" onSubmit={handleSearch}>
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Buscar páginas… (vazio = listar todas)"
            disabled={!notionToken}
          />
          <button type="submit" disabled={loading || !notionToken}>
            {loading ? '…' : 'Buscar'}
          </button>
        </form>

        {error && <div className="pubmed-error">{error}</div>}

        {loading && (
          <div className="pubmed-loading">
            <div className="thinking-dots"><span/><span/><span/></div>
            <span>Buscando no Notion…</span>
          </div>
        )}

        {/* Results */}
        <div className="pubmed-results">
          {results.map(page => (
            <div key={page.id} className="notion-card">
              <div className="notion-card-header">
                <span className="notion-card-icon">{page.icon}</span>
                <div className="notion-card-info">
                  <a className="pubmed-card-title" href={page.url} target="_blank" rel="noreferrer">
                    {page.title}
                  </a>
                  <div className="pubmed-card-meta">
                    {page.lastEdited && <span>Editado: {formatDate(page.lastEdited)}</span>}
                  </div>
                </div>
              </div>
              <div className="pubmed-actions">
                <button
                  className="btn-ghost pubmed-btn"
                  onClick={() => handleInsertCanvas(page)}
                  disabled={fetching === page.id}
                >
                  {fetching === page.id ? '⏳…' : '📝 Inserir na Lousa'}
                </button>
                <button
                  className={`btn-ghost pubmed-btn ${added.has(page.id) ? 'pubmed-btn-added' : ''}`}
                  onClick={() => handleAddStyle(page)}
                  disabled={added.has(page.id) || fetching === page.id}
                >
                  {added.has(page.id) ? '✓ Estilo' : '🎨 Usar como estilo'}
                </button>
              </div>
            </div>
          ))}
        </div>

        {added.size > 0 && (
          <div className="pubmed-ctx-hint">
            <strong>{added.size}</strong> {added.size === 1 ? 'texto' : 'textos'} como referência de estilo
          </div>
        )}
      </div>
    </div>
  );
}
