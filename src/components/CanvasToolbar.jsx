import { useStore } from '../store/index.js';

export default function CanvasToolbar({ editorRef }) {
  const { toggleEditor, toast } = useStore();

  function handleCopy() {
    const text = editorRef?.current?.innerText || '';
    if (!text.trim()) { toast('Lousa vazia'); return; }
    navigator.clipboard.writeText(text).then(() => toast('Texto copiado!'));
  }

  function handleDownload() {
    const text = editorRef?.current?.innerText || '';
    if (!text.trim()) { toast('Lousa vazia'); return; }
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'roteiro.txt';
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleUndo() { document.execCommand('undo'); editorRef?.current?.focus(); }
  function handleRedo() { document.execCommand('redo'); editorRef?.current?.focus(); }

  return (
    <div className="canvas-toolbar">
      <button className="canvas-toolbar-btn" onClick={handleCopy} title="Copiar texto">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        </svg>
      </button>

      <button className="canvas-toolbar-btn" onClick={handleDownload} title="Baixar .txt">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
        </svg>
      </button>

      <div className="canvas-toolbar-divider" />

      <button className="canvas-toolbar-btn" onClick={handleUndo} title="Desfazer">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
        </svg>
      </button>

      <button className="canvas-toolbar-btn" onClick={handleRedo} title="Refazer">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
        </svg>
      </button>

      <div className="canvas-toolbar-divider" />

      <button className="canvas-toolbar-btn" onClick={() => editorRef?.current?.focus()} title="Editar texto">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
        </svg>
      </button>

      <div style={{ flex: 1 }} />

      <button className="canvas-toolbar-btn canvas-toolbar-close" onClick={toggleEditor} title="Fechar lousa">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  );
}
