import { useState } from 'react';
import { useStore } from '../store/index.js';

const PLATFORMS = [
  { value: 'youtube', icon: '▶', label: 'YouTube' },
  { value: 'instagram', icon: '◎', label: 'Instagram' },
  { value: 'blog', icon: '✎', label: 'Blog' },
];

export default function Sidebar({ onSettingsClick }) {
  const { session, logout, projects, currentProjectId, openProject, createProject, saveProject, platform, setPlatform } = useStore();
  const [search, setSearch] = useState('');
  const [showUser, setShowUser] = useState(false);

  const filtered = projects.filter(p =>
    !search || p.title.toLowerCase().includes(search.toLowerCase())
  );

  function formatDate(iso) {
    if (!iso) return '';
    try { return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }); }
    catch { return ''; }
  }

  return (
    <aside className="sidebar glass-panel">
      <div className="sidebar-brand">
        <div className="sidebar-brand-icon">✍️</div>
        <div>
          <div className="sidebar-brand-name">Creative Studio</div>
          <div className="sidebar-brand-sub">Dr. Paulo Guimarães</div>
        </div>
      </div>

      <div className="sidebar-user" onClick={() => setShowUser(!showUser)}>
        <div className="sidebar-avatar">{(session?.name || 'U')[0].toUpperCase()}</div>
        <div>
          <div className="sidebar-user-name">{session?.name || session?.username}</div>
          <div className="sidebar-user-role">{session?.role || 'editor'}</div>
        </div>
        <span className="sidebar-user-chevron">{showUser ? '▲' : '▼'}</span>
        {showUser && (
          <div className="user-popover glass">
            <button onClick={onSettingsClick}>⚙ Configurações</button>
            <div className="user-popover-divider" />
            <button className="danger" onClick={logout}>↪ Sair</button>
          </div>
        )}
      </div>

      <div className="sidebar-actions">
        <button className="btn-new-doc" onClick={createProject}>+ Novo Documento</button>
      </div>

      <div className="sidebar-search">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar documentos…" />
      </div>

      <div className="sidebar-files">
        {filtered.map(p => (
          <div
            key={p.id}
            className={`file-item ${p.id === currentProjectId ? 'active' : ''}`}
            onClick={() => openProject(p.id)}
          >
            <span className="file-item-icon">📄</span>
            <div className="file-item-info">
              <div className="file-item-title">{p.title || 'Sem título'}</div>
              <div className="file-item-meta">{formatDate(p.updatedAt)} · {p.words || 0} palavras</div>
            </div>
            {p.platform && <span className={`file-badge ${p.platform === 'youtube' ? 'yt' : p.platform === 'instagram' ? 'ig' : ''}`}>{p.platform?.toUpperCase().slice(0, 2)}</span>}
          </div>
        ))}
        {filtered.length === 0 && (
          <div style={{ padding: '20px 12px', textAlign: 'center', fontSize: 12, color: 'var(--text-3)' }}>
            {search ? 'Nenhum resultado' : 'Crie seu primeiro documento'}
          </div>
        )}
      </div>

      <div className="sidebar-footer">
        <button onClick={onSettingsClick}>⚙ Config</button>
      </div>
    </aside>
  );
}
