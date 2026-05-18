import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { API } from '../api';
import { C, FONT } from '../theme';
import {
  Card, Table, PageHeader, Btn, Modal,
  InfoGrid, StatusBadge, ErrorBanner, Spinner, Select,
} from '../components/UI';

const ECO_TRANSITIONS = {
  draft:    [
    { status: 'approved',  label: '✓ Утвердить',  variant: 'success' },
    { status: 'cancelled', label: 'Отменить',      variant: 'danger'  },
  ],
  approved: [
    { status: 'executed',  label: '✓ Исполнено',   variant: 'success' },
    { status: 'cancelled', label: 'Отменить',       variant: 'danger'  },
  ],
  executed:  [],
  cancelled: [],
};

/* ── ECO Detail modal ─────────────────────────────────────────────────────── */
function ECOModal({ open, ecoSummary, onClose, onUpdated }) {
  const { token } = useAuth();
  const [eco,     setEco]     = useState(null);
  const [loading, setLoading] = useState(false);
  const [err,     setErr]     = useState('');

  useEffect(() => {
    if (!open || !ecoSummary) return;
    setLoading(true);
    API.eco(ecoSummary.id, token)
      .then(setEco)
      .catch(() => setEco(ecoSummary))
      .finally(() => setLoading(false));
  }, [open, ecoSummary?.id]);

  useEffect(() => { if (!open) { setEco(null); setErr(''); } }, [open]);

  const updateStatus = async (status) => {
    setErr('');
    try {
      await API.patchEco(ecoSummary.id, { status }, token);
      onUpdated();
      onClose();
    } catch (e) { setErr(e.message); }
  };

  if (!ecoSummary) return null;
  const d = eco ?? ecoSummary;
  const transitions = ECO_TRANSITIONS[d.status] ?? [];

  return (
    <Modal open={open} onClose={onClose} title={d.title} wide>
      {loading ? <Spinner /> : (
        <>
          <InfoGrid items={[
            ['Запрос (ECR)',   d.ecr_title        ?? '—', false],
            ['Исполнитель',    d.assigned_to_name ?? '—', false],
            ['Статус',         d.status,                  true ],
            ['Дата вступления', d.effective_date
              ? new Date(d.effective_date).toLocaleDateString('ru') : '—', false],
            ['Создано',        d.created_at
              ? new Date(d.created_at).toLocaleDateString('ru')  : '—', false],
          ]} />

          {d.justification && (
            <div style={{
              background: '#F8FBFF', borderRadius: 9,
              padding: '14px 16px', marginBottom: 20,
            }}>
              <div style={{
                fontSize: 12, fontWeight: 700, color: C.muted,
                textTransform: 'uppercase', letterSpacing: '.4px', marginBottom: 6,
              }}>Обоснование</div>
              <p style={{ margin: 0, fontSize: 14, color: C.text, lineHeight: 1.7 }}>
                {d.justification}
              </p>
            </div>
          )}

          {/* Status banner */}
          {d.status === 'executed' && (
            <div style={{
              background: '#DCFCE7', border: '1px solid #86EFAC',
              borderRadius: 10, padding: '14px 18px', marginBottom: 20,
              display: 'flex', alignItems: 'center', gap: 12,
            }}>
              <span style={{ fontSize: 22 }}>✅</span>
              <div>
                <div style={{ fontWeight: 700, color: '#14532D', fontSize: 15 }}>
                  Распоряжение исполнено
                </div>
                <div style={{ color: '#15803D', fontSize: 13, marginTop: 2 }}>
                  Требования, связанные с этим распоряжением, помечены как baseline.
                </div>
              </div>
            </div>
          )}

          {d.status === 'cancelled' && (
            <div style={{
              background: '#FEE2E2', border: '1px solid #FCA5A5',
              borderRadius: 10, padding: '14px 18px', marginBottom: 20,
            }}>
              <div style={{ fontWeight: 700, color: '#7F1D1D' }}>Распоряжение отменено</div>
            </div>
          )}

          {/* Status transitions */}
          {transitions.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ height: 1, background: C.border, marginBottom: 20 }} />
              <div style={{ fontSize: 13, fontWeight: 700, color: C.navy, marginBottom: 12 }}>
                Изменить статус
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                {transitions.map(t => (
                  <Btn key={t.status} variant={t.variant} onClick={() => updateStatus(t.status)}>
                    {t.label}
                  </Btn>
                ))}
              </div>
              {d.status === 'approved' && (
                <p style={{ margin: '12px 0 0', fontSize: 13, color: C.muted }}>
                  При отметке «Исполнено» связанные требования автоматически получат статус baseline.
                </p>
              )}
            </div>
          )}

          <ErrorBanner message={err} />
        </>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 8 }}>
        <Btn variant="ghost" onClick={onClose}>Закрыть</Btn>
      </div>
    </Modal>
  );
}

/* ── Change Orders page ───────────────────────────────────────────────────── */
export default function ChangeOrdersPage({ selectedProject }) {
  const { token } = useAuth();
  const [ecos,     setEcos]    = useState([]);
  const [loading,  setLoading] = useState(true);
  const [selected, setSelected]= useState(null);
  const [statusFilter, setStatusFilter] = useState('all');

  const load = async () => {
    setLoading(true);
    try {
      const data = await API.ecos(token);
      setEcos(data ?? []);
    } catch { setEcos([]); } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const fmtDate = (v) => v ? new Date(v).toLocaleDateString('ru') : '—';

  const filtered = ecos.filter(e => {
    if (statusFilter !== 'all' && e.status !== statusFilter) return false;
    if (selectedProject && e.ecr_title) {
      // Best-effort project filter via ecr data
    }
    return true;
  });

  const statusCounts = ecos.reduce((acc, e) => {
    acc[e.status] = (acc[e.status] ?? 0) + 1;
    return acc;
  }, {});

  const columns = [
    { key: 'title',           label: 'Название', render: v => (
      <span style={{ fontWeight: 600, color: C.navy }}>{v}</span>
    )},
    { key: 'ecr_title',       label: 'Запрос (ECR)', render: v => (
      <span style={{ fontSize: 13, color: C.muted }}>{v ?? '—'}</span>
    )},
    { key: 'assigned_to_name',label: 'Исполнитель' },
    { key: 'status',          label: 'Статус',    render: v => <StatusBadge status={v} /> },
    { key: 'effective_date',  label: 'Дата вступления', render: fmtDate },
    { key: 'created_at',      label: 'Создано',   render: fmtDate },
    {
      key: '_actions',
      label: '',
      render: (_, row) => {
        const t = (ECO_TRANSITIONS[row.status] ?? [])[0];
        if (!t) return null;
        return (
          <Btn
            small
            variant={t.variant}
            onClick={async (e) => {
              e.stopPropagation();
              try {
                await API.patchEco(row.id, { status: t.status }, token);
                load();
              } catch (err) { alert(err.message); }
            }}
          >
            {t.label}
          </Btn>
        );
      },
    },
  ];

  return (
    <div>
      <PageHeader
        title="Распоряжения об изменениях"
        subtitle={selectedProject?.name ?? 'Все проекты'}
      >
        <Btn onClick={load} variant="ghost" small>↻ Обновить</Btn>
      </PageHeader>

      {/* Summary pills */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        {[
          ['all',       'Все',        ecos.length],
          ['draft',     'Черновики',  statusCounts.draft     ?? 0],
          ['approved',  'Утверждены', statusCounts.approved  ?? 0],
          ['executed',  'Исполнены',  statusCounts.executed  ?? 0],
          ['cancelled', 'Отменены',   statusCounts.cancelled ?? 0],
        ].map(([val, label, count]) => (
          <button
            key={val}
            onClick={() => setStatusFilter(val)}
            style={{
              background: statusFilter === val ? C.accent : '#fff',
              color:      statusFilter === val ? C.navy   : C.muted,
              border:     `1.5px solid ${statusFilter === val ? C.accentDark : C.border}`,
              borderRadius: 999, padding: '6px 16px',
              fontFamily: FONT, fontSize: 13, fontWeight: 600,
              cursor: 'pointer', transition: 'all .15s',
            }}
          >
            {label}
            <span style={{
              marginLeft: 7, background: statusFilter === val ? C.btn : C.border,
              color: statusFilter === val ? '#fff' : C.text,
              borderRadius: 999, padding: '1px 8px', fontSize: 11, fontWeight: 700,
            }}>{count}</span>
          </button>
        ))}
      </div>

      <Card style={{ padding: 0, overflow: 'hidden' }}>
        <Table
          columns={columns}
          data={filtered}
          loading={loading}
          onRowClick={setSelected}
        />
      </Card>

      <ECOModal
        open={!!selected}
        ecoSummary={selected}
        onClose={() => setSelected(null)}
        onUpdated={() => { load(); setSelected(null); }}
      />
    </div>
  );
}
