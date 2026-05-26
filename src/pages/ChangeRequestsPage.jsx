import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { API } from '../api';
import { C, FONT } from '../theme';
import {
  Card, Table, PageHeader, Btn, Modal,
  InfoGrid, StatusBadge, Input, Textarea, ErrorBanner, Spinner,
} from '../components/UI';

const ECR_TRANSITIONS = {
  open:        [{ status: 'review',      label: 'Взять в ревью',       variant: 'accent'  }],
  review:      [{ status: 'approved',    label: '✓ Одобрить',          variant: 'success' },
                { status: 'rejected',   label: '✗ Отклонить',         variant: 'danger'  }],
  approved:    [{ status: 'implemented', label: 'Отметить выполненным', variant: 'primary' }],
  rejected:    [],
  implemented: [],
};

/* ── Модал создания ECO для конкретного требования ───────────────────────── */
function CreateECOModal({ open, ecr, requirement, onClose, onCreated }) {
  const { token, user } = useAuth();
  const [title,        setTitle]        = useState('');
  // justification и changeReason — одно поле
const [description, setDescription] = useState('');
const [justification, setJustification] = useState('');
  const [assignedTo,   setAssignedTo]   = useState('');
  const [effectiveDate,setEffectiveDate] = useState('');
  const [loading,      setLoading]      = useState(false);
  const [err,          setErr]          = useState('');

  useEffect(() => {
    if (open) {
      setTitle('');
      setJustification('');
      setAssignedTo(user?.id ?? '');
      setEffectiveDate('');
      setErr('');
      setDescription('');
    }
  }, [open, user?.id]);

  const submit = async () => {
    if (!title.trim())      { setErr('Введите название распоряжения'); return; }
    if (!assignedTo.trim()) { setErr('Укажите UUID исполнителя');      return; }
    setLoading(true); setErr('');
    try {
      // justification и change_reason принимают одно и то же значение
      await API.createEcoForReq({
  ecr_id:              ecr.id,
  requirement_id:      requirement.id,
  requirement_version: requirement.version_number,
  title:               title.trim(),
  description:         description || undefined,
  justification:       justification || undefined,
  change_reason:       justification || undefined,
  assigned_to:         assignedTo.trim(),
  effective_date:      effectiveDate || undefined,
      }, token);
      onCreated();
      onClose();
    } catch (e) { setErr(e.message); } finally { setLoading(false); }
  };

  if (!ecr || !requirement) return null;

  return (
    <Modal open={open} onClose={onClose} title="Создать распоряжение об изменении" wide>

      {/* Информация о запросе */}
      <div style={{
        background: `linear-gradient(135deg, #EFF6FF, #E0EDFF)`,
        border: `1.5px solid ${C.accentDark}`,
        borderRadius: 12, padding: '16px 20px', marginBottom: 14,
      }}>
        <div style={{
          fontSize: 11, fontWeight: 800, color: C.accentDark,
          textTransform: 'uppercase', letterSpacing: '.8px', marginBottom: 8,
        }}>
          📋 Запрос на изменение
        </div>
        <div style={{ fontSize: 16, fontWeight: 700, color: C.navy, marginBottom: 4 }}>
          {ecr.title}
        </div>
        {ecr.description && (
          <div style={{ fontSize: 13, color: C.text, lineHeight: 1.6, marginBottom: 8 }}>
            {ecr.description}
          </div>
        )}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <StatusBadge status={ecr.priority} />
          <StatusBadge status={ecr.status} />
          {ecr.requester_name && (
            <span style={{ fontSize: 12, color: C.muted }}>
              Инициатор: <strong>{ecr.requester_name}</strong>
            </span>
          )}
        </div>
      </div>

      {/* Информация о требовании */}
      <div style={{
        background: '#F8FBFF',
        border: `1.5px solid ${C.border}`,
        borderRadius: 12, padding: '16px 20px', marginBottom: 20,
      }}>
        <div style={{
          fontSize: 11, fontWeight: 800, color: C.muted,
          textTransform: 'uppercase', letterSpacing: '.8px', marginBottom: 8,
        }}>
          📄 Затронутое требование
        </div>
        <div style={{ fontWeight: 600, color: C.navy, fontSize: 15, marginBottom: 4 }}>
          {requirement.title}
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
          <span style={{
            background: C.accent, color: C.navy,
            padding: '2px 10px', borderRadius: 999, fontSize: 12, fontWeight: 600,
          }}>
            v{requirement.version_number}
          </span>
          <StatusBadge status={requirement.status} />
          {requirement.type_name && (
            <span style={{ fontSize: 12, color: C.muted }}>{requirement.type_name}</span>
          )}
        </div>
        {requirement.description && (
          <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.5, marginBottom: 8 }}>
            {requirement.description}
          </div>
        )}
        <div style={{
          padding: '8px 12px', background: '#FFF9C4',
          borderRadius: 8, fontSize: 12, color: '#713F12',
          border: '1px solid #FDE68A',
        }}>
          ⚡ После создания будет автоматически создана версия{' '}
          <strong>v{requirement.version_number + 1}</strong> (draft).
          Она станет <strong>baseline</strong> после исполнения распоряжения.
        </div>
      </div>

      {/* Поля распоряжения */}
      <Input
        label="Название распоряжения"
        value={title}
        onChange={setTitle}
        placeholder="Кратко опишите суть изменения"
        required
      />

<Textarea
  label="Новое описание требования"
  value={description}
  onChange={setDescription}
  placeholder="Введите новое описание требования"
  rows={4}
/>
      {/* ОДНО поле для обоснования (заменяет два: justification + changeReason) */}
      <Textarea
        label="Обоснование и причина изменения"
        value={justification}
        onChange={setJustification}
        placeholder="Опишите обоснование изменения и причину корректировки требования…"
        rows={4}
      />

      <Input
        label="Дата вступления в силу"
        type="date"
        value={effectiveDate}
        onChange={setEffectiveDate}
      />

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

/* ── Секция прикреплённых требований ─────────────────────────────────────── */
function LinkedRequirementsSection({ ecr, isSuper, onEcoCreated }) {
  const { token } = useAuth();
  const [reqs,      setReqs]      = useState([]);
  const [loading,   setLoading]   = useState(false);
  const [err,       setErr]       = useState('');
  const [ecoTarget, setEcoTarget] = useState(null);

  useEffect(() => {
    if (!ecr?.id) return;
    setLoading(true);
    setErr('');
    API.ecrRequirements(ecr.id, token)
      .then(data => setReqs(data ?? []))
      .catch(e => setErr(e.message))
      .finally(() => setLoading(false));
  }, [ecr?.id]);

  useEffect(() => { if (!ecr) { setReqs([]); setEcoTarget(null); } }, [ecr]);

  const canCreateEco = isSuper && ecr?.status === 'approved';

  const refresh = () => {
    API.ecrRequirements(ecr.id, token)
      .then(data => setReqs(data ?? []))
      .catch(() => {});
    onEcoCreated?.();
  };

  return (
    <>
      <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 20, marginTop: 8 }}>
        <div style={{
          display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', marginBottom: 14,
        }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.navy }}>
            Прикреплённые требования
            {reqs.length > 0 && (
              <span style={{
                marginLeft: 8, background: C.accent, color: C.navy,
                padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 600,
              }}>
                {reqs.length}
              </span>
            )}
          </div>
          {canCreateEco && reqs.length > 0 && (
            <span style={{ fontSize: 12, color: C.muted }}>
              Нажмите «Создать распоряжение» для каждого требования
            </span>
          )}
        </div>

        {isSuper && ecr?.status !== 'approved' && ecr?.status !== 'implemented' && (
          <div style={{
            background: '#FFFBEB', border: '1px solid #FDE68A',
            borderRadius: 8, padding: '10px 14px', marginBottom: 14,
            fontSize: 13, color: '#92400E',
          }}>
            ℹ️ Создание распоряжений доступно после одобрения запроса.
            Текущий статус: <StatusBadge status={ecr?.status} />
          </div>
        )}

        {loading ? <Spinner size={28} /> : err ? (
          <div style={{
            background: '#FEE2E2', color: C.error,
            padding: '10px 14px', borderRadius: 8, fontSize: 13,
          }}>
            Не удалось загрузить требования: {err}
          </div>
        ) : reqs.length === 0 ? (
          <div style={{
            background: '#F8FBFF', borderRadius: 8,
            padding: 20, textAlign: 'center', color: C.muted, fontSize: 14,
          }}>
            К этому запросу не прикреплено ни одного требования
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {reqs.map(req => {
              const hasEco = !!req.has_eco;
              return (
                <div key={`${req.id}-${req.version_number}`} style={{
                  background: hasEco ? '#F0FDF4' : '#FAFCFF',
                  border: `1.5px solid ${hasEco ? '#86EFAC' : C.border}`,
                  borderRadius: 10, padding: '14px 16px',
                  display: 'flex', alignItems: 'flex-start',
                  justifyContent: 'space-between', gap: 14,
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, color: C.navy, fontSize: 14, marginBottom: 6 }}>
                      {req.title}
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                      <span style={{
                        background: C.accent, color: C.navy,
                        padding: '2px 10px', borderRadius: 999, fontSize: 12, fontWeight: 600,
                      }}>
                        v{req.version_number}
                      </span>
                      <StatusBadge status={req.status} />
                      {req.type_name && (
                        <span style={{ fontSize: 12, color: C.muted }}>{req.type_name}</span>
                      )}
                      {req.external_id && (
                        <span style={{ fontSize: 12, color: C.muted }}>· {req.external_id}</span>
                      )}
                    </div>
                    {req.description && (
                      <div style={{ fontSize: 12, color: C.muted, marginTop: 6, lineHeight: 1.5 }}>
                        {req.description.length > 120
                          ? req.description.slice(0, 120) + '…'
                          : req.description}
                      </div>
                    )}
                  </div>

                  <div style={{ flexShrink: 0 }}>
                    {hasEco ? (
                      <span style={{
                        display: 'inline-block',
                        background: '#DCFCE7', color: '#14532D',
                        padding: '5px 14px', borderRadius: 999,
                        fontSize: 12, fontWeight: 700,
                      }}>
                        ✓ Распоряжение создано
                      </span>
                    ) : canCreateEco ? (
                      <Btn small variant="primary" onClick={() => setEcoTarget(req)}>
                        Создать распоряжение
                      </Btn>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <CreateECOModal
        open={!!ecoTarget}
        ecr={ecr}
        requirement={ecoTarget}
        onClose={() => setEcoTarget(null)}
        onCreated={refresh}
      />
    </>
  );
}

/* ── Детали ECR ───────────────────────────────────────────────────────────── */
function ECRDetailModal({ open, ecr, onClose, isSuper, onUpdated }) {
  const { token } = useAuth();
  const [err, setErr] = useState('');

  useEffect(() => { if (!open) setErr(''); }, [open]);

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

  return (
    <Modal open={open} onClose={onClose} title={ecr.title} wide>
      <InfoGrid items={[
        ['Инициатор', ecr.requester_name ?? '—',  false],
        ['Проект',    ecr.project_name   ?? '—',  false],
        ['Статус',    ecr.status,                  true ],
        ['Приоритет', ecr.priority,                true ],
        ['Создан',    ecr.created_at
          ? new Date(ecr.created_at).toLocaleDateString('ru') : '—', false],
        ['Закрыт',    ecr.resolved_at
          ? new Date(ecr.resolved_at).toLocaleDateString('ru') : 'Открыт', false],
      ]} />

      {ecr.description && (
        <div style={{
          background: '#F8FBFF', borderRadius: 9,
          padding: '14px 16px', marginBottom: 20,
        }}>
          <div style={{
            fontSize: 11, fontWeight: 700, color: C.muted,
            textTransform: 'uppercase', letterSpacing: '.4px', marginBottom: 6,
          }}>Описание</div>
          <p style={{ margin: 0, fontSize: 14, color: C.text, lineHeight: 1.7 }}>
            {ecr.description}
          </p>
        </div>
      )}

      {/* Смена статуса */}
      {transitions.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.navy, marginBottom: 10 }}>
            Изменить статус
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {transitions.map(t => (
              <Btn key={t.status} variant={t.variant} onClick={() => updateStatus(t.status)}>
                {t.label}
              </Btn>
            ))}
          </div>
        </div>
      )}

      <ErrorBanner message={err} />

      <LinkedRequirementsSection
        ecr={ecr}
        isSuper={isSuper}
        onEcoCreated={onUpdated}
      />

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
        <Btn variant="ghost" onClick={onClose}>Закрыть</Btn>
      </div>
    </Modal>
  );
}

/* ── Страница ECR ─────────────────────────────────────────────────────────── */
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
    {
      key: 'title', label: 'Название',
      render: v => <span style={{ fontWeight: 600, color: C.navy }}>{v}</span>,
    },
    { key: 'requester_name', label: 'Инициатор' },
    ...(isSuper ? [{ key: 'project_name', label: 'Проект' }] : []),
    { key: 'priority', label: 'Приоритет', render: v => <StatusBadge status={v} /> },
    { key: 'status',   label: 'Статус',    render: v => <StatusBadge status={v} /> },
    { key: 'created_at', label: 'Создан',  render: fmtDate },
    ...(isSuper ? [{
      key: '_quick', label: '',
      render: (_, row) => {
        const t = (ECR_TRANSITIONS[row.status] ?? [])[0];
        if (!t) return null;
        return (
          <Btn small variant={t.variant}
            onClick={async e => {
              e.stopPropagation();
              try {
                await API.patchEcr(row.id, { status: t.status }, token);
                load();
              } catch (err) { alert(err.message); }
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
          Отображаются только ваши запросы. Создать запрос можно из таблицы требований.
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
