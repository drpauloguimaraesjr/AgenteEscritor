import { useRef, useEffect, useState } from 'react';
import { useStore } from '../store/index.js';

import { useAI } from '../hooks/useAI.js';
import { formatContent } from '../utils/format.js';
import ChatMessage from './ChatMessage.jsx';

const SUGGESTIONS = [
  'Crie um roteiro de 5 min sobre tirzepatida',
  'Script Reels: testosterona baixa no homem',
  'Roteiro: mitos sobre hormônio feminino',
];

const TONES = [
  { value: 'educativo',    label: 'Educativo' },
  { value: 'storytelling', label: 'Storytelling' },
  { value: 'provocativo',  label: 'Provocativo' },
  { value: 'motivacional', label: 'Motivacional' },
  { value: 'mito_verdade', label: 'Mito vs Verdade' },
  { value: 'lista',        label: 'Lista / Tópicos' },
];

const DURATIONS = [
  { value: 60,  label: '60s' },
  { value: 180, label: '3 min' },
  { value: 300, label: '5 min' },
  { value: 600, label: '10 min' },
];

export default function ChatPanel({ editorRef }) {
  const [text,     setText]     = useState('');
  const [tone,     setTone]     = useState('educativo');
  const [duration, setDuration] = useState(300);
  const messagesRef = useRef(null);
  const textareaRef = useRef(null);

  const { chatHistory, isStreaming, useRag, setUseRag, agentOnline, agentDocCount, toggleEditor, editorVisible, openSettings, openPubMed, pubmedContext, clearPubMedContext, openNotion, notionStyleContext, clearNotionStyles } = useStore();
  const { sendMessage, stopGeneration } = useAI();

  // Auto-scroll
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
    await sendMessage(msg, tone, duration, editorContent);
  }

  function handleKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  }

  function sendSuggestion(s) {
    setText(s);
    setTimeout(() => { textareaRef.current?.focus(); }, 0);
  }

  function insertLastMsg() {
    const lastAi = [...chatHistory].reverse().find(m => m.role === 'assistant' && m.content);
    if (!lastAi || !editorRef?.current) return;
    editorRef.current.innerHTML += (editorRef.current.innerHTML ? '<br><hr><br>' : '') + formatContent(lastAi.content);
  }

  return (
    <div className="ai-panel">
      {/* Header */}
      <div className="ai-panel-header">
        <div className="ai-panel-icon">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <span className="ai-panel-title">Agente IA</span>
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

      {/* KB badge */}
      <div className="ai-kb-badge">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" stroke="#7C6FF0" strokeWidth="2" strokeLinecap="round"/>
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" stroke="#7C6FF0" strokeWidth="2"/>
        </svg>
        <span>Base de conhecimento:</span>
        <strong>{agentDocCount > 0 ? agentDocCount.toLocaleString('pt-BR') + ' docs' : '—'}</strong>
      </div>

      {/* Messages */}
      <div className="chat-messages" ref={messagesRef}>
        {chatHistory.length === 0 && (
          <div className="chat-welcome">
            <p>Como posso ajudar você a criar hoje?</p>
            <div className="chat-suggestions">
              {SUGGESTIONS.map(s => (
                <button key={s} className="chat-chip" onClick={() => sendSuggestion(s)}>{s}</button>
              ))}
            </div>
          </div>
        )}
        {chatHistory.map(msg => (
          <ChatMessage key={msg.id} msg={msg} editorRef={editorRef} />
        ))}
      </div>

      {/* Bottom bar */}
      <div className="chat-output-bar">
        <button className="btn-ghost" onClick={insertLastMsg}>+ Inserir Lousa</button>
        <button className="btn-ghost pubmed-trigger" onClick={openPubMed}>
          🔬 PubMed
          {pubmedContext.length > 0 && (
            <span className="pubmed-badge">{pubmedContext.length}</span>
          )}
        </button>
        {pubmedContext.length > 0 && (
          <button className="btn-ghost pubmed-clear" onClick={clearPubMedContext} title="Limpar referências do contexto">
            ✕
          </button>
        )}
        <button className="btn-ghost notion-trigger" onClick={openNotion}>
          📓 Notion
          {notionStyleContext.length > 0 && (
            <span className="notion-badge">{notionStyleContext.length}</span>
          )}
        </button>
        {notionStyleContext.length > 0 && (
          <button className="btn-ghost pubmed-clear" onClick={clearNotionStyles} title="Limpar referências de estilo">
            ✕
          </button>
        )}
        <button className="btn-primary" style={{ marginLeft: 'auto' }} onClick={toggleEditor}>
          📝 {editorVisible ? 'Fechar Lousa' : 'Abrir Lousa →'}
        </button>
      </div>

      {/* Chat input */}
      <div className="chat-bottom">
        <div className="chat-input-box">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={handleKey}
            onInput={autoResize}
            placeholder="Sua instrução…"
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

        <details className="chat-settings">
          <summary>Ajustes Artísticos e IA ▼</summary>
          <div className="chat-settings-body">
            <div className="chat-settings-row">
              <div className="chat-field">
                <label>Tom</label>
                <select value={tone} onChange={e => setTone(e.target.value)}>
                  {TONES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div className="chat-field">
                <label>Duração</label>
                <select value={duration} onChange={e => setDuration(Number(e.target.value))}>
                  {DURATIONS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                </select>
              </div>
            </div>
            <div className="chat-toggle-row">
              <span>Base RAG (contexto clínico)</span>
              <label className="toggle-switch">
                <input type="checkbox" checked={useRag} onChange={e => setUseRag(e.target.checked)} />
                <span className="toggle-track" />
                <span className="toggle-thumb" />
              </label>
            </div>
          </div>
        </details>
      </div>

      {/* Footer */}
      <div className="chat-panel-footer">
        <button className="btn-ghost" onClick={openSettings}>⚙ Configurações avançadas (API / OpenRouter)</button>
      </div>
    </div>
  );
}
