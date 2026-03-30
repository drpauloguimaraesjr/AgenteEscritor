import { useRef, useEffect } from 'react';
import { useStore } from '../store/index.js';

export default function Editor({ editorRef, onDelete }) {
  const { currentProject, saveProject, editorVisible, platform, setPlatform } = useStore();
  const titleRef = useRef(null);

  useEffect(() => {
    if (editorRef.current && currentProject) {
      editorRef.current.innerHTML = currentProject.content || '';
    }
  }, [currentProject?.id]);

  function handleTitleChange(e) {
    saveProject({ title: e.target.value });
  }

  function handleContentChange() {
    if (!editorRef.current) return;
    const html = editorRef.current.innerHTML;
    const text = editorRef.current.innerText || '';
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    saveProject({ content: html, words });
  }

  function execCmd(cmd, val = null) {
    document.execCommand(cmd, false, val);
    editorRef.current?.focus();
  }

  if (!currentProject) {
    return (
      <div className={`editor-shell glass-panel ${!editorVisible ? 'editor-hidden' : ''}`}>
        <div className="editor-empty">
          <div className="editor-empty-icon">✍️</div>
          <h2>Selecione ou crie um documento</h2>
          <p>Use a barra lateral para começar</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`editor-shell glass-panel ${!editorVisible ? 'editor-hidden' : ''}`}>
      <div className="editor-topbar">
        <div className="platform-pills">
          {['youtube', 'instagram', 'blog'].map(p => (
            <button key={p} className={`platform-pill ${platform === p ? 'active' : ''}`} onClick={() => setPlatform(p)}>
              {p === 'youtube' ? '▶ YT' : p === 'instagram' ? '◎ IG' : '✎ Blog'}
            </button>
          ))}
        </div>
        <div className="topbar-divider" />
        <input
          ref={titleRef}
          className="doc-title-input"
          value={currentProject.title || ''}
          onChange={handleTitleChange}
          placeholder="Título do documento…"
        />
        <span className="topbar-meta">{currentProject.words || 0} palavras</span>
        <div className="topbar-actions">
          <button className="topbar-btn" onClick={onDelete} title="Excluir">🗑</button>
        </div>
      </div>

      <div className="editor-pane">
        <div
          ref={editorRef}
          className="editor-canvas"
          contentEditable
          suppressContentEditableWarning
          data-placeholder="Comece a escrever ou peça para a IA gerar um rascunho…"
          onInput={handleContentChange}
        />
      </div>

      <div className="editor-toolbar">
        <button className="toolbar-btn" onClick={() => execCmd('bold')} title="Negrito"><b>B</b></button>
        <button className="toolbar-btn" onClick={() => execCmd('italic')} title="Itálico"><i>I</i></button>
        <button className="toolbar-btn" onClick={() => execCmd('underline')} title="Sublinhado"><u>U</u></button>
        <button className="toolbar-btn" onClick={() => execCmd('formatBlock', 'H2')} title="Título">H2</button>
        <button className="toolbar-btn" onClick={() => execCmd('formatBlock', 'H3')} title="Subtítulo">H3</button>
        <button className="toolbar-btn" onClick={() => execCmd('insertUnorderedList')} title="Lista">•</button>
        <button className="toolbar-btn" onClick={() => execCmd('insertOrderedList')} title="Lista numerada">1.</button>
        <button className="toolbar-btn" onClick={() => execCmd('formatBlock', 'BLOCKQUOTE')} title="Citação">❝</button>
        <button className="toolbar-btn" onClick={() => execCmd('insertHorizontalRule')} title="Divisor">—</button>
      </div>
    </div>
  );
}
