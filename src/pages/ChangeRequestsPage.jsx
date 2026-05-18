import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { API } from '../api';
import { C, FONT } from '../theme';
import {
  Card, Table, PageHeader, Btn, Modal,
  InfoGrid, StatusBadge, Input, Textarea, ErrorBanner, Spinner,
} from '../components/UI';

const ECR_TRANSITIONS = {
  open:        [{ status: 'review',       label: 'Взять в ревью',  variant: 'accent'  }],
  review:      [{ status: 'approved',     label: '✓ Одобрить',     variant: 'success' },
                { status: 'rejected',     label: '✗ Отклонить',    variant: 'danger'  }],
  approved:    [{ status: 'implemented',  label: 'Отметить выполненным', variant: 'primary' }],
  rejected:    [],
  implemented: [],
};

/* ── ECR Detail modal ─────────────────────────────────────────────────────── */
function ECRModal({ open, ecr, onClose, onUpdated, isSuper }) {
  const { token, user } = useAuth();
  const [showEco,  setShowEco]  = useState(false);
  const [ecoTitle, setEcoTitle] = useState('');
  const [ecoJust,  setEcoJust]  = useState('');
  const [ecoDate,  setEcoDate]  = useState('');
  const [loading,  setLoading]  = useState(false);
  const [err,      setErr]      = useState('');

  useEffect(() => {
    if (!open) { setShowEco(false); setEcoTitle(''); setEcoJust(''); setEcoDate(''); setErr(''); }
  }, [open]);

  const updateStatus = async (status) => {
    try {
      await API.patchEcr(ecr.id, { status }, token);
      onUpdated();
      onClose();
    } catch (e) { setErr(e.message); }
  };

  const createEco = async () => {
    if (!ecoTitle.trim()) { setErr('Введите название распоряжения'); return; }
    setLoading(true); setErr('');
    try {
      await API.createEco({
        ecr_id:        ecr.id,
        title:         ecoTitle.trim(),
        justification: ecoJust,
        assigned_to:   user?.id,
        effective_date: ecoDate || undefined,
        requirement_links: [],
      }, token);
      onUpdated();
      onClose();
    } catch (e) { setErr(e.message); } finally { setLoading(false); }
  };

  if (!ecr) return null;
  const transitions = (isSuper ? ECR_TRANSITIONS[ecr.status] : []) ?? [];

  return (
    <Modal open={open} onClose={onClose} title={ecr.title} wide>
      <InfoGrid items={[
        ['Инициатор',  ecr.requester_name  ?? '—',  false],
        ['Проект',     ecr.project_name    ?? '—',  false],
        ['Статус',     ecr.status,                  true ],
        ['Приоритет',  ecr.priority,                true ],
        ['Создан',     ecr.created_at ? new Date(ecr.created_at).toLocaleDateString('ru') : '—', false],
        ['Закрыт',     ecr.resolved_at ? new Date(ecr.resolved_at).toLocaleDateString('ru') : 'Открыт', false],
      ]} />

      {ecr.description && (
        <div style={{ background: '#F8FBFF', borderRadius: 9, padding: '14px 16px', marginBottom: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.muted, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.4px' }}>
            Описание
          </div>
          <p style={{ margin: 0, fontSize: 14, color: C.text, lineHeight: 1.7 }}>{ecr.description}</p>
        </div>
      )}

      {/* Status actions */}
      {transitions.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.navy, marginBottom: 10 }}>
            Изменить статус
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            {transitions.map(t => (
              <Btn key={t.status} variant={t.variant} onClick={() => updateStatus(t.status)}>
                {t.label}
              </Btn>
            ))}
          </div>
        </div>
      )}

      {/* Create ECO (only when approved) */}
      {isSuper && ecr.status === 'approved' && !showEco && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ height: 1, background: C.border, marginBottom: 20 }} />
          <Btn variant="outline" onClick={() => setShowEco(true)}>
            + Создать распоряжение об изменении
          </Btn>
        </div>
      )}

      {showEco && (
        <div style={{
          background: '#F8FBFF', borderRadius: 12,
          padding: '20px 20px', marginBottom: 20,
          border: `1.5px solid ${C.border}`,
        }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: C.navy, marginBottom: 16 }}>
            Новое распоряжение об изменении
          </div>
          <Input label="Название" value={ecoTitle} onChange={setEcoTitle}
            placeholder="Кратко опишите распоряжение" required />
          <Textarea label="Обоснование" value={ecoJust} onChange={setEcoJust}
            placeholder="Обоснование изменения..." />
          <Input label="Дата вступления" type="date" value={ecoDate} onChange={setEcoDate} />
          <div style={{ display: 'flex', gap: 10 }}>
            <Btn onClick={createEco} disabled={loading}>
              {loading ? 'Создание…' : 'Создать распоряжение'}
            </Btn>
            <Btn variant="ghost" onClick={() => setShowEco(false)}>Отмена</Btn>
          </div>
        </div>
      )}

      <ErrorBanner message={err} />
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Btn variant="ghost" onClick={onClose}>Закрыть</Btn>
      </div>
    </Modal>
  );
}

/* ── Change Requests page ─────────────────────────────────────────────────── */
export default function ChangeRequestsPage({ selectedProject }) {
  const { token, user } = useAuth();
  const isSuper = user?.is_supervisor;
  const [ecrs,    setEcrs]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      let data = await API.ecrs(token);
      data = data ?? [];
      // Regular users see only their own requests
      if (!isSuper) {
        data = data.filter(e =>
          e.requester_id === user?.id || e.requester_name === user?.full_name
        );
      }
      // Filter by selected project
      if (selectedProject) {
        data = data.filter(e =>
          e.project_id === selectedProject.id || e.project_name === selectedProject.name
        );
      }
      setEcrs(data);
    } catch { setEcrs([]); } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [selectedProject?.id]);

  const fmtDate = (v) => v ? new Date(v).toLocaleDateString('ru') : '—';

  const columns = [
    { key: 'title',          label: 'Название', render: v => (
      <span style={{ fontWeight: 600, color: C.navy }}>{v}</span>
    )},
    { key: 'requester_name', label: 'Инициатор' },
    ...(isSuper ? [{ key: 'project_name', label: 'Проект' }] : []),
    { key: 'priority',       label: 'Приоритет', render: v => <StatusBadge status={v} /> },
    { key: 'status',         label: 'Статус',    render: v => <StatusBadge status={v} /> },
    { key: 'created_at',     label: 'Создан',    render: fmtDate },
    { key: 'resolved_at',    label: 'Закрыт',    render: fmtDate },
    ...(isSuper ? [{
      key: '_quick',
      label: '',
      render: (_, row) => {
        const transitions = ECR_TRANSITIONS[row.status] ?? [];
        if (!transitions.length) return null;
        const first = transitions[0];
        return (
          <Btn
            small
            variant={first.variant}
            onClick={async (e) => {
              e.stopPropagation();
              try { await API.patchEcr(row.id, { status: first.status }, token); load(); }
              catch (err) { alert(err.message); }
            }}
          >
            {first.label}
          </Btn>
        );
      },
    }] : []),
  ];

  return (
    <div>
      <PageHeader
        title="Запросы на изменение"
        subtitle={isSuper
          ? (selectedProject?.name ?? 'Все проекты')
          : 'Мои запросы'
        }
      >
        <Btn onClick={load} variant="ghost" small>↻ Обновить</Btn>
      </PageHeader>

      {!isSuper && (
        <div style={{
          background: '#EFF6FF', border: `1px solid ${C.border}`,
          borderRadius: 10, padding: '12px 18px', marginBottom: 20,
          fontSize: 14, color: C.muted,
        }}>
          Отображаются только ваши запросы. Для создания запроса откройте требование в таблице требований.
        </div>
      )}

      <Card style={{ padding: 0, overflow: 'hidden' }}>
        <Table
          columns={columns}
          data={ecrs}
          loading={loading}
          onRowClick={setSelected}
        />
      </Card>

      <ECRModal
        open={!!selected}
        ecr={selected}
        isSuper={isSuper}
        onClose={() => setSelected(null)}
        onUpdated={() => { load(); setSelected(null); }}
      />
    </div>
  );
}
