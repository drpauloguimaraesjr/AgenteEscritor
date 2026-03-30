import { useStore } from '../store/index.js';
import { formatContent } from '../utils/format.js';

export default function ReasoningModal() {
  const { showReasoningModal, closeReasoningModal, reasoningContext } = useStore();

  if (!showReasoningModal) return null;

  return (
    <div className="reasoning-modal-bg open" onClick={e => { if (e.target === e.currentTarget) closeReasoningModal(); }}>
      <div className="reasoning-modal glass">
        <div className="reasoning-modal-header">
          <span>📚 Contexto RAG utilizado</span>
          <button className="reasoning-modal-close" onClick={closeReasoningModal}>✕</button>
        </div>
        <div className="reasoning-modal-body" dangerouslySetInnerHTML={{ __html: formatContent(reasoningContext || '') }} />
      </div>
    </div>
  );
}
