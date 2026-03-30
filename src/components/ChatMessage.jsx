import { useStore } from '../store/index.js';
import { formatContent } from '../utils/format.js';

export default function ChatMessage({ msg, editorRef }) {
  const openReasoningModal = useStore(s => s.openReasoningModal);
  const toast = useStore(s => s.toast);

  function insertToEditor() {
    if (!editorRef?.current || !msg.content) return;
    editorRef.current.innerHTML += (editorRef.current.innerHTML ? '<br><hr><br>' : '') + formatContent(msg.content);
    toast('Inserido na lousa!');
  }

  function replaceEditor() {
    if (!editorRef?.current || !msg.content) return;
    editorRef.current.innerHTML = formatContent(msg.content);
    toast('Lousa substituída!');
  }

  function copyMsg() {
    navigator.clipboard.writeText(msg.content).then(() => toast('Copiado!'));
  }

  if (msg.role === 'user') {
    return (
      <div className="chat-msg user">
        <div className="chat-msg-bubble">{msg.content}</div>
      </div>
    );
  }

  // Assistant
  const isEmpty = !msg.content;

  return (
    <div className="chat-msg assistant">
      <div className="chat-msg-content">
        {isEmpty ? (
          <div className="thinking-indicator">
            <div className="thinking-dots"><span /><span /><span /></div>
            <span>Gerando…</span>
          </div>
        ) : (
          <>
            <div className="chat-msg-bubble" dangerouslySetInnerHTML={{ __html: formatContent(msg.content) }} />
            <div className="chat-msg-actions">
              <button onClick={insertToEditor}>📝 Abrir na lousa</button>
              <button onClick={replaceEditor}>↻ Substituir</button>
              <button onClick={copyMsg}>⎘ Copiar</button>
            </div>
          </>
        )}

        {/* RAG source badge */}
        {msg.content && (
          <div className={`rag-log ${msg.ragUsed ? (msg.ragSource === 'pubmed' ? 'pubmed-rag' : '') : 'no-rag'}`}>
            <span className="rag-log-icon">
              {!msg.ragUsed ? '💭' : msg.ragSource === 'pubmed' ? '🔬' : '📚'}
            </span>
            <span>
              {!msg.ragUsed
                ? 'Resposta sem base de conhecimento'
                : msg.ragSource === 'pubmed'
                  ? `PubMed — ${msg.ragDocCount ?? ''} artigos encontrados`
                  : `Base clínica (RAG) — ${msg.ragDocCount ?? ''} docs`}
            </span>
            {msg.ragUsed && msg.ragContext && (
              <button className="rag-view-btn" onClick={() => openReasoningModal(msg.ragContext)}>
                🔍 Ver contexto
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
