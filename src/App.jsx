import { useRef } from 'react';
import { useStore } from './store/index.js';
import { useIPAgentHealth } from './hooks/useIPAgent.js';
import Login          from './components/Login.jsx';
import Sidebar        from './components/Sidebar.jsx';
import Editor         from './components/Editor.jsx';
import ChatPanel      from './components/ChatPanel.jsx';
import CanvasToolbar  from './components/CanvasToolbar.jsx';
import DeleteModal    from './components/DeleteModal.jsx';
import ReasoningModal from './components/ReasoningModal.jsx';
import SettingsPanel  from './components/SettingsPanel.jsx';
import PubMedModal    from './components/PubMedModal.jsx';
import NotionModal    from './components/NotionModal.jsx';
import Toast          from './components/Toast.jsx';

export default function App() {
  const session         = useStore(s => s.session);
  const agentOnline     = useStore(s => s.agentOnline);
  const editorVisible   = useStore(s => s.editorVisible);
  const openDeleteModal = useStore(s => s.openDeleteModal);
  const settingsOpen    = useStore(s => s.settingsOpen);
  const openSettings    = useStore(s => s.openSettings);
  const closeSettings   = useStore(s => s.closeSettings);
  const pubmedOpen      = useStore(s => s.pubmedOpen);
  const notionOpen      = useStore(s => s.notionOpen);

  const editorRef = useRef(null);

  useIPAgentHealth();

  if (!session) return <Login />;

  return (
    <div className="app-root">
      <Sidebar onSettingsClick={openSettings} />
      <ChatPanel editorRef={editorRef} />
      <Editor editorRef={editorRef} onDelete={openDeleteModal} />
      {editorVisible && <CanvasToolbar editorRef={editorRef} />}

      <DeleteModal />
      <ReasoningModal />
      {settingsOpen && <SettingsPanel onClose={closeSettings} />}
      {pubmedOpen && <PubMedModal editorRef={editorRef} />}
      {notionOpen && <NotionModal />}
      <Toast />

      {!agentOnline && (
        <div className="conn-banner">
          Agente local desconectado —{' '}
          <button
            onClick={openSettings}
            style={{ background:'none', border:'none', color:'#fff', textDecoration:'underline', cursor:'pointer', fontSize:12 }}
          >
            configurar
          </button>
        </div>
      )}
    </div>
  );
}
