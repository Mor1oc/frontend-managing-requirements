import { useState, useEffect } from 'react';
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

const fmt = (d) => d ? new Date(d).toLocaleDateString('ru') : '—';

export default function AnalyticsPage({ selectedProject }) {
  const { token } = useAuth();
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo,   setDateTo]   = useState('');

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

      // Optional date filtering
      const inRange = (item, field) => {
        const d = item[field] ? new Date(item[field]) : null;
        if (!d) return true;
        if (dateFrom && d < new Date(dateFrom)) return false;
        if (dateTo   && d > new Date(dateTo))   return false;
        return true;
      };

      setData({
        reqs:      (reqs      ?? []).filter(r => inRange(r, 'created_at')),
        ecrs:      (ecrs      ?? []).filter(r => inRange(r, 'created_at')),
        ecos:      (ecos      ?? []).filter(r => inRange(r, 'created_at')),
        approvals: (approvals ?? []).filter(r => inRange(r, 'created_at')),
        docs:      (docs      ?? []),
      });
    } catch {
      setData({ reqs: [], ecrs: [], ecos: [], approvals: [], docs: [] });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [selectedProject]);

  const dateInput = (value, onChange) => (
    <input
      type="date" value={value}
      onChange={e => onChange(e.target.value)}
      style={{
        padding: '7px 12px', borderRadius: 8,
        border: `1.5px solid ${C.border}`,
        background: '#F8FBFF', fontFamily: FONT, fontSize: 13, color: C.text,
        cursor: 'pointer',
      }}
    />
  );

  if (loading) return <Spinner />;
  const { reqs, ecrs, ecos, approvals, docs } = data;

  const reqByStatus   = toChart(countBy(reqs,      'status'));
  const ecrByStatus   = toChart(countBy(ecrs,      'status'));
  const ecoByStatus   = toChart(countBy(ecos,      'status'));
  const apprByStatus  = toChart(countBy(approvals, 'status'));
  const ecrByPriority = toChart(countBy(ecrs,      'priority'));
  const reqByType     = toChart(countBy(reqs,      'type'));

  const baselineCount = reqs.filter(r => r.is_baseline).length;
  const openEcrs      = ecrs.filter(e => e.status === 'open' || e.status === 'review').length;
  const pendingAppr   = approvals.filter(a => a.status === 'pending').length;

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
          <Btn onClick={() => { setDateFrom(''); setDateTo(''); setTimeout(load, 0); }} variant="ghost" small>
            Сброс
          </Btn>
        </div>
      </PageHeader>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 16, marginBottom: 28 }}>
        <StatCard label="Требований"        value={reqs.length}      icon="📄" color={C.btn}     />
        <StatCard label="Baseline"           value={baselineCount}    icon="✅" color={C.success}  />
        <StatCard label="Активных запросов"  value={openEcrs}         icon="🔄" color={C.purple}   />
        <StatCard label="Ожид. утверждений"  value={pendingAppr}      icon="⏳" color={C.warning}  />
        <StatCard label="Документов"         value={docs.length}      icon="📁" color={C.accentDark}/>
      </div>

      {/* Charts row 1 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
        <Card>
          <h3 style={chartH}>Требования по статусу</h3>
          <ResponsiveContainer width="100%" height={230}>
            <PieChart>
              <Pie
                data={reqByStatus} dataKey="value" nameKey="name"
                cx="50%" cy="50%" outerRadius={85} innerRadius={45}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                labelLine={false}
              >
                {reqByStatus.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
              </Pie>
              <Tooltip formatter={(v) => [v, 'шт.']} />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <h3 style={chartH}>Требования по типу</h3>
          <ResponsiveContainer width="100%" height={230}>
            <BarChart data={reqByType} barSize={32} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke={C.border} horizontal={false} />
              <XAxis type="number" allowDecimals={false} tick={tick} />
              <YAxis type="category" dataKey="name" tick={tick} width={120} />
              <Tooltip formatter={(v) => [v, 'шт.']} />
              <Bar dataKey="value" fill={C.accentDark} radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Charts row 2 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, marginBottom: 20 }}>
        <Card>
          <h3 style={chartH}>Запросы на изм. по статусу</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={ecrByStatus} barSize={28}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
              <XAxis dataKey="name" tick={tick} />
              <YAxis allowDecimals={false} tick={tick} />
              <Tooltip formatter={(v) => [v, 'шт.']} />
              <Bar dataKey="value" fill="#7C3AED" radius={[5, 5, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <h3 style={chartH}>Запросы по приоритету</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={ecrByPriority} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70}>
                {ecrByPriority.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
              </Pie>
              <Tooltip formatter={(v) => [v, 'шт.']} />
              <Legend iconSize={10} wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <h3 style={chartH}>Утверждения по статусу</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={apprByStatus} barSize={28}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
              <XAxis dataKey="name" tick={tick} />
              <YAxis allowDecimals={false} tick={tick} />
              <Tooltip formatter={(v) => [v, 'шт.']} />
              <Bar dataKey="value" fill={C.success} radius={[5, 5, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Распоряжения + сводка */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 20 }}>
        <Card>
          <h3 style={chartH}>Распоряжения по статусу</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={ecoByStatus} barSize={28}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
              <XAxis dataKey="name" tick={tick} />
              <YAxis allowDecimals={false} tick={tick} />
              <Tooltip formatter={(v) => [v, 'шт.']} />
              <Bar dataKey="value" fill={C.btn} radius={[5, 5, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <h3 style={{ ...chartH, marginBottom: 14 }}>Сводная таблица</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            {[
              ['Всего требований',      reqs.length],
              ['Из них baseline',       baselineCount],
              ['Черновики',             reqs.filter(r => r.status === 'draft').length],
              ['Утверждённых',          reqs.filter(r => r.status === 'approved').length],
              ['Всего запросов (ECR)',  ecrs.length],
              ['Открытых ECR',          openEcrs],
              ['Всего распоряжений',    ecos.length],
              ['Исполненных ECO',       ecos.filter(e => e.status === 'executed').length],
              ['Ожид. утверждений',     pendingAppr],
            ].map(([label, value]) => (
              <div key={label} style={{ background: '#F8FBFF', borderRadius: 9, padding: '10px 14px' }}>
                <div style={{ fontSize: 11, color: C.muted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.4px', marginBottom: 4 }}>{label}</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: C.navy }}>{value}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

const chartH = { margin: '0 0 14px', fontSize: 15, fontWeight: 700, color: C.navy, fontFamily: FONT };
const tick   = { fontSize: 11, fill: C.muted, fontFamily: FONT };
