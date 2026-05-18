import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { API } from '../api';
import { C, FONT } from '../theme';
import { Btn, Modal, InfoGrid, Input, ErrorBanner } from './UI';

/* ── Nav link ─────────────────────────────────────────────────────────────── */
function NavLink({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: active ? C.accent : 'transparent',
        color:      active ? C.navy   : C.muted,
        border: 'none', borderRadius: 9,
        padding: '7px 14px', cursor: 'pointer',
        fontFamily: FONT, fontSize: 14, fontWeight: 600,
        transition: 'all .15s', whiteSpace: 'nowrap',
      }}
      onMouseEnter={e => { if (!active) e.currentTarget.style.background = '#EFF6FF'; }}
      onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}
    >
      {label}
    </button>
  );
}

/* ── Create Project modal ─────────────────────────────────────────────────── */
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
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Создать проект">
      <Input
        label="Название проекта"
        value={name}
        onChange={setName}
        placeholder="Название нового проекта"
        required
      />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Input
          label="Дата начала"
          type="date"
          value={startDate}
          onChange={setStartDate}
        />
        <Input
          label="Дата окончания"
          type="date"
          value={endDate}
          onChange={setEndDate}
        />
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

/* ── User modal ───────────────────────────────────────────────────────────── */
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

  // Синхронизируем поля формы с актуальными данными пользователя
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
      const updated = await API.updateUser(
        { id: user.id, position, department },
        token,
      );
      setUser(updated);           // нормализация происходит в AuthContext
    } catch (e) { setErr(e.message); } finally { setSaving(false); }
  };

  const promote = async () => {
    if (!promoteId.trim()) return;
    setPromoting(true); setPromoteMsg('');
    try {
      await API.updateUser({ id: promoteId.trim(), is_supervisor: true }, token);
      setPromoteMsg('Пользователь успешно назначен супервайзером.');
      setPromoteId('');
    } catch (e) {
      setPromoteMsg(`Ошибка: ${e.message}`);
    } finally { setPromoting(false); }
  };

  if (!user) return null;

  return (
    <Modal open={open} onClose={onClose} title="Аккаунт">
      {/* Avatar */}
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <div style={{
          width: 72, height: 72, borderRadius: '50%',
          background: `linear-gradient(135deg, ${C.btn}, ${C.accentDark})`,
          color: '#fff', display: 'inline-flex',
          alignItems: 'center', justifyContent: 'center',
          fontSize: 28, fontWeight: 800, marginBottom: 12,
        }}>
          {user.full_name?.[0]?.toUpperCase() ?? '?'}
        </div>
        <div style={{ fontSize: 20, fontWeight: 700, color: C.navy }}>
          {user.full_name}
        </div>
        <div style={{ color: C.muted, fontSize: 14, marginTop: 3 }}>{user.email}</div>
        {user.is_supervisor && (
          <span style={{
            display: 'inline-block', marginTop: 8,
            background: '#DCFCE7', color: '#14532D',
            padding: '3px 12px', borderRadius: 999,
            fontSize: 12, fontWeight: 700,
          }}>
            Супервайзер
          </span>
        )}
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex', gap: 4, marginBottom: 20,
        borderBottom: `1px solid ${C.border}`, paddingBottom: 12,
      }}>
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
            ['Обновлён',    user.updated_at
              ? new Date(user.updated_at).toLocaleDateString('ru')  : '—', false],
          ]} />
          <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 16, marginTop: 4 }}>
            <p style={{ margin: '0 0 14px', fontWeight: 700, color: C.navy, fontSize: 14 }}>
              Редактировать
            </p>
            <Input label="Отдел"     value={department} onChange={setDept}
              placeholder="Разработка" />
            <Input label="Должность" value={position}   onChange={setPosition}
              placeholder="Инженер" />
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
            UUID можно найти в базе данных или передать пользователю из URL его профиля.
          </p>
          <Input
            label="UUID пользователя"
            value={promoteId}
            onChange={setPromoteId}
            placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
          />
          {promoteMsg && (
            <div style={{
              padding: '10px 14px', borderRadius: 9, marginBottom: 12, fontSize: 13,
              background: promoteMsg.startsWith('Ошибка') ? '#FEE2E2' : '#DCFCE7',
              color:      promoteMsg.startsWith('Ошибка') ? C.error   : C.success,
            }}>
              {promoteMsg}
            </div>
          )}
          <Btn
            onClick={promote}
            disabled={promoting || !promoteId.trim()}
          >
            {promoting ? 'Назначение…' : 'Назначить супервайзером'}
          </Btn>
        </>
      )}
    </Modal>
  );
}

/* ── Header ───────────────────────────────────────────────────────────────── */
export default function Header({
  page, setPage,
  projects, selectedProject, setSelectedProject,
  onProjectCreated,
  onDownloadSpec,
}) {
  const { user, logout } = useAuth();
  const [userModalOpen,   setUserModalOpen]   = useState(false);
  const [createProjOpen,  setCreateProjOpen]  = useState(false);

  const isSuper = user?.is_supervisor;

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
      // Сбрасываем select обратно на текущий проект, чтобы не показывался
      // несуществующий вариант после закрытия модала
      e.target.value = selectedProject?.id ?? '';
      setCreateProjOpen(true);
    } else {
      setSelectedProject(projects.find(p => p.id === val) ?? null);
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 160 }}>
          <div style={{
            width: 34, height: 34, borderRadius: 9,
            background: `linear-gradient(135deg, ${C.btn}, ${C.accentDark})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18, color: '#fff', flexShrink: 0,
          }}>📋</div>
          <span style={{ fontWeight: 800, fontSize: 16, color: C.navy }}>
            NovaReq
          </span>
        </div>

        {/* Project selector ─────────────────────────────────────────────── */}
        <div style={{ position: 'relative', minWidth: 200, maxWidth: 260 }}>
          <select
            value={selectedProject?.id ?? ''}
            onChange={handleProjectChange}
            style={{
              width: '100%',
              padding: '7px 12px', borderRadius: 9,
              border: `1.5px solid ${C.border}`,
              background: '#EFF6FF', fontFamily: FONT,
              fontSize: 14, fontWeight: 600,
              color: C.text, cursor: 'pointer',
              appearance: 'none',
              paddingRight: 32,
            }}
          >
            <option value="">— Выберите проект —</option>
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
            {/* Опция создания видна только супервайзеру */}
            {isSuper && (
              <option value="_create" style={{ color: C.btn, fontWeight: 700 }}>
                ✚ Создать проект…
              </option>
            )}
          </select>
          {/* Стрелка select */}
          <span style={{
            position: 'absolute', right: 10, top: '50%',
            transform: 'translateY(-50%)',
            pointerEvents: 'none', color: C.muted, fontSize: 11,
          }}>▼</span>
        </div>

        {/* Nav ─────────────────────────────────────────────────────────── */}
        <nav style={{ display: 'flex', gap: 2, flex: 1 }}>
          {navItems.map(n => (
            <NavLink
              key={n.key}
              label={n.label}
              active={page === n.key}
              onClick={() => setPage(n.key)}
            />
          ))}
        </nav>

        {/* Generate spec ───────────────────────────────────────────────── */}
        {selectedProject && isSuper && (
          <button
            onClick={onDownloadSpec}
            title="Сгенерировать техническое задание (baseline-требования)"
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

        {/* Right side ──────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Должность */}
          {user?.position && (
            <span style={{
              background: '#EFF6FF', color: C.muted,
              border: `1px solid ${C.border}`,
              padding: '4px 10px', borderRadius: 999,
              fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap',
            }}>
              {user.position}
            </span>
          )}

          {/* Роль */}
          {isSuper && (
            <span style={{
              background: '#DCFCE7', color: '#14532D',
              padding: '4px 10px', borderRadius: 999,
              fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap',
            }}>
              Супервайзер
            </span>
          )}

          {/* User button */}
          <button
            onClick={() => setUserModalOpen(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: 'none', border: `1.5px solid ${C.border}`,
              borderRadius: 9, padding: '6px 12px',
              cursor: 'pointer', fontFamily: FONT,
              transition: 'border-color .15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = C.accentDark; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; }}
          >
            <div style={{
              width: 28, height: 28, borderRadius: '50%',
              background: `linear-gradient(135deg, ${C.btn}, ${C.accentDark})`,
              color: '#fff', display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              fontSize: 13, fontWeight: 700,
            }}>
              {user?.full_name?.[0]?.toUpperCase() ?? '?'}
            </div>
            <span style={{ fontSize: 14, fontWeight: 600, color: C.text }}>
              {user?.full_name?.split(' ')[0] ?? 'Аккаунт'}
            </span>
          </button>

          {/* Logout */}
          <button
            onClick={logout}
            title="Выйти из аккаунта"
            style={{
              background: 'none', border: '1.5px solid #FED7D7',
              borderRadius: 9, padding: '7px 12px',
              cursor: 'pointer', color: C.error,
              fontFamily: FONT, fontSize: 13, fontWeight: 600,
              transition: 'all .15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#FEF2F2'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'none'; }}
          >
            Выйти
          </button>
        </div>
      </header>

      {/* Modals */}
      <UserModal
        open={userModalOpen}
        onClose={() => setUserModalOpen(false)}
      />
      <CreateProjectModal
        open={createProjOpen}
        onClose={() => setCreateProjOpen(false)}
        onCreated={project => {
          onProjectCreated(project);
          setCreateProjOpen(false);
        }}
      />
    </>
  );
}
