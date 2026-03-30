import { useRef, useEffect, useState } from 'react';
import { useStore } from '../store/index.js';

import { useAI } from '../hooks/useAI.js';
import { formatContent } from '../utils/format.js';
import ChatMessage from './ChatMessage.jsx';

export default function ChatPanel({ editorRef }) {
  const [text, setText] = useState('');
  const messagesRef = useRef(null);
  const textareaRef = useRef(null);

  const {
    chatHistory, isStreaming, useRag, setUseRag,
    agentOnline, agentDocCount, editorVisible, toggleEditor,
    openSettings, openPubMed, pubmedContext, clearPubMedContext,
    openNotion, notionStyleContext, clearNotionStyles,
    canvasSelection,
  } = useStore();
  const { sendMessage, stopGeneration } = useAI();

  useEffect(() => {
    if (messagesRef.current) {
      messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
    }
  }, [chatHistory]);

  function autoResize(e) {
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 160) + 'px';
  }

  async function handleSend() {
    const msg = text.trim();
    if (!msg || isStreaming) return;
    setText('');
    if (textareaRef.current) { textareaRef.current.style.height = 'auto'; }
    const editorContent = editorRef?.current?.innerText || '';
    await sendMessage(msg, null, null, editorContent);
  }

  function handleKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  }

  function insertLastMsg() {
    const lastAi = [...chatHistory].reverse().find(m => m.role === 'assistant' && m.content);
    if (!lastAi || !editorRef?.current) return;
    if (!editorVisible) toggleEditor();
    editorRef.current.innerHTML += (editorRef.current.innerHTML ? '<br><hr><br>' : '') + formatContent(lastAi.content);
  }

  return (
    <div className={`ai-panel ${editorVisible ? 'canvas-open' : ''}`}>
      {/* Header */}
      <div className="ai-panel-header">
        <div className="ai-panel-icon">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <span className="ai-panel-title">Creative Studio</span>
        <div className="ai-panel-status">
          {agentOnline && agentDocCount > 0 && (
            <span className="status-badge status-online">RAG · {agentDocCount.toLocaleString('pt-BR')}</span>
          )}
          <span className={`status-badge ${agentOnline ? 'status-online' : isStreaming ? 'status-loading' : 'status-offline'}`}>
            <span className="dot">●</span>{' '}
            {isStreaming ? 'gerando…' : agentOnline ? 'online' : 'offline'}
          </span>
        </div>
      </div>

      {/* Messages */}
      <div className="chat-messages" ref={messagesRef}>
        {chatHistory.length === 0 && (
          <div className="chat-welcome">
            <div className="chat-welcome-icon">✍️</div>
            <h2 className="chat-welcome-title">Como posso ajudar?</h2>
            <p>Descreva o que precisa e eu crio para você</p>
          </div>
        )}
        {chatHistory.map(msg => (
          <ChatMessage key={msg.id} msg={msg} editorRef={editorRef} />
        ))}
      </div>

      {/* Context bar */}
      <div className="chat-output-bar">
        <button className="btn-ghost pubmed-trigger" onClick={openPubMed}>
          🔬 PubMed
          {pubmedContext.length > 0 && <span className="pubmed-badge">{pubmedContext.length}</span>}
        </button>
        {pubmedContext.length > 0 && (
          <button className="btn-ghost pubmed-clear" onClick={clearPubMedContext} title="Limpar referências">✕</button>
        )}
        <button className="btn-ghost notion-trigger" onClick={openNotion}>
          📓 Notion
          {notionStyleContext.length > 0 && <span className="notion-badge">{notionStyleContext.length}</span>}
        </button>
        {notionStyleContext.length > 0 && (
          <button className="btn-ghost pubmed-clear" onClick={clearNotionStyles} title="Limpar estilo">✕</button>
        )}

        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6, alignItems: 'center' }}>
          <label className="rag-toggle-mini" title="Base RAG ativa">
            <input type="checkbox" checked={useRag} onChange={e => setUseRag(e.target.checked)} />
            <span className="rag-toggle-label">{useRag ? '📚' : '💭'}</span>
          </label>
          {editorVisible && (
            <button className="btn-ghost" onClick={insertLastMsg}>+ Inserir</button>
          )}
          <button className={`btn-canvas-toggle ${editorVisible ? 'active' : ''}`} onClick={toggleEditor}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <line x1="12" y1="3" x2="12" y2="21" />
            </svg>
            {editorVisible ? 'Fechar Lousa' : 'Abrir Lousa'}
          </button>
        </div>
      </div>

      {/* Chat input */}
      <div className="chat-bottom">
        {canvasSelection && (
          <div className="selection-indicator">
            <span className="selection-indicator-icon">✂</span>
            <span className="selection-indicator-text">
              Seleção: <em>"{canvasSelection.length > 60 ? canvasSelection.slice(0, 60) + '…' : canvasSelection}"</em>
            </span>
            <span className="selection-indicator-hint">Escreva como quer editar este trecho</span>
          </div>
        )}
        <div className="chat-input-box">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={handleKey}
            onInput={autoResize}
            placeholder={canvasSelection ? 'Como quer reescrever este trecho…' : 'Sua instrução…'}
            rows={1}
            disabled={isStreaming}
          />
          <button
            className={`chat-send-btn ${isStreaming ? 'stop' : ''}`}
            onClick={isStreaming ? stopGeneration : handleSend}
            title={isStreaming ? 'Parar' : 'Enviar'}
          >
            {isStreaming ? (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Footer */}
      <div className="chat-panel-footer">
        <button onClick={openSettings}>⚙ Configurações</button>
      </div>
    </div>
  );
}
