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

/* ── Создание ECO для конкретного требования ─────────────────────────────── */
function CreateECOModal({ open, ecr, requirement, onClose, onCreated }) {
  const { token, user } = useAuth();
  const [title,        setTitle]        = useState('');
  const [justification,setJustification]= useState('');
  const [changeReason, setChangeReason] = useState('');
  const [assignedTo,   setAssignedTo]   = useState(user?.id ?? '');
  const [effectiveDate,setEffectiveDate]= useState('');
  const [loading,      setLoading]      = useState(false);
  const [err,          setErr]          = useState('');

  useEffect(() => {
    if (open) {
      setTitle('');
      setJustification('');
      setChangeReason('');
      setAssignedTo(user?.id ?? '');
      setEffectiveDate('');
      setErr('');
    }
  }, [open]);

  const submit = async () => {
    if (!title.trim()) { setErr('Введите название распоряжения'); return; }
    if (!assignedTo)   { setErr('Укажите исполнителя');           return; }
    setLoading(true); setErr('');
    try {
      // createEcoForReq создаёт:
      //  1) распоряжение об изменении
      //  2) новую версию требования (draft, not baseline)
      //  3) eco_requirement_link (old_version → new_version)
      await API.createEcoForReq({
        ecr_id:                ecr.id,
        requirement_id:        requirement.id,
        requirement_version:   requirement.version_number,
        title:                 title.trim(),
        justification:         justification || undefined,
        change_reason:         changeReason  || undefined,
        assigned_to:           assignedTo,
        effective_date:        effectiveDate || undefined,
      }, token);
      onCreated();
      onClose();
    } catch (e) { setErr(e.message); } finally { setLoading(false); }
  };

  if (!ecr || !requirement) return null;

  return (
    <Modal open={open} onClose={onClose} title="Создать распоряжение об изменении" wide>
      {/* Контекст: информация о запросе */}
      <div style={{
        background: '#EFF6FF', borderRadius: 10,
        padding: '14px 18px', marginBottom: 16,
        border: `1px solid ${C.border}`,
      }}>
        <div style={{
          fontSize: 11, fontWeight: 700, color: C.muted,
          textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 6,
        }}>
          Запрос на изменение
        </div>
        <div style={{ fontWeight: 700, color: C.navy, fontSize: 15 }}>{ecr.title}</div>
        {ecr.description && (
          <div style={{ fontSize: 13, color: C.text, marginTop: 6, lineHeight: 1.6 }}>
            {ecr.description}
          </div>
        )}
        <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
          <StatusBadge status={ecr.priority} />
          <StatusBadge status={ecr.status} />
        </div>
      </div>

      {/* Контекст: требование */}
      <div style={{
        background: '#F8FBFF', borderRadius: 10,
        padding: '14px 18px', marginBottom: 20,
        border: `1px solid ${C.border}`,
      }}>
        <div style={{
          fontSize: 11, fontWeight: 700, color: C.muted,
          textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 6,
        }}>
          Затронутое требование
        </div>
        <div style={{ fontWeight: 600, color: C.navy }}>{requirement.title}</div>
        <div style={{ fontSize: 13, color: C.muted, marginTop: 3 }}>
          v{requirement.version_number} · <StatusBadge status={requirement.status} />
        </div>
        {requirement.description && (
          <div style={{ fontSize: 13, color: C.text, marginTop: 6 }}>
            {requirement.description}
          </div>
        )}
        <div style={{
          marginTop: 10, padding: '8px 12px',
          background: '#EFF6FF', borderRadius: 7, fontSize: 12, color: C.muted,
        }}>
          После создания распоряжения будет автоматически создана версия v{requirement.version_number + 1}
          со статусом <strong>draft</strong>. Она станет baseline после исполнения распоряжения.
        </div>
      </div>

      {/* Поля распоряжения */}
      <Input label="Название распоряжения" value={title} onChange={setTitle}
        placeholder="Кратко опишите суть распоряжения" required />
      <Textarea label="Обоснование" value={justification} onChange={setJustification}
        placeholder="Обоснование изменения…" />
      <Textarea label="Причина изменения требования" value={changeReason}
        onChange={setChangeReason}
        placeholder="Почему требование нужно изменить…" />
      <Input label="Дата вступления в силу" type="date"
        value={effectiveDate} onChange={setEffectiveDate} />

      <ErrorBanner message={err} />
      <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
        <Btn variant="ghost" onClick={onClose}>Отмена</Btn>
        <Btn onClick={submit} disabled={loading}>
          {loading ? 'Создание…' : 'Создать распоряжение'}
        </Btn>
      </div>
    </Modal>
  );
}

/* ── Детали ECR ───────────────────────────────────────────────────────────── */
function ECRDetailModal({ open, ecr, onClose, isSuper, onUpdated }) {
  const { token } = useAuth();
  const [linkedReqs, setLinkedReqs] = useState([]);
  const [loadingReqs, setLoadingReqs] = useState(false);
  const [ecoTarget,   setEcoTarget]   = useState(null); // requirement для создания ECO
  const [err,         setErr]         = useState('');

  useEffect(() => {
    if (!open || !ecr) return;
    setLoadingReqs(true);
    setErr('');
    API.ecrRequirements(ecr.id, token)
      .then(data => setLinkedReqs(data ?? []))
      .catch(e => setErr(e.message))
      .finally(() => setLoadingReqs(false));
  }, [open, ecr?.id]);

  useEffect(() => {
    if (!open) { setLinkedReqs([]); setEcoTarget(null); setErr(''); }
  }, [open]);

  const updateStatus = async (status) => {
    setErr('');
    try {
      await API.patchEcr(ecr.id, { status }, token);
      onUpdated();
      onClose();
    } catch (e) { setErr(e.message); }
  };

  if (!ecr) return null;
  const transitions = (isSuper ? ECR_TRANSITIONS[ecr.status] : []) ?? [];
  const canCreateEco = isSuper && ecr.status === 'approved';

  return (
    <>
      <Modal open={open && !ecoTarget} onClose={onClose} title={ecr.title} wide>
        <InfoGrid items={[
          ['Инициатор',  ecr.requester_name ?? '—',  false],
          ['Проект',     ecr.project_name   ?? '—',  false],
          ['Статус',     ecr.status,                  true ],
          ['Приоритет',  ecr.priority,                true ],
          ['Создан',     ecr.created_at ? new Date(ecr.created_at).toLocaleDateString('ru') : '—', false],
          ['Закрыт',     ecr.resolved_at ? new Date(ecr.resolved_at).toLocaleDateString('ru') : 'Открыт', false],
        ]} />

        {ecr.description && (
          <div style={{
            background: '#F8FBFF', borderRadius: 9,
            padding: '14px 16px', marginBottom: 20,
          }}>
            <div style={{
              fontSize: 12, fontWeight: 700, color: C.muted,
              textTransform: 'uppercase', letterSpacing: '.4px', marginBottom: 6,
            }}>Описание</div>
            <p style={{ margin: 0, fontSize: 14, color: C.text, lineHeight: 1.7 }}>
              {ecr.description}
            </p>
          </div>
        )}

        {/* Изменение статуса */}
        {transitions.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.navy, marginBottom: 10 }}>
              Изменить статус
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              {transitions.map(t => (
                <Btn key={t.status} variant={t.variant}
                  onClick={() => updateStatus(t.status)}>
                  {t.label}
                </Btn>
              ))}
            </div>
          </div>
        )}

        {/* Прикреплённые требования */}
        <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 20, marginTop: 4 }}>
          <div style={{
            fontSize: 14, fontWeight: 700, color: C.navy, marginBottom: 12,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <span>Прикреплённые требования</span>
            {canCreateEco && (
              <span style={{ fontSize: 12, color: C.muted, fontWeight: 400 }}>
                Нажмите «Создать распоряжение» для каждого требования отдельно
              </span>
            )}
          </div>

          {loadingReqs ? <Spinner size={24} /> : linkedReqs.length === 0 ? (
            <div style={{ color: C.muted, fontSize: 14, padding: '12px 0' }}>
              Нет прикреплённых требований
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {linkedReqs.map(req => (
                <div key={`${req.id}-${req.version_number}`} style={{
                  background: req.has_eco ? '#F0FDF4' : '#F8FBFF',
                  border: `1px solid ${req.has_eco ? '#86EFAC' : C.border}`,
                  borderRadius: 9, padding: '12px 16px',
                  display: 'flex', alignItems: 'center', gap: 12,
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, color: C.navy, fontSize: 14 }}>
                      {req.title}
                    </div>
                    <div style={{ fontSize: 12, color: C.muted, marginTop: 3, display: 'flex', gap: 8 }}>
                      <span>v{req.version_number}</span>
                      <StatusBadge status={req.status} />
                      {req.type_name && <span>· {req.type_name}</span>}
                    </div>
                  </div>
                  {canCreateEco && (
                    req.has_eco ? (
                      <span style={{
                        fontSize: 12, color: '#14532D', fontWeight: 600,
                        background: '#DCFCE7', padding: '4px 12px', borderRadius: 999,
                      }}>
                        ✓ Распоряжение создано
                      </span>
                    ) : (
                      <Btn small variant="primary"
                        onClick={() => setEcoTarget(req)}>
                        Создать распоряжение
                      </Btn>
                    )
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <ErrorBanner message={err} />
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
          <Btn variant="ghost" onClick={onClose}>Закрыть</Btn>
        </div>
      </Modal>

      {/* Создание ECO для выбранного требования */}
      <CreateECOModal
        open={!!ecoTarget}
        ecr={ecr}
        requirement={ecoTarget}
        onClose={() => setEcoTarget(null)}
        onCreated={() => {
          setEcoTarget(null);
          // Перезагружаем список требований чтобы обновить has_eco
          API.ecrRequirements(ecr.id, token)
            .then(data => setLinkedReqs(data ?? []))
            .catch(() => {});
          onUpdated();
        }}
      />
    </>
  );
}

/* ── Страница запросов на изменение ──────────────────────────────────────── */
export default function ChangeRequestsPage({ selectedProject }) {
  const { token, user } = useAuth();
  const isSuper = user?.is_supervisor;
  const [ecrs,     setEcrs]     = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [selected, setSelected] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      let data = await API.ecrs(token);
      data = data ?? [];
      if (!isSuper) {
        data = data.filter(e =>
          e.requester_id === user?.id || e.requester_name === user?.full_name,
        );
      }
      if (selectedProject) {
        data = data.filter(e =>
          e.project_id === selectedProject.id || e.project_name === selectedProject.name,
        );
      }
      setEcrs(data);
    } catch { setEcrs([]); } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [selectedProject?.id]);

  const fmtDate = v => v ? new Date(v).toLocaleDateString('ru') : '—';

  const columns = [
    { key: 'title',          label: 'Название', render: v => (
      <span style={{ fontWeight: 600, color: C.navy }}>{v}</span>
    )},
    { key: 'requester_name', label: 'Инициатор' },
    ...(isSuper ? [{ key: 'project_name', label: 'Проект' }] : []),
    { key: 'priority',       label: 'Приоритет', render: v => <StatusBadge status={v} /> },
    { key: 'status',         label: 'Статус',    render: v => <StatusBadge status={v} /> },
    { key: 'created_at',     label: 'Создан',    render: fmtDate },
    ...(isSuper ? [{
      key: '_quick', label: '',
      render: (_, row) => {
        const t = (ECR_TRANSITIONS[row.status] ?? [])[0];
        if (!t) return null;
        return (
          <Btn small variant={t.variant}
            onClick={async e => {
              e.stopPropagation();
              try { await API.patchEcr(row.id, { status: t.status }, token); load(); }
              catch (err) { alert(err.message); }
            }}>
            {t.label}
          </Btn>
        );
      },
    }] : []),
  ];

  return (
    <div>
      <PageHeader
        title="Запросы на изменение"
        subtitle={isSuper ? (selectedProject?.name ?? 'Все проекты') : 'Мои запросы'}
      >
        <Btn onClick={load} variant="ghost" small>↻ Обновить</Btn>
      </PageHeader>

      {!isSuper && (
        <div style={{
          background: '#EFF6FF', border: `1px solid ${C.border}`,
          borderRadius: 10, padding: '12px 18px', marginBottom: 20,
          fontSize: 14, color: C.muted,
        }}>
          Отображаются только ваши запросы.
          Для создания запроса откройте требование на вкладке «Требования».
        </div>
      )}

      <Card style={{ padding: 0, overflow: 'hidden' }}>
        <Table columns={columns} data={ecrs} loading={loading}
          onRowClick={setSelected} />
      </Card>

      <ECRDetailModal
        open={!!selected}
        ecr={selected}
        isSuper={isSuper}
        onClose={() => setSelected(null)}
        onUpdated={() => { load(); }}
      />
    </div>
  );
}
