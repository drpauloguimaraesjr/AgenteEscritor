import { useStore } from '../store/index.js';

export default function DeleteModal() {
  const { showDeleteModal, closeDeleteModal, currentProjectId, deleteProject, toast } = useStore();

  function handleDelete() {
    if (currentProjectId) {
      deleteProject(currentProjectId);
      toast('Documento excluído');
    }
    closeDeleteModal();
  }

  if (!showDeleteModal) return null;

  return (
    <div className="modal-bg open" onClick={e => { if (e.target === e.currentTarget) closeDeleteModal(); }}>
      <div className="modal glass">
        <h3>Excluir documento?</h3>
        <p>Esta ação não pode ser desfeita. O documento e seu histórico de chat serão removidos.</p>
        <div className="modal-btns">
          <button className="btn-cancel" onClick={closeDeleteModal}>Cancelar</button>
          <button className="btn-danger" onClick={handleDelete}>Excluir</button>
        </div>
      </div>
    </div>
  );
}
