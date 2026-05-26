import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { useState, useEffect, useMemo, useRef } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';
import { useAuth } from '../context/AuthContext';
import { API } from '../api';
import { C, FONT } from '../theme';
import { Card, StatCard, Spinner, PageHeader, Btn } from '../components/UI';

const PALETTE = ['#CADFFF','#7EAEE8','#4A86C8','#1D6FA4','#10B981','#F59E0B','#EF4444','#8B5CF6'];

const countBy = (arr, key) =>
  (arr ?? []).reduce((acc, item) => {
    const k = item[key] || 'неизвестно';
    acc[k] = (acc[k] ?? 0) + 1;
    return acc;
  }, {});

const toChart = (obj) => Object.entries(obj).map(([name, value]) => ({ name, value }));
const tick    = { fontSize: 11, fill: C.muted, fontFamily: FONT };
const chartH  = { margin: '0 0 14px', fontSize: 15, fontWeight: 700, color: C.navy, fontFamily: FONT };

/* ── Матрица трассируемости ────────────────────────────────────────────────── */
function TraceabilityMatrix({ reqs, approvals, docs }) {
  const [filter, setFilter] = useState('');

  // Для каждого требования: последнее подтверждение
  const approvalByReq = useMemo(() => {
    const map = {};
    (approvals ?? []).forEach(a => {
      const key = a.requirement_id;
      if (!map[key] || new Date(a.created_at) > new Date(map[key].created_at)) {
        map[key] = a;
      }
    });
    return map;
  }, [approvals]);

  // Документы по ID
  const docById = useMemo(() => {
    const map = {};
    (docs ?? []).forEach(d => { map[d.id] = d; });
    return map;
  }, [docs]);

const VERIF = {
  fulfilled: {
    label: '✓ Выполняется',
    bg: '#DCFCE7',
    color: '#14532D',
  },

  unfulfilled: {
    label: '✗ Не выполняется',
    bg: '#FEE2E2',
    color: '#7F1D1D',
  },

  none: {
    label: '— Не проверено',
    bg: '#F3F4F6',
    color: '#374151',
  },
};

  const rows = useMemo(() => {
    return (reqs ?? []).filter(r => {
      if (!filter.trim()) return true;
      const q = filter.toLowerCase();
      return r.title?.toLowerCase().includes(q) ||
             r.external_id?.toLowerCase().includes(q) ||
             r.type_name?.toLowerCase().includes(q);
    });
  }, [reqs, filter]);

const getVerif = (req) => {
  const appr = approvalByReq[req.id];

  if (!appr) return 'none';

  const status =
    appr.approval_status ??
    appr.status ??
    appr.result ??
    '';

  const normalized = status.toString().toLowerCase();

  if (
    normalized === 'fulfilled' ||
    normalized === 'выполняется'
  ) {
    return 'fulfilled';
  }

  if (
    normalized === 'unfulfilled' ||
    normalized === 'не выполняется'
  ) {
    return 'unfulfilled';
  }

  return 'none';
};

  return (
    <Card style={{ padding: 0 }}>
      <div style={{ padding: '16px 20px', borderBottom: `1px solid ${C.border}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: C.navy }}>
              Матрица трассируемости
            </h3>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: C.muted }}>
              Baseline-требования · источники · статус верификации
            </p>
          </div>
          <div style={{ display: 'flex', gap: 16, fontSize: 12, color: C.muted }}>
            {Object.entries(VERIF).map(([k, v]) => (
              <span key={k} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{
                  display: 'inline-block', width: 10, height: 10,
                  borderRadius: 2, background: v.bg, border: `1px solid ${v.color}30`,
                }} />
                {v.label}
              </span>
            ))}
          </div>
        </div>
        <input
          value={filter}
          onChange={e => setFilter(e.target.value)}
          placeholder="Фильтр по названию, ID или типу…"
          style={{
            width: '100%', padding: '8px 12px', borderRadius: 8,
            border: `1.5px solid ${C.border}`, background: '#F8FBFF',
            fontFamily: FONT, fontSize: 13, color: C.text, boxSizing: 'border-box',
          }}
        />
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, fontFamily: FONT }}>
          <thead>
            <tr style={{ background: C.accent }}>
              {['ID', 'Название требования', 'Тип', 'Версия', 'Документ-источник', 'Пункт', 'Верификация'].map(h => (
                <th key={h} style={{
                  padding: '10px 14px', textAlign: 'left',
                  fontWeight: 700, color: C.navy, whiteSpace: 'nowrap', fontSize: 12,
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: 32, textAlign: 'center', color: C.muted }}>
                  {filter ? 'Ничего не найдено' : 'Нет baseline-требований'}
                </td>
              </tr>
            ) : rows.map((req, i) => {
              const verifKey = getVerif(req);
              const verif    = VERIF[verifKey] ?? VERIF.none;
              const srcDoc   = docById[req.source_document_id];

              return (
                <tr key={`${req.id}-${req.version_number}`} style={{
                  background: i % 2 === 0 ? '#FAFCFF' : '#FFF',
                  borderBottom: `1px solid ${C.border}`,
                }}>
                  <td style={{ padding: '9px 14px', color: C.muted, fontSize: 11, whiteSpace: 'nowrap' }}>
                    {req.external_id ?? '—'}
                  </td>
                  <td style={{ padding: '9px 14px', fontWeight: 600, color: C.navy, maxWidth: 260 }}>
                    {req.title}
                  </td>
                  <td style={{ padding: '9px 14px', color: C.muted, whiteSpace: 'nowrap' }}>
                    {req.type_name ?? '—'}
                  </td>
                  <td style={{ padding: '9px 14px', color: C.muted, whiteSpace: 'nowrap' }}>
                    v{req.version_number}
                  </td>
                  <td style={{ padding: '9px 14px', color: C.text, maxWidth: 200 }}>
                    {srcDoc ? (
                      <span>
                        {srcDoc.external_ref && (
                          <span style={{
                            fontSize: 10, background: C.accent, color: C.navy,
                            padding: '1px 6px', borderRadius: 4, marginRight: 6,
                          }}>{srcDoc.external_ref}</span>
                        )}
                        {srcDoc.title}
                      </span>
                    ) : '—'}
                  </td>
                  <td style={{ padding: '9px 14px', color: C.muted, fontSize: 12 }}>
                    {req.source_clause ?? '—'}
                  </td>
                  <td style={{ padding: '9px 14px', whiteSpace: 'nowrap' }}>
                    <span style={{
                      display: 'inline-block',
                      background: verif.bg, color: verif.color,
                      padding: '3px 10px', borderRadius: 999,
                      fontSize: 11, fontWeight: 700,
                    }}>
                      {verif.label}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {rows.length > 0 && (
        <div style={{
          padding: '10px 20px', borderTop: `1px solid ${C.border}`,
          fontSize: 12, color: C.muted, display: 'flex', gap: 24,
        }}>
          <span>Всего: <strong>{rows.length}</strong></span>
          <span>Выполняется: <strong style={{ color: C.success }}>
  {rows.filter(r => getVerif(r) === 'fulfilled').length}
</strong></span>

<span>Не выполняется: <strong style={{ color: C.error }}>
  {rows.filter(r => getVerif(r) === 'unfulfilled').length}
</strong></span>
          <span>Не проверено: <strong>
            {rows.filter(r => getVerif(r) === 'none').length}
          </strong></span>
        </div>
      )}
    </Card>
  );
}

/* ── Страница аналитики ────────────────────────────────────────────────────── */
export default function AnalyticsPage({ selectedProject }) {
  const { token } = useAuth();
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo,   setDateTo]   = useState('');
  const [tab,      setTab]      = useState('overview'); // overview | traceability
const overviewRef = useRef(null);
const traceabilityRef = useRef(null);

  const load = async () => {
    setLoading(true);
    try {
      const [reqs, ecrs, ecos, approvals, docs] = await Promise.all([
        selectedProject ? API.projReqs(selectedProject.id, token) : API.requirements(token),
        API.ecrs(token),
        API.ecos(token),
        API.approvals(token),
        API.documents(token),
      ]);

      const inRange = (item, field) => {
        const d = item[field] ? new Date(item[field]) : null;
        if (!d) return true;
        if (dateFrom && d < new Date(dateFrom)) return false;
        if (dateTo   && d > new Date(dateTo))   return false;
        return true;
      };

      // Для матрицы трассируемости — только baseline
      const baselineReqs = (reqs ?? []).filter(r => r.is_baseline);

      setData({
        reqs:      (reqs      ?? []).filter(r => inRange(r, 'created_at')),
        ecrs:      (ecrs      ?? []).filter(r => inRange(r, 'created_at')),
        ecos:      (ecos      ?? []).filter(r => inRange(r, 'created_at')),
        approvals: (approvals ?? []).filter(r => inRange(r, 'created_at')),
        docs:      docs ?? [],
        baselineReqs,
        allApprovals: approvals ?? [],
      });
    } catch {
      setData({ reqs: [], ecrs: [], ecos: [], approvals: [], docs: [], baselineReqs: [], allApprovals: [] });
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [selectedProject?.id]);

  const dateInput = (value, onChange) => (
    <input type="date" value={value} onChange={e => onChange(e.target.value)} style={{
      padding: '7px 12px', borderRadius: 8,
      border: `1.5px solid ${C.border}`,
      background: '#F8FBFF', fontFamily: FONT, fontSize: 13, color: C.text, cursor: 'pointer',
    }} />
  );
const exportPDF = async () => {
  const target =
    tab === 'overview'
      ? overviewRef.current
      : traceabilityRef.current;

  if (!target) return;

const canvas = await html2canvas(target, {
  scale: 2,
  useCORS: true,
  backgroundColor: '#ffffff',
  scrollY: -window.scrollY,
  windowWidth: target.scrollWidth,
  windowHeight: target.scrollHeight,
});

  const imgData = canvas.toDataURL('image/png');

  const pdf = new jsPDF({
    orientation: 'landscape',
    unit: 'px',
    format: 'a4',
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  const imgWidth = pageWidth;

  const imgHeight =
    (canvas.height * imgWidth) / canvas.width;

  let heightLeft = imgHeight;
  let position = 0;

  pdf.addImage(
    imgData,
    'PNG',
    0,
    position,
    imgWidth,
    imgHeight
  );

  heightLeft -= pageHeight;

  while (heightLeft > 0) {
    position = heightLeft - imgHeight;

    pdf.addPage();

    pdf.addImage(
      imgData,
      'PNG',
      0,
      position,
      imgWidth,
      imgHeight
    );

    heightLeft -= pageHeight;
  }

  pdf.save(
    tab === 'overview'
      ? 'analytics-overview.pdf'
      : 'traceability-matrix.pdf'
  );
};  if (loading) return <Spinner />;
  const { reqs, ecrs, ecos, approvals, docs, baselineReqs, allApprovals } = data;

  const reqByStatus   = toChart(countBy(reqs,      'status'));
  const ecrByStatus   = toChart(countBy(ecrs,      'status'));
  const ecoByStatus   = toChart(countBy(ecos,      'status'));
  const apprByStatus  = toChart(countBy(approvals, 'approval_status'));
  const reqByType     = toChart(countBy(reqs,      'type_name'));
  const ecrByPriority = toChart(countBy(ecrs,      'priority'));

  const baselineCount = reqs.filter(r => r.is_baseline).length;
  const openEcrs      = ecrs.filter(e => e.status === 'open' || e.status === 'review').length;
 const normalizedApprovals = approvals.map(a => {
  const raw = (
    a.approval_status ??
    a.status ??
    a.result ??
    ''
  ).toString().toLowerCase();

  if (raw === 'fulfilled' || raw === 'выполняется') {
    return 'fulfilled';
  }

  if (raw === 'unfulfilled' || raw === 'не выполняется') {
    return 'unfulfilled';
  }

  return 'none';
});

const fulfilledAppr =
  normalizedApprovals.filter(v => v === 'fulfilled').length;

const unfulfilledAppr =
  normalizedApprovals.filter(v => v === 'unfulfilled').length;
  // Процент верифицированных baseline-требований
  const verifiedPct = baselineReqs.length > 0
? Math.round((fulfilledAppr / baselineReqs.length) * 100)
    : 0;

  return (
    <div>
      <PageHeader
        title="Аналитика"
        subtitle={selectedProject ? `Проект: ${selectedProject.name}` : 'Все проекты'}
      >
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <span style={{ fontSize: 13, color: C.muted }}>С</span>
          {dateInput(dateFrom, setDateFrom)}
          <span style={{ fontSize: 13, color: C.muted }}>По</span>
          {dateInput(dateTo, setDateTo)}
          <Btn onClick={load} variant="ghost" small>Применить</Btn>
          <Btn onClick={() => { setDateFrom(''); setDateTo(''); setTimeout(load, 0); }}
            variant="ghost" small>Сброс</Btn>
<Btn onClick={exportPDF} small>
  ⬇ Экспорт PDF
</Btn>
        </div>
      </PageHeader>

      {/* Вкладки */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24 }}>
        {[['overview', 'Обзор'], ['traceability', 'Матрица трассируемости']].map(([val, label]) => (
          <button key={val} onClick={() => setTab(val)} style={{
            background: tab === val ? C.accent : '#fff',
            color:      tab === val ? C.navy   : C.muted,
            border:     `1.5px solid ${tab === val ? C.accentDark : C.border}`,
            borderRadius: 9, padding: '7px 18px',
            fontFamily: FONT, fontSize: 14, fontWeight: 600, cursor: 'pointer',
          }}>{label}</button>
        ))}
      </div>

      {tab === 'overview' && (
<div
  ref={overviewRef}
  style={{
    background: '#fff',
    padding: 24,
    minWidth: 1400,
  }}
>
          {/* Stat cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 16, marginBottom: 28 }}>
            <StatCard label="Требований"        value={reqs.length}      icon="📄" color={C.btn}      />
            <StatCard label="Baseline"           value={baselineCount}    icon="✅" color={C.success}   />
            <StatCard label="Активных запросов"  value={openEcrs}         icon="🔄" color="#6D28D9"     />
<StatCard label="Выполняется" value={fulfilledAppr} icon="✅" color={C.success} />
<StatCard label="Процент выполнения" value={`${verifiedPct}%`} icon="🔍" color={C.accentDark} />
          </div>

          {/* Charts row 1 */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
            <Card>
              <h3 style={chartH}>Требования по статусу</h3>
              <ResponsiveContainer width="100%" height={230}>
                <PieChart>
                  <Pie data={reqByStatus} dataKey="value" nameKey="name"
                    cx="50%" cy="50%" outerRadius={85} innerRadius={45}>
                    {reqByStatus.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
                  </Pie>
                  <Tooltip formatter={v => [v, 'шт.']} />
                  <Legend iconSize={10} wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </Card>

            <Card>
              <h3 style={chartH}>Требования по типу</h3>
              <ResponsiveContainer width="100%" height={230}>
                <BarChart data={reqByType} barSize={28} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke={C.border} horizontal={false} />
                  <XAxis type="number" allowDecimals={false} tick={tick} />
                  <YAxis type="category" dataKey="name" tick={tick} width={130} />
                  <Tooltip formatter={v => [v, 'шт.']} />
                  <Bar dataKey="value" fill={C.accentDark} radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </div>

          {/* Charts row 2 */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, marginBottom: 20 }}>
            <Card>
              <h3 style={chartH}>Запросы по статусу</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={ecrByStatus} barSize={28}>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                  <XAxis dataKey="name" tick={tick} />
                  <YAxis allowDecimals={false} tick={tick} />
                  <Tooltip formatter={v => [v, 'шт.']} />
                  <Bar dataKey="value" fill="#6D28D9" radius={[5, 5, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>

            <Card>
              <h3 style={chartH}>Запросы по приоритету</h3>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={ecrByPriority} dataKey="value" nameKey="name"
                    cx="50%" cy="50%" outerRadius={70}>
                    {ecrByPriority.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
                  </Pie>
                  <Tooltip formatter={v => [v, 'шт.']} />
                  <Legend iconSize={10} wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </Card>

            <Card>
              <h3 style={chartH}>Верификации по статусу</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={apprByStatus} barSize={28}>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                  <XAxis dataKey="name" tick={tick} />
                  <YAxis allowDecimals={false} tick={tick} />
                  <Tooltip formatter={v => [v, 'шт.']} />
                  <Bar dataKey="value" fill={C.success} radius={[5, 5, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </div>

          {/* Сводная таблица + Распоряжения */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <Card>
              <h3 style={{ ...chartH, marginBottom: 14 }}>Сводная таблица</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
                {[
                  ['Всего требований',   reqs.length],
                  ['Baseline',           baselineCount],
                  ['Черновики',          reqs.filter(r => r.status === 'draft').length],
                  ['Утверждённых',       reqs.filter(r => r.status === 'approved').length],
                  ['Всего ECR',          ecrs.length],
                  ['Открытых ECR',       openEcrs],
                  ['Всего ECO',          ecos.length],
                  ['Исполненных ECO',    ecos.filter(e => e.status === 'executed').length],
['Выполняется',        fulfilledAppr],
['Не выполняется',     unfulfilledAppr],
                ].map(([label, value]) => (
                  <div key={label} style={{ background: '#F8FBFF', borderRadius: 9, padding: '10px 14px' }}>
                    <div style={{ fontSize: 11, color: C.muted, fontWeight: 600,
                      textTransform: 'uppercase', letterSpacing: '.4px', marginBottom: 4 }}>
                      {label}
                    </div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: C.navy }}>{value}</div>
                  </div>
                ))}
              </div>
            </Card>

            <Card>
              <h3 style={chartH}>Распоряжения по статусу</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={ecoByStatus} barSize={32}>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                  <XAxis dataKey="name" tick={tick} />
                  <YAxis allowDecimals={false} tick={tick} />
                  <Tooltip formatter={v => [v, 'шт.']} />
                  <Bar dataKey="value" fill={C.btn} radius={[5, 5, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
              {/* Прогресс-бар верификации */}
              <div style={{ marginTop: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between',
                  fontSize: 13, color: C.muted, marginBottom: 6 }}>
                  <span>Верификация baseline-требований</span>
                  <span style={{ fontWeight: 700, color: C.navy }}>{verifiedPct}%</span>
                </div>
                <div style={{ height: 8, background: C.border, borderRadius: 999, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', width: `${verifiedPct}%`,
                    background: `linear-gradient(90deg, ${C.accentDark}, ${C.success})`,
                    borderRadius: 999, transition: 'width .5s',
                  }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between',
                  fontSize: 11, color: C.muted, marginTop: 4 }}>
<span>{fulfilledAppr} выполняется</span>
                  <span>{baselineReqs.length} baseline-требований</span>
                </div>
              </div>
            </Card>
          </div>
</div>
      )}

      {tab === 'traceability' && (
<div
  ref={traceabilityRef}
  style={{
    background: '#fff',
    padding: 24,
    minWidth: 1600,
  }}
>
  <TraceabilityMatrix
    reqs={baselineReqs}
    approvals={allApprovals}
    docs={docs}
  />
</div>
      )}
    </div>
  );
}
