import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { API } from './api';
import { C, FONT } from './theme';
import { GlobalStyles, Spinner } from './components/UI';
import Header from './components/Header';
import LoginPage from './pages/LoginPage';
import AnalyticsPage from './pages/AnalyticsPage';
import RequirementsPage from './pages/RequirementsPage';
import ChangeRequestsPage from './pages/ChangeRequestsPage';
import ChangeOrdersPage from './pages/ChangeOrdersPage';
import DocumentsPage from './pages/DocumentsPage';

const PAGES_SUPERVISOR = ['analytics', 'requirements', 'documents', 'ecr', 'eco'];
const PAGES_USER       = ['requirements', 'documents', 'ecr'];

function MainApp() {
  const { user, token } = useAuth();
  const isSuper = user?.is_supervisor;
  const allowed = isSuper ? PAGES_SUPERVISOR : PAGES_USER;

  const [page,            setPage]            = useState(allowed[0]);
  const [projects,        setProjects]        = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [projectsLoading, setProjectsLoading] = useState(true);

  const loadProjects = () => {
    API.projects(token)
      .then(data => {
        const list = data ?? [];
        setProjects(list);
        // Сохраняем выбранный проект если он ещё существует
        setSelectedProject(prev => {
          if (prev && list.find(p => p.id === prev.id)) return prev;
          return list[0] ?? null;
        });
      })
      .catch(() => setProjects([]))
      .finally(() => setProjectsLoading(false));
  };

  useEffect(() => { loadProjects(); }, [token]);
  useEffect(() => {
    if (!allowed.includes(page)) setPage(allowed[0]);
  }, [isSuper]);

  const handleProjectCreated = (newProject) => {
    setProjects(prev => [...prev, newProject]);
    setSelectedProject(newProject);
  };

  const handleDownloadSpec = () => {
    if (!selectedProject) { alert('Выберите проект'); return; }
    fetch(API.specUrl(selectedProject.id), {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.blob(); })
      .then(blob => {
        const url  = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href  = url;
        link.download = `ТЗ_${selectedProject.name}.docx`;
        link.click();
        URL.revokeObjectURL(url);
      })
      .catch(e => alert(`Ошибка генерации ТЗ: ${e.message}`));
  };

  const renderPage = () => {
    if (projectsLoading) return <div style={{ paddingTop: 80 }}><Spinner /></div>;
    switch (page) {
      case 'analytics':    return <AnalyticsPage      selectedProject={selectedProject} />;
      case 'requirements': return <RequirementsPage   selectedProject={selectedProject} />;
      case 'documents':    return <DocumentsPage      selectedProject={selectedProject} />;
      case 'ecr':          return <ChangeRequestsPage selectedProject={selectedProject} />;
      case 'eco':          return <ChangeOrdersPage   selectedProject={selectedProject} />;
      default:             return null;
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: FONT }}>
      <GlobalStyles />
      <Header
        page={page} setPage={setPage}
        projects={projects} setProjects={setProjects}
        selectedProject={selectedProject}
        setSelectedProject={setSelectedProject}
        onProjectCreated={handleProjectCreated}
        onDownloadSpec={handleDownloadSpec}
      />
      <main style={{ maxWidth: 1400, margin: '0 auto', padding: '36px 32px' }}>
        {!projectsLoading && projects.length === 0 && (
          <div style={{
            background: '#FFFBEB', border: '1px solid #FDE68A',
            borderRadius: 12, padding: '16px 20px', marginBottom: 28,
            display: 'flex', alignItems: 'center', gap: 14,
          }}>
            <span style={{ fontSize: 22 }}>⚠️</span>
            <div>
              <div style={{ fontWeight: 700, color: '#713F12' }}>Нет доступных проектов</div>
              <div style={{ color: '#92400E', fontSize: 14, marginTop: 2 }}>
                {isSuper
                  ? 'Выберите «✚ Создать проект…» в списке проектов.'
                  : 'Обратитесь к супервайзеру.'}
              </div>
            </div>
          </div>
        )}
        {renderPage()}
      </main>
    </div>
  );
}

function AppRouter() {
  const { user, ready } = useAuth();
  if (!ready) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: C.bg }}>
      <GlobalStyles /><Spinner size={44} />
    </div>
  );
  return user ? <MainApp /> : <LoginPage />;
}

export default function App() {
  return <AuthProvider><AppRouter /></AuthProvider>;
}
