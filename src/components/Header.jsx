import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { API } from '../api';
import { C, FONT } from '../theme';
import { Btn, Modal, InfoGrid, Input, ErrorBanner } from './UI';

/* ── Nav link ─────────────────────────────────────────────────────────────── */
function NavLink({ label, active, onClick }) {
  return (
    <button onClick={onClick} style={{
      background: active ? C.accent : 'transparent',
      color:      active ? C.navy   : C.muted,
      border: 'none', borderRadius: 9,
      padding: '7px 14px', cursor: 'pointer',
      fontFamily: FONT, fontSize: 14, fontWeight: 600,
      transition: 'all .15s', whiteSpace: 'nowrap',
    }}
      onMouseEnter={e => { if (!active) e.currentTarget.style.background = '#EFF6FF'; }}
      onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}
    >{label}</button>
  );
}

/* ── Проверка: закончился ли проект ──────────────────────────────────────── */
function isProjectEnded(project) {
  if (!project?.end_date) return false;
  const end = new Date(project.end_date);
  end.setHours(23, 59, 59, 999);
  return end < new Date();
}

/* ── Модал управления проектом ───────────────────────────────────────────── */
function ProjectModal({ open, project, onClose, onUpdated, onDeleted }) {
  const { token } = useAuth();
  const [name,      setName]      = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate,   setEndDate]   = useState('');
  const [saving,    setSaving]    = useState(false);
  const [deleting,  setDeleting]  = useState(false);
  const [confirmDel,setConfirmDel]= useState(false);
  const [err,       setErr]       = useState('');

  useEffect(() => {
    if (project) {
      setName(project.name ?? '');
      setStartDate(project.start_date
        ? new Date(project.start_date).toISOString().slice(0, 10) : '');
      setEndDate(project.end_date
        ? new Date(project.end_date).toISOString().slice(0, 10) : '');
      setErr(''); setConfirmDel(false);
    }
  }, [project]);

  const save = async () => {
    if (!name.trim()) { setErr('Введите название проекта'); return; }
    setSaving(true); setErr('');
    try {
      await API.updateProjectDates(project.id, {
        name:       name.trim(),
        start_date: startDate || undefined,
        end_date:   endDate   || undefined,
      }, token);
      onUpdated();
      onClose();
    } catch (e) { setErr(e.message); } finally { setSaving(false); }
  };

  const softDelete = async () => {
    setDeleting(true); setErr('');
    try {
      await API.deleteProject(project.id, token);
      onDeleted(project.id);
      onClose();
    } catch (e) { setErr(e.message); } finally { setDeleting(false); }
  };

  if (!project) return null;
  const ended = isProjectEnded(project);

  return (
    <Modal open={open} onClose={onClose} title="Управление проектом">
      {ended && (
        <div style={{
          background: '#FEE2E2', border: '1px solid #FCA5A5',
          borderRadius: 9, padding: '10px 16px', marginBottom: 16,
          fontSize: 13, color: '#7F1D1D', display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <span>⚫</span> Проект завершён {new Date(project.end_date).toLocaleDateString('ru')}
        </div>
      )}

      <InfoGrid items={[
        ['ID проекта', project.id, false],
        ['Создан',     project.created_at
          ? new Date(project.created_at).toLocaleDateString('ru') : '—', false],
      ]} />

      <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 16, marginTop: 4, marginBottom: 20 }}>
        <p style={{ margin: '0 0 14px', fontWeight: 700, color: C.navy, fontSize: 14 }}>
          Редактировать
        </p>
        <Input label="Название" value={name} onChange={setName} required />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Input label="Дата начала" type="date" value={startDate} onChange={setStartDate} />
          <Input label="Дата окончания" type="date" value={endDate} onChange={setEndDate} />
        </div>
        <ErrorBanner message={err} />
        <Btn onClick={save} disabled={saving}>
          {saving ? 'Сохранение…' : 'Сохранить изменения'}
        </Btn>
      </div>

      {/* Мягкое удаление */}
      <div style={{
        borderTop: `1px solid #FCA5A5`,
        paddingTop: 16,
      }}>
        <p style={{ margin: '0 0 10px', fontWeight: 700, color: C.error, fontSize: 14 }}>
          Удаление проекта
        </p>
        <p style={{ margin: '0 0 14px', fontSize: 13, color: C.muted }}>
          Проект не будет удалён физически — он скроется из списка (is_deleted = true).
          Все связанные данные сохранятся.
        </p>
        {!confirmDel ? (
          <Btn variant="danger" onClick={() => setConfirmDel(true)}>
            Удалить проект
          </Btn>
        ) : (
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <span style={{ fontSize: 13, color: C.error, fontWeight: 600 }}>
              Уверены? Это действие нельзя отменить через интерфейс.
            </span>
            <Btn variant="danger" onClick={softDelete} disabled={deleting}>
              {deleting ? 'Удаление…' : 'Да, удалить'}
            </Btn>
            <Btn variant="ghost" onClick={() => setConfirmDel(false)}>Отмена</Btn>
          </div>
        )}
      </div>
    </Modal>
  );
}

/* ── Модал создания проекта ───────────────────────────────────────────────── */
function CreateProjectModal({ open, onClose, onCreated }) {
  const { token } = useAuth();
  const [name,      setName]      = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate,   setEndDate]   = useState('');
  const [loading,   setLoading]   = useState(false);
  const [err,       setErr]       = useState('');

  useEffect(() => {
    if (open) { setName(''); setStartDate(''); setEndDate(''); setErr(''); }
  }, [open]);

  const submit = async () => {
    if (!name.trim()) { setErr('Укажите название проекта'); return; }
    setLoading(true); setErr('');
    try {
      const project = await API.createProject({
        name:       name.trim(),
        start_date: startDate || undefined,
        end_date:   endDate   || undefined,
      }, token);
      onCreated(project);
      onClose();
    } catch (e) { setErr(e.message); } finally { setLoading(false); }
  };

  return (
    <Modal open={open} onClose={onClose} title="Создать проект">
      <Input label="Название проекта" value={name} onChange={setName}
        placeholder="Название нового проекта" required />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Input label="Дата начала"    type="date" value={startDate} onChange={setStartDate} />
        <Input label="Дата окончания" type="date" value={endDate}   onChange={setEndDate} />
      </div>
      <ErrorBanner message={err} />
      <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 8 }}>
        <Btn variant="ghost" onClick={onClose}>Отмена</Btn>
        <Btn onClick={submit} disabled={loading}>
          {loading ? 'Создание…' : 'Создать проект'}
        </Btn>
      </div>
    </Modal>
  );
}

/* ── Модал профиля пользователя ───────────────────────────────────────────── */
function UserModal({ open, onClose }) {
  const { user, token, setUser, refreshUser } = useAuth();
  const [tab,        setTab]        = useState('profile');
  const [position,   setPosition]   = useState('');
  const [department, setDept]       = useState('');
  const [saving,     setSaving]     = useState(false);
  const [err,        setErr]        = useState('');
  const [promoteId,  setPromoteId]  = useState('');
  const [promoting,  setPromoting]  = useState(false);
  const [promoteMsg, setPromoteMsg] = useState('');

  useEffect(() => {
    if (open && user) {
      setPosition(user.position   ?? '');
      setDept(user.department ?? '');
      setErr('');
    }
  }, [open, user]);

  const saveProfile = async () => {
    setSaving(true); setErr('');
    try {
      const updated = await API.updateUser({ id: user.id, position, department }, token);
      setUser(updated);
    } catch (e) { setErr(e.message); } finally { setSaving(false); }
  };

  const promote = async () => {
    if (!promoteId.trim()) return;
    setPromoting(true); setPromoteMsg('');
    try {
      await API.updateUser({ id: promoteId.trim(), is_supervisor: true }, token);
      setPromoteMsg('Пользователь успешно назначен супервайзером.');
      setPromoteId('');
    } catch (e) { setPromoteMsg(`Ошибка: ${e.message}`); } finally { setPromoting(false); }
  };

  if (!user) return null;

  return (
    <Modal open={open} onClose={onClose} title="Аккаунт">
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <div style={{
          width: 72, height: 72, borderRadius: '50%',
          background: `linear-gradient(135deg, ${C.btn}, ${C.accentDark})`,
          color: '#fff', display: 'inline-flex', alignItems: 'center',
          justifyContent: 'center', fontSize: 28, fontWeight: 800, marginBottom: 12,
        }}>
          {user.full_name?.[0]?.toUpperCase() ?? '?'}
        </div>
        <div style={{ fontSize: 20, fontWeight: 700, color: C.navy }}>{user.full_name}</div>
        <div style={{ color: C.muted, fontSize: 14, marginTop: 3 }}>{user.email}</div>
        {user.is_supervisor && (
          <span style={{
            display: 'inline-block', marginTop: 8,
            background: '#DCFCE7', color: '#14532D',
            padding: '3px 12px', borderRadius: 999, fontSize: 12, fontWeight: 700,
          }}>Супервайзер</span>
        )}
      </div>

      <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: `1px solid ${C.border}`, paddingBottom: 12 }}>
        {['profile', ...(user.is_supervisor ? ['promote'] : [])].map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            background: tab === t ? C.accent : 'transparent',
            color:      tab === t ? C.navy   : C.muted,
            border: 'none', borderRadius: 7, padding: '6px 16px',
            fontFamily: FONT, fontSize: 13, fontWeight: 600, cursor: 'pointer',
          }}>
            {t === 'profile' ? 'Профиль' : 'Управление ролями'}
          </button>
        ))}
      </div>

      {tab === 'profile' && (
        <>
          <InfoGrid items={[
            ['Отдел',       user.department || '—', false],
            ['Должность',   user.position   || '—', false],
            ['Регистрация', user.created_at
              ? new Date(user.created_at).toLocaleDateString('ru') : '—', false],
          ]} />
          <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 16, marginTop: 4 }}>
            <Input label="Отдел"     value={department} onChange={setDept}     placeholder="Разработка" />
            <Input label="Должность" value={position}   onChange={setPosition} placeholder="Инженер" />
            <ErrorBanner message={err} />
            <Btn onClick={saveProfile} disabled={saving}>
              {saving ? 'Сохранение…' : 'Сохранить'}
            </Btn>
          </div>
        </>
      )}

      {tab === 'promote' && (
        <>
          <p style={{ color: C.muted, fontSize: 14, marginBottom: 16 }}>
            Введите UUID пользователя для назначения супервайзером.
          </p>
          <Input label="UUID пользователя" value={promoteId} onChange={setPromoteId}
            placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" />
          {promoteMsg && (
            <div style={{
              padding: '10px 14px', borderRadius: 9, marginBottom: 12, fontSize: 13,
              background: promoteMsg.startsWith('Ошибка') ? '#FEE2E2' : '#DCFCE7',
              color:      promoteMsg.startsWith('Ошибка') ? C.error   : C.success,
            }}>{promoteMsg}</div>
          )}
          <Btn onClick={promote} disabled={promoting || !promoteId.trim()}>
            {promoting ? 'Назначение…' : 'Назначить супервайзером'}
          </Btn>
        </>
      )}
    </Modal>
  );
}

/* ── HEADER ───────────────────────────────────────────────────────────────── */
export default function Header({
  page, setPage,
  projects, setProjects,
  selectedProject, setSelectedProject,
  onProjectCreated,
  onDownloadSpec,
}) {
  const { user, logout } = useAuth();
  const [userModalOpen,  setUserModalOpen]  = useState(false);
  const [projectModal,   setProjectModal]   = useState(false); // управление текущим
  const [createProjOpen, setCreateProjOpen] = useState(false);

  const isSuper = user?.is_supervisor;
  const ended   = isProjectEnded(selectedProject);

  const navItems = [
    ...(isSuper ? [{ key: 'analytics',    label: 'Аналитика' }] : []),
    { key: 'requirements', label: 'Требования' },
    { key: 'documents',    label: 'Документы'  },
    { key: 'ecr',          label: 'Запросы на изменение' },
    ...(isSuper ? [{ key: 'eco', label: 'Распоряжения' }] : []),
  ];

  const handleProjectChange = (e) => {
    const val = e.target.value;
    if (val === '_create') {
      e.target.value = selectedProject?.id ?? '';
      setCreateProjOpen(true);
    } else {
      setSelectedProject(projects.find(p => p.id === val) ?? null);
    }
  };

  const handleProjectUpdated = () => {
    setProjectModal(false);
    // Перезагружаем страницу чтобы список проектов обновился
    window.location.reload();
  };

  const handleProjectDeleted = (id) => {
    const remaining = projects.filter(p => p.id !== id);
    setProjects(remaining);
    if (selectedProject?.id === id) {
      setSelectedProject(remaining[0] ?? null);
    }
  };

  return (
    <>
      <header style={{
        background: '#fff',
        borderBottom: `2.5px solid ${C.accent}`,
        padding: '0 28px',
        display: 'flex', alignItems: 'center', gap: 16,
        height: 66,
        boxShadow: '0 2px 16px rgba(29,111,164,.07)',
        position: 'sticky', top: 0, zIndex: 100,
        fontFamily: FONT,
      }}>

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 150 }}>
          <div style={{
            width: 34, height: 34, borderRadius: 9,
            background: `linear-gradient(135deg, ${C.btn}, ${C.accentDark})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18, color: '#fff',
          }}>📋</div>
          <span style={{ fontWeight: 800, fontSize: 16, color: C.navy }}>NovaReq</span>
        </div>

        {/* Project selector + info button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ position: 'relative' }}>
            <select
              value={selectedProject?.id ?? ''}
              onChange={handleProjectChange}
              style={{
                padding: '7px 30px 7px 12px', borderRadius: 9,
                border: `1.5px solid ${ended ? '#FCA5A5' : C.border}`,
                background: ended ? '#FFF5F5' : '#EFF6FF',
                fontFamily: FONT, fontSize: 14, fontWeight: 600,
                color: ended ? C.error : C.text,
                cursor: 'pointer', minWidth: 180, maxWidth: 240,
                appearance: 'none',
              }}
            >
              <option value="">— Выберите проект —</option>
              {projects.map(p => {
                const e = isProjectEnded(p);
                return (
                  <option key={p.id} value={p.id}>
                    {e ? '⚫ ' : ''}{p.name}
                  </option>
                );
              })}
              {isSuper && (
                <option value="_create" style={{ color: C.btn, fontWeight: 700 }}>
                  ✚ Создать проект…
                </option>
              )}
            </select>
            <span style={{
              position: 'absolute', right: 10, top: '50%',
              transform: 'translateY(-50%)', pointerEvents: 'none',
              color: C.muted, fontSize: 10,
            }}>▼</span>
          </div>

          {/* Индикатор завершённого проекта */}
          {ended && (
            <span style={{
              background: '#FEE2E2', color: '#7F1D1D',
              padding: '3px 10px', borderRadius: 999,
              fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap',
            }}>
              ⚫ Завершён
            </span>
          )}

          {/* Кнопка управления проектом (только если выбран) */}
          {selectedProject && isSuper && (
            <button
              onClick={() => setProjectModal(true)}
              title="Управление проектом"
              style={{
                background: 'none', border: `1.5px solid ${C.border}`,
                borderRadius: 8, padding: '5px 10px', cursor: 'pointer',
                color: C.muted, fontSize: 14, lineHeight: 1,
                transition: 'all .15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = C.accentDark; e.currentTarget.style.color = C.btn; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.muted; }}
            >
              ⚙
            </button>
          )}
        </div>

        {/* Nav */}
        <nav style={{ display: 'flex', gap: 2, flex: 1 }}>
          {navItems.map(n => (
            <NavLink key={n.key} label={n.label} active={page === n.key}
              onClick={() => setPage(n.key)} />
          ))}
        </nav>

        {/* Download spec */}
        {selectedProject && isSuper && (
          <button
            onClick={onDownloadSpec}
            title="Сгенерировать ТЗ (baseline-требования)"
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: '#EFF6FF', border: `1.5px solid ${C.border}`,
              borderRadius: 9, padding: '7px 14px', cursor: 'pointer',
              fontFamily: FONT, fontSize: 13, fontWeight: 600, color: C.navy,
              whiteSpace: 'nowrap', transition: 'all .15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = C.accent; }}
            onMouseLeave={e => { e.currentTarget.style.background = '#EFF6FF'; }}
          >
            📥 Скачать ТЗ
          </button>
        )}

        {/* Right side */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          

          <button
            onClick={() => setUserModalOpen(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: 'none', border: `1.5px solid ${C.border}`,
              borderRadius: 9, padding: '6px 12px', cursor: 'pointer', fontFamily: FONT,
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = C.accentDark; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; }}
          >
            <div style={{
              width: 28, height: 28, borderRadius: '50%',
              background: `linear-gradient(135deg, ${C.btn}, ${C.accentDark})`,
              color: '#fff', display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontSize: 13, fontWeight: 700,
            }}>
              {user?.full_name?.[0]?.toUpperCase() ?? '?'}
            </div>
            <span style={{ fontSize: 14, fontWeight: 600, color: C.text }}>
              {user?.full_name?.split(' ')[0] ?? 'Аккаунт'}
            </span>
          </button>

          <button
            onClick={logout}
            style={{
              background: 'none', border: '1.5px solid #FED7D7',
              borderRadius: 9, padding: '7px 12px', cursor: 'pointer',
              color: C.error, fontFamily: FONT, fontSize: 13, fontWeight: 600,
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#FEF2F2'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'none'; }}
          >Выйти</button>
        </div>
      </header>

      <UserModal    open={userModalOpen}  onClose={() => setUserModalOpen(false)} />
      <ProjectModal
        open={projectModal}
        project={selectedProject}
        onClose={() => setProjectModal(false)}
        onUpdated={handleProjectUpdated}
        onDeleted={handleProjectDeleted}
      />
      <CreateProjectModal
        open={createProjOpen}
        onClose={() => setCreateProjOpen(false)}
        onCreated={p => { onProjectCreated(p); setCreateProjOpen(false); }}
      />
    </>
  );
}
