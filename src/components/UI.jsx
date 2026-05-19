import { C, STATUS_MAP, FONT } from '../theme';

/* ── StatusBadge ──────────────────────────────────────────────────────────── */
export function StatusBadge({ status }) {
  const s = STATUS_MAP[status] ?? { bg: '#F3F4F6', color: '#374151' };
  return (
    <span style={{
      display: 'inline-block',
      background: s.bg, color: s.color,
      padding: '3px 10px', borderRadius: 999,
      fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap',
      letterSpacing: '.3px',
    }}>
      {status ?? '—'}
    </span>
  );
}

/* ── Button ───────────────────────────────────────────────────────────────── */
const BTN_VARIANTS = {
  primary: { bg: C.btn,     color: '#fff',   border: 'none'                                },
  ghost:   { bg: 'transparent', color: C.btn, border: `1.5px solid ${C.border}`            },
  danger:  { bg: C.error,   color: '#fff',   border: 'none'                                },
  success: { bg: C.success, color: '#fff',   border: 'none'                                },
  accent:  { bg: C.accent,  color: C.navy,   border: 'none'                                },
  outline: { bg: '#fff',    color: C.text,   border: `1.5px solid ${C.border}`             },
};

export function Btn({ children, onClick, variant = 'primary', disabled, style, small, fullWidth }) {
  const v = BTN_VARIANTS[variant];
  return (
    <button
      onClick={disabled ? undefined : onClick}
      style={{
        fontFamily: FONT,
        background: v.bg, color: v.color,
        border: v.border ?? 'none',
        borderRadius: 9,
        padding: small ? '6px 14px' : '10px 22px',
        fontSize: small ? 13 : 14,
        fontWeight: 600,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.55 : 1,
        transition: 'opacity .15s, filter .15s',
        width: fullWidth ? '100%' : undefined,
        whiteSpace: 'nowrap',
        ...style,
      }}
      onMouseEnter={e => { if (!disabled) e.currentTarget.style.filter = 'brightness(0.92)'; }}
      onMouseLeave={e => { e.currentTarget.style.filter = ''; }}
    >
      {children}
    </button>
  );
}

/* ── Modal ────────────────────────────────────────────────────────────────── */
export function Modal({ open, onClose, title, children, wide }) {
  if (!open) return null;
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(15,52,96,.38)',
        backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: C.card, borderRadius: 18,
          width: wide ? '50vw' : 600, maxWidth: '100%',
          maxHeight: '88vh', overflowY: 'auto',
          padding: '32px 36px',
          boxShadow: '0 24px 72px rgba(15,52,96,.22)',
          border: `1px solid ${C.border}`,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: C.navy, fontFamily: FONT }}>{title}</h2>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 24, color: C.muted, lineHeight: 1, padding: '0 4px',
          }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

/* ── Spinner ──────────────────────────────────────────────────────────────── */
export function Spinner({ size = 36 }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
      <div style={{
        width: size, height: size,
        border: `3px solid ${C.accent}`,
        borderTopColor: C.btn,
        borderRadius: '50%',
        animation: 'rm-spin .7s linear infinite',
      }} />
    </div>
  );
}

/* ── Card ─────────────────────────────────────────────────────────────────── */
export function Card({ children, style }) {
  return (
    <div style={{
      background: C.card, borderRadius: 14,
      padding: '20px 24px',
      boxShadow: '0 2px 14px rgba(29,111,164,.07)',
      border: `1px solid ${C.border}`,
      ...style,
    }}>
      {children}
    </div>
  );
}

/* ── StatCard ─────────────────────────────────────────────────────────────── */
export function StatCard({ label, value, icon, color }) {
  return (
    <Card style={{ textAlign: 'center', padding: '24px 16px' }}>
      <div style={{ fontSize: 30, marginBottom: 10 }}>{icon}</div>
      <div style={{ fontSize: 34, fontWeight: 800, color: color ?? C.btn, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 13, color: C.muted, marginTop: 6 }}>{label}</div>
    </Card>
  );
}

/* ── Input ────────────────────────────────────────────────────────────────── */
export function Input({ label, type = 'text', value, onChange, placeholder, required, style }) {
  return (
    <div style={{ marginBottom: 16 }}>
      {label && (
        <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 600, color: C.navy, fontFamily: FONT }}>
          {label}{required && <span style={{ color: C.error }}> *</span>}
        </label>
      )}
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: '100%', padding: '10px 14px', borderRadius: 9,
          border: `1.5px solid ${C.border}`, background: '#F8FBFF',
          fontFamily: FONT, fontSize: 14, color: C.text,
          outline: 'none', boxSizing: 'border-box',
          transition: 'border-color .15s',
          ...style,
        }}
        onFocus={e  => { e.target.style.borderColor = C.accentDark; }}
        onBlur={e   => { e.target.style.borderColor = C.border; }}
      />
    </div>
  );
}

/* ── Textarea ─────────────────────────────────────────────────────────────── */
export function Textarea({ label, value, onChange, placeholder, rows = 3 }) {
  return (
    <div style={{ marginBottom: 16 }}>
      {label && (
        <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 600, color: C.navy, fontFamily: FONT }}>
          {label}
        </label>
      )}
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        style={{
          width: '100%', padding: '10px 14px', borderRadius: 9,
          border: `1.5px solid ${C.border}`, background: '#F8FBFF',
          fontFamily: FONT, fontSize: 14, color: C.text,
          outline: 'none', boxSizing: 'border-box', resize: 'vertical',
        }}
      />
    </div>
  );
}

/* ── Select ───────────────────────────────────────────────────────────────── */
export function Select({ label, value, onChange, options, required }) {
  return (
    <div style={{ marginBottom: 16 }}>
      {label && (
        <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 600, color: C.navy, fontFamily: FONT }}>
          {label}{required && <span style={{ color: C.error }}> *</span>}
        </label>
      )}
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{
          width: '100%', padding: '10px 14px', borderRadius: 9,
          border: `1.5px solid ${C.border}`, background: '#F8FBFF',
          fontFamily: FONT, fontSize: 14, color: C.text,
          outline: 'none', cursor: 'pointer',
        }}
      >
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

/* ── Table ────────────────────────────────────────────────────────────────── */
export function Table({ columns, data, onRowClick, loading }) {
  if (loading) return <Spinner />;
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14, fontFamily: FONT }}>
        <thead>
          <tr style={{ background: C.accent }}>
            {columns.map(col => (
              <th key={col.key} style={{
                padding: '12px 16px', textAlign: 'left',
                fontWeight: 700, color: C.navy, whiteSpace: 'nowrap',
                fontSize: 13, letterSpacing: '.2px',
              }}>
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {!data?.length ? (
            <tr>
              <td colSpan={columns.length} style={{ textAlign: 'center', padding: 40, color: C.muted }}>
                Нет данных
              </td>
            </tr>
          ) : data.map((row, i) => (
            <tr
              key={row.id ?? i}
              onClick={() => onRowClick?.(row)}
              style={{
                background: i % 2 === 0 ? '#FAFCFF' : '#FFFFFF',
                cursor: onRowClick ? 'pointer' : 'default',
                borderBottom: `1px solid ${C.border}`,
                transition: 'background .1s',
              }}
              onMouseEnter={e => { if (onRowClick) e.currentTarget.style.background = '#EFF6FF'; }}
              onMouseLeave={e => { e.currentTarget.style.background = i % 2 === 0 ? '#FAFCFF' : '#FFFFFF'; }}
            >
              {columns.map(col => (
                <td key={col.key} style={{ padding: '11px 16px', color: C.text }}>
                  {col.render ? col.render(row[col.key], row) : (row[col.key] ?? '—')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ── PageHeader ───────────────────────────────────────────────────────────── */
export function PageHeader({ title, subtitle, children }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center',
      justifyContent: 'space-between', marginBottom: 24,
    }}>
      <div>
        <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, color: C.navy, fontFamily: FONT }}>{title}</h1>
        {subtitle && <p style={{ margin: '4px 0 0', color: C.muted, fontSize: 14 }}>{subtitle}</p>}
      </div>
      {children && <div style={{ display: 'flex', gap: 10 }}>{children}</div>}
    </div>
  );
}

/* ── InfoGrid ─────────────────────────────────────────────────────────────── */
export function InfoGrid({ items }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
      {items.map(([k, v, isStatus]) => (
        <div key={k} style={{ background: '#F8FBFF', borderRadius: 9, padding: '10px 14px' }}>
          <div style={{ fontSize: 11, color: C.muted, textTransform: 'uppercase', fontWeight: 700, marginBottom: 4, letterSpacing: '.5px' }}>{k}</div>
          <div style={{ fontWeight: 600, color: C.text }}>
            {isStatus ? <StatusBadge status={v} /> : (v || '—')}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── ErrorBanner ──────────────────────────────────────────────────────────── */
export function ErrorBanner({ message }) {
  if (!message) return null;
  return (
    <div style={{
      background: '#FEE2E2', color: C.error,
      padding: '10px 14px', borderRadius: 9, marginBottom: 16, fontSize: 13,
      border: '1px solid #FECACA',
    }}>
      {message}
    </div>
  );
}

/* ── Global styles injector ───────────────────────────────────────────────── */
export function GlobalStyles() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
      @keyframes rm-spin { to { transform: rotate(360deg); } }
      *, *::before, *::after { box-sizing: border-box; }
      html, body { margin: 0; padding: 0; background: #EFF6FF; }
      ::-webkit-scrollbar { width: 6px; height: 6px; }
      ::-webkit-scrollbar-track { background: #EFF6FF; }
      ::-webkit-scrollbar-thumb { background: #CADFFF; border-radius: 3px; }
      ::-webkit-scrollbar-thumb:hover { background: #7EAEE8; }
    `}</style>
  );
}
