import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { API } from '../api';
import { C, FONT } from '../theme';
import {
  Card, PageHeader, Btn, Modal,
  InfoGrid, StatusBadge, Input, Textarea, Select, ErrorBanner, Spinner,
} from '../components/UI';
import PDFViewer from '../components/PDFViewer';
import { CreateDocumentModal } from './DocumentsPage';

/* ══════════════════════════════════════════════════════════
   НОРМАЛИЗАЦИЯ ПОЛЕЙ (защита от PascalCase из Go без json-тегов)
══════════════════════════════════════════════════════════ */
function normalizeReq(r) {
  return {
    ...r,
    parent_id:          r.parent_id          ?? r.ParentID          ?? r.parent_Id         ?? null,
    source_document_id: r.source_document_id ?? r.SourceDocumentID  ?? null,
    external_id:        r.external_id        ?? r.ExternalID        ?? null,
    type_name:          r.type_name          ?? r.TypeName          ?? null,
    version_number:     r.version_number     ?? r.VersionNumber     ?? 1,
    is_baseline:        r.is_baseline        ?? r.IsBaseline        ?? false,
    source_clause:      r.source_clause      ?? r.SourceClause      ?? null,
    change_reason:      r.change_reason      ?? r.ChangeReason      ?? null,
  };
}

/* ══════════════════════════════════════════════════════════
   ИКОНКИ ПО ТИПУ ТРЕБОВАНИЯ
══════════════════════════════════════════════════════════ */
function getTypeIcon(typeName = '') {
  const t = (typeName ?? '').toLowerCase();
  if (t.includes('сертификаци'))  return '📁';
  if (t.includes('эксплуатац')) return '👤';
  if (t.includes('конструктивное'))                        return '⚙️';
  if (t.includes('технологич')) return '🛠';
  if (t.includes('нефункцион')) return '🛡';
  if (t.includes('техничес'))                           return '💻';
  if (t.includes('интерфейс'))                      return '🖥';
  if (t.includes('надежность и безопасно'))                        return '🔒';
  if (t.includes('функцион'))               return '⚡';
  return '📋';
}

/* ══════════════════════════════════════════════════════════
   ПОСТРОЕНИЕ ДЕРЕВА
══════════════════════════════════════════════════════════ */

/** Строим дерево из плоского массива по parent_id */
function buildTree(reqs) {
  const map = {};
  reqs.forEach(r => { map[r.id] = { ...r, children: [] }; });

  const roots = [];
  reqs.forEach(r => {
    const pid = r.parent_id;
    if (pid && map[pid] && pid !== r.id) {
      map[pid].children.push(map[r.id]);
    } else {
      roots.push(map[r.id]);
    }
  });
  return roots;
}

/** Добавляем нумерацию (1, 1.1, 1.1.1…) рекурсивно */
function addNumbers(nodes, prefix = '') {
  return nodes.map((node, idx) => {
    const num = prefix ? `${prefix}.${idx + 1}` : `${idx + 1}`;
    return { ...node, _num: num, children: addNumbers(node.children ?? [], num) };
  });
}

/**
 * Разворачиваем дерево в плоский список с мета-данными для отрисовки линий.
 * ancestorLines[i] = true  → предок на уровне i+1 имеет следующих siblings → рисуем │
 *                  = false → предок был последним → рисуем пробел
 */
function flattenWithLines(nodes, ancestorLines = [], collapsedSet = new Set()) {
  const result = [];
  nodes.forEach((node, idx) => {
    const isLast = idx === nodes.length - 1;
    result.push({
      ...node,
      _depth:         ancestorLines.length,
      _isLast:        isLast,
      _ancestorLines: [...ancestorLines],
    });
    if (!collapsedSet.has(node.id) && node.children?.length > 0) {
      result.push(...flattenWithLines(
        node.children,
        [...ancestorLines, !isLast],
        collapsedSet,
      ));
    }
  });
  return result;
}

/**
 * Строит строку-префикс: │   ├── и т.п.
 * Для корневых узлов (depth=0) возвращает ''.
 */
function buildPrefix(ancestorLines, isLast) {
  if (ancestorLines.length === 0) return '';
  let prefix = '';
  for (let i = 0; i < ancestorLines.length - 1; i++) {
    prefix += ancestorLines[i] ? '│   ' : '    ';
  }
  prefix += isLast ? '└── ' : '├── ';
  return prefix;
}

/* ══════════════════════════════════════════════════════════
   ДЕРЕВО-ТАБЛИЦА
══════════════════════════════════════════════════════════ */

function RequirementsTree({ reqs, docs, onRowClick, onApproval, isSuper, onOpenPdf }) {
  const [collapsed, setCollapsed] = useState(new Set());

  const toggle = id => setCollapsed(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const hasChildrenSet = useMemo(() => {
    const s = new Set();
    reqs.forEach(r => { if (r.parent_id && r.parent_id !== r.id) s.add(r.parent_id); });
    return s;
  }, [reqs]);

  const tree       = useMemo(() => buildTree(reqs), [reqs]);
  const numbered   = useMemo(() => addNumbers(tree), [tree]);
  const flat       = useMemo(
    () => flattenWithLines(numbered, [], collapsed),
    [numbered, collapsed],
  );

  if (!reqs.length) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: C.muted }}>
        Нет требований для отображения
      </div>
    );
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      {/* Заголовок */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 130px 70px 90px 60px 80px',
        background: C.accent,
        padding: '10px 16px',
        fontWeight: 700, color: C.navy, fontSize: 12, gap: 8,
      }}>
        <div>Требование</div>
        <div>Тип</div>
        <div>Версия</div>
        <div>Статус</div>
        <div>Base</div>
        <div></div>
      </div>

      {flat.map((row, i) => {
        const hasKids  = hasChildrenSet.has(row.id);
        const isOpen   = !collapsed.has(row.id);
        const prefix   = buildPrefix(row._ancestorLines, row._isLast);
        const icon     = getTypeIcon(row.type_name);
        const srcDoc   = docs.find(d => d.id === row.source_document_id);

        // Цвет строки по глубине
        const depthBg = [
          i % 2 === 0 ? '#FAFCFF' : '#FFFFFF',  // depth 0
          i % 2 === 0 ? '#F5F9FF' : '#F8FBFF',  // depth 1
          i % 2 === 0 ? '#EFF6FF' : '#F2F7FF',  // depth 2
          i % 2 === 0 ? '#E8F2FF' : '#ECF4FF',  // depth 3+
        ];
        const bg = depthBg[Math.min(row._depth, 3)];

        return (
          <div
            key={`${row.id}-${row.version_number}`}
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 130px 70px 90px 60px 80px',
              padding: '9px 16px',
              background: bg,
              borderBottom: `1px solid ${C.border}`,
              cursor: 'pointer',
              gap: 8,
              alignItems: 'center',
              transition: 'background .1s',
            }}
            onClick={() => onRowClick(row)}
            onMouseEnter={e => { e.currentTarget.style.background = '#DBEAFE'; }}
            onMouseLeave={e => { e.currentTarget.style.background = bg; }}
          >
            {/* Название с деревом */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 0, minWidth: 0 }}>
              {/* Префикс в моноширинном шрифте */}
              {prefix && (
                <span style={{
                  fontFamily: 'monospace',
                  whiteSpace: 'pre',
                  color: '#94A3B8',
                  fontSize: 13,
                  lineHeight: '20px',
                  flexShrink: 0,
                  userSelect: 'none',
                }}>
                  {prefix}
                </span>
              )}

              {/* Кнопка раскрытия */}
              {hasKids ? (
                <button
                  onClick={e => { e.stopPropagation(); toggle(row.id); }}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    fontSize: 10, color: C.muted, padding: '0 4px',
                    lineHeight: '20px', flexShrink: 0,
                  }}
                >
                  {isOpen ? '▼' : '▶'}
                </button>
              ) : (
                <span style={{ width: 18, flexShrink: 0, display: 'inline-block' }} />
              )}

              {/* Иконка + номер + название */}
              <div style={{ minWidth: 0 }}>
                <span style={{ fontSize: 14, marginRight: 6 }}>{icon}</span>
                <span style={{
                  fontSize: 12, color: C.muted, fontWeight: 600,
                  marginRight: 6, fontFamily: 'monospace',
                }}>
                  {row._num}.
                </span>
                <span style={{
                  fontWeight: row._depth === 0 ? 700 : 500,
                  color: row._depth === 0 ? C.navy : C.text,
                  fontSize: 14,
                }}>
                  {row.title}
                </span>
                {row.external_id && (
                  <span style={{
                    marginLeft: 8, fontSize: 11, color: C.muted,
                    background: '#EFF6FF', padding: '1px 6px', borderRadius: 4,
                  }}>
                    {row.external_id}
                  </span>
                )}
              </div>
            </div>

            {/* Тип */}
            <div style={{ fontSize: 12, color: C.muted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {row.type_name ?? '—'}
            </div>

            {/* Версия */}
            <div style={{ fontSize: 12, color: C.muted }}>v{row.version_number}</div>

            {/* Статус */}
            <div><StatusBadge status={row.status} /></div>

            {/* Baseline */}
            <div>
              {row.is_baseline
                ? <span style={{ color: C.success, fontWeight: 700, fontSize: 14 }}>✓</span>
                : <span style={{ color: C.muted, fontSize: 14 }}>—</span>
              }
            </div>

            {/* Действия */}
            <div onClick={e => e.stopPropagation()} style={{ display: 'flex', gap: 4 }}>
              {srcDoc?.file_path && (
                <Btn small variant="accent" onClick={() => onOpenPdf(srcDoc)}>📄</Btn>
              )}
              {isSuper && (
                <Btn small variant="ghost" onClick={() => onApproval(row)}>+</Btn>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   СТАТУСЫ ПОДТВЕРЖДЕНИЙ
══════════════════════════════════════════════════════════ */
const APPR_STYLE = {
  'Выполняется':    { bg: '#DCFCE7', color: '#14532D', icon: '✓' },
  'Не выполняется': { bg: '#FEE2E2', color: '#7F1D1D', icon: '✗' },
  approved:         { bg: '#DCFCE7', color: '#14532D', icon: '✓' },
  rejected:         { bg: '#FEE2E2', color: '#7F1D1D', icon: '✗' },
  pending:          { bg: '#EDE9FE', color: '#3B0764', icon: '⏳' },
};

/* ══════════════════════════════════════════════════════════
   КАРТОЧКА ТРЕБОВАНИЯ
══════════════════════════════════════════════════════════ */
function RequirementModal({ open, req, onClose, onCreateECR, onCreateApproval,
                            isSuper, documents, selectedProject }) {
  const { token } = useAuth();
  const [versions,  setVersions]  = useState([]);
  const [approvals, setApprovals] = useState([]);
  const [loading,   setLoading]   = useState(false);
  const [pdfDoc,    setPdfDoc]    = useState(null);

  useEffect(() => {
    if (!open || !req) return;
    setLoading(true);
    Promise.all([
      API.reqVersions(req.id, token).catch(() => []),
      API.reqApprovals(req.id, token).catch(() => []),
    ]).then(([v, a]) => {
      setVersions(v ?? []);
      setApprovals(a ?? []);
    }).finally(() => setLoading(false));
  }, [open, req?.id]);

  useEffect(() => { if (!open) { setVersions([]); setApprovals([]); } }, [open]);

  if (!req) return null;
  const srcDoc = documents?.find(d => d.id === req.source_document_id);

  return (
    <>
      <Modal open={open} onClose={onClose} title={`${getTypeIcon(req.type_name)} ${req.title}`} wide>
        {loading ? <Spinner /> : (
          <>
            {req.description && (
              <p style={{ color: C.text, marginBottom: 20, lineHeight: 1.7, fontSize: 15 }}>
                {req.description}
              </p>
            )}

            <InfoGrid items={[
              ['Внешний ID', req.external_id ?? '—', false],
              ['Тип',        req.type_name   ?? '—', false],
              ['Версия',     `v${req.version_number}`, false],
              ['Статус',     req.status,               true],
              ['Проект',     selectedProject?.name ?? '—', false],
              ['Baseline',   req.is_baseline ? 'Да' : 'Нет', false],
              ['Создано',    req.created_at ? new Date(req.created_at).toLocaleDateString('ru') : '—', false],
              ['Изменено',   req.changed_at  ? new Date(req.changed_at).toLocaleDateString('ru')  : '—', false],
            ]} />

            {req.source_document_id && (
              <div style={{
                background: '#EFF6FF', borderRadius: 9, padding: '12px 16px',
                marginBottom: 16, border: `1px solid ${C.border}`,
              }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.muted,
                  textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 6 }}>
                  Документ-источник
                </div>
                <div style={{ fontWeight: 600, color: C.navy }}>
                  {srcDoc?.title ?? `ID: ${req.source_document_id.slice(0, 8)}…`}
                </div>
                {req.source_clause && (
                  <div style={{ fontSize: 13, color: C.muted, marginTop: 3 }}>
                    Пункт: <strong style={{ color: C.text }}>{req.source_clause}</strong>
                  </div>
                )}
                {srcDoc?.file_path && (
                  <div style={{ marginTop: 10 }}>
                    <Btn small variant="accent" onClick={() => setPdfDoc(srcDoc)}>
                      📄 Открыть документ
                    </Btn>
                  </div>
                )}
              </div>
            )}

            {req.change_reason && (
              <div style={{
                background: '#FFFBEB', border: '1px solid #FDE68A',
                borderRadius: 9, padding: '12px 16px', marginBottom: 16,
              }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#92400E', marginBottom: 4 }}>
                  ПРИЧИНА ИЗМЕНЕНИЯ
                </div>
                <div style={{ fontSize: 14, color: C.text }}>{req.change_reason}</div>
              </div>
            )}

            {/* Подтверждения */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.navy, marginBottom: 10 }}>
                Подтверждения выполнимости
                <span style={{
                  marginLeft: 8, background: C.accent, color: C.navy,
                  padding: '1px 8px', borderRadius: 999, fontSize: 11, fontWeight: 600,
                }}>
                  {approvals.length}
                </span>
              </div>
              {approvals.length === 0 ? (
                <div style={{ color: C.muted, fontSize: 13 }}>Подтверждений нет</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {approvals.map(a => {
                    const key = a.approval_status ?? a.status ?? 'pending';
                    const s   = APPR_STYLE[key] ?? { bg: '#F3F4F6', color: '#374151', icon: '—' };
                    return (
                      <div key={a.id} style={{
                        background: s.bg, borderRadius: 8,
                        padding: '10px 14px', display: 'flex', alignItems: 'flex-start', gap: 10,
                      }}>
                        <span style={{ fontSize: 16, lineHeight: 1.4 }}>{s.icon}</span>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                            <span style={{ fontWeight: 700, color: s.color, fontSize: 13 }}>{key}</span>
                            <span style={{ fontSize: 12, color: C.muted }}>
                              {a.approver_name ?? '—'} · {a.created_at
                                ? new Date(a.created_at).toLocaleDateString('ru') : ''}
                            </span>
                          </div>
                          {a.comment && (
                            <div style={{ fontSize: 13, color: C.text, marginTop: 2 }}>{a.comment}</div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* История версий */}
            {versions.length > 1 && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.navy, marginBottom: 10 }}>
                  История версий
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {versions.map(v => (
                    <span key={v.version_number} style={{
                      background: v.is_baseline ? '#DCFCE7' : C.accent,
                      color:      v.is_baseline ? '#14532D' : C.navy,
                      border:     `1px solid ${v.is_baseline ? '#86EFAC' : C.border}`,
                      padding: '5px 14px', borderRadius: 999,
                      fontSize: 13, fontWeight: 600,
                    }}>
                      v{v.version_number} · {v.status}{v.is_baseline && ' ✓'}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', paddingTop: 8 }}>
              <Btn variant="ghost" onClick={onClose}>Закрыть</Btn>
              {isSuper && (
                <Btn variant="outline" onClick={() => { onClose(); onCreateApproval(req); }}>
                  + Подтверждение
                </Btn>
              )}
              <Btn onClick={() => { onClose(); onCreateECR(req); }}>
                Создать запрос на изменение
              </Btn>
            </div>
          </>
        )}
      </Modal>

      <PDFViewer
        open={!!pdfDoc} docId={pdfDoc?.id} title={pdfDoc?.title}
        hasFile={!!pdfDoc?.file_path} onClose={() => setPdfDoc(null)}
      />
    </>
  );
}

/* ══════════════════════════════════════════════════════════
   СОЗДАНИЕ ПОДТВЕРЖДЕНИЯ
══════════════════════════════════════════════════════════ */
function CreateApprovalModal({ open, req, onClose, onCreated }) {
  const { token, user } = useAuth();
  const [status,  setStatus]  = useState('Выполняется');
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [err,     setErr]     = useState('');

  useEffect(() => {
    if (open) { setStatus('Выполняется'); setComment(''); setErr(''); }
  }, [open]);

  const submit = async () => {
    setLoading(true); setErr('');
    try {
      await API.createApproval(req.id, {
        version_number: req.version_number,
        status, comment, approver_id: user?.id,
      }, token);
      onCreated(); onClose();
    } catch (e) { setErr(e.message); } finally { setLoading(false); }
  };

  return (
    <Modal open={open} onClose={onClose} title="Создать подтверждение выполнимости">
      {req && (
        <div style={{ background: '#EFF6FF', borderRadius: 9, padding: '12px 16px', marginBottom: 20 }}>
          <div style={{ fontWeight: 600, color: C.navy }}>{req.title}</div>
          <div style={{ fontSize: 13, color: C.muted, marginTop: 3 }}>
            v{req.version_number} · <StatusBadge status={req.status} />
          </div>
        </div>
      )}
      <div style={{ marginBottom: 16 }}>
        <label style={{ display: 'block', marginBottom: 8, fontSize: 13, fontWeight: 600, color: C.navy }}>
          Статус <span style={{ color: C.error }}>*</span>
        </label>
        <div style={{ display: 'flex', gap: 10 }}>
          {['Выполняется', 'Не выполняется'].map(s => (
            <button key={s} onClick={() => setStatus(s)} style={{
              flex: 1, padding: '10px 16px', borderRadius: 9, cursor: 'pointer',
              border: `2px solid ${status === s
                ? (s === 'Выполняется' ? '#86EFAC' : '#FCA5A5') : C.border}`,
              background: status === s
                ? (s === 'Выполняется' ? '#DCFCE7' : '#FEE2E2') : '#F8FBFF',
              color: status === s
                ? (s === 'Выполняется' ? '#14532D' : '#7F1D1D') : C.muted,
              fontFamily: FONT, fontSize: 14, fontWeight: 600, transition: 'all .15s',
            }}>
              {s === 'Выполняется' ? '✓ ' : '✗ '}{s}
            </button>
          ))}
        </div>
      </div>
      <Textarea label="Комментарий" value={comment} onChange={setComment}
        placeholder="Введите комментарий…" />
      <ErrorBanner message={err} />
      <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
        <Btn variant="ghost" onClick={onClose}>Отмена</Btn>
        <Btn onClick={submit} disabled={loading}>
          {loading ? 'Создание…' : 'Создать подтверждение'}
        </Btn>
      </div>
    </Modal>
  );
}

/* ══════════════════════════════════════════════════════════
   СОЗДАНИЕ ECR
══════════════════════════════════════════════════════════ */
function CreateECRModal({ open, initialReq, allReqs, selectedProject, onClose, onCreated }) {
  const { token, user } = useAuth();
  const [title,    setTitle]    = useState('');
  const [desc,     setDesc]     = useState('');
  const [priority, setPriority] = useState('medium');
  const [selIds,   setSelIds]   = useState([]);
  const [search,   setSearch]   = useState('');
  const [loading,  setLoading]  = useState(false);
  const [err,      setErr]      = useState('');

  useEffect(() => {
    if (open) {
      setSelIds(initialReq ? [initialReq.id] : []);
      setTitle(''); setDesc(''); setPriority('medium'); setSearch(''); setErr('');
    }
  }, [open, initialReq?.id]);

  const toggle = id => setSelIds(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);

  const filtered = useMemo(() => {
    if (!search.trim()) return allReqs;
    const q = search.toLowerCase();
    return allReqs.filter(r =>
      r.title?.toLowerCase().includes(q) || r.external_id?.toLowerCase().includes(q));
  }, [allReqs, search]);

  const submit = async () => {
    if (!title.trim())    { setErr('Введите название'); return; }
    if (!selectedProject) { setErr('Выберите проект');  return; }
    setLoading(true); setErr('');
    try {
      await API.createEcr({
        title: title.trim(), description: desc, priority,
        requester_id: user?.id, project_id: selectedProject.id,
        requirement_links: allReqs.filter(r => selIds.includes(r.id))
          .map(r => ({ requirement_id: r.id, version_number: r.version_number })),
      }, token);
      onCreated(); onClose();
    } catch (e) { setErr(e.message); } finally { setLoading(false); }
  };

  return (
    <Modal open={open} onClose={onClose} title="Создать запрос на изменение" wide>
      <Input label="Название" value={title} onChange={setTitle} required />
      <Textarea label="Описание" value={desc} onChange={setDesc} />
      <Select label="Приоритет" value={priority} onChange={setPriority} options={[
        { value: 'low', label: 'Низкий' }, { value: 'medium', label: 'Средний' },
        { value: 'high', label: 'Высокий' }, { value: 'critical', label: 'Критический' },
      ]} />
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: C.navy, marginBottom: 8 }}>
          Затронутые требования
          <span style={{ color: C.muted, fontWeight: 400 }}> · выбрано {selIds.length}</span>
        </div>
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Поиск по названию или внешнему ID…"
          style={{ width: '100%', padding: '8px 12px', borderRadius: 8,
            border: `1.5px solid ${C.border}`, background: '#F8FBFF',
            fontFamily: FONT, fontSize: 13, color: C.text,
            marginBottom: 8, boxSizing: 'border-box' }} />
        <div style={{ maxHeight: 220, overflowY: 'auto',
          border: `1.5px solid ${C.border}`, borderRadius: 9 }}>
          {filtered.map((r, i) => (
            <label key={r.id} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '10px 14px', cursor: 'pointer',
              background: selIds.includes(r.id) ? '#EFF6FF' : 'transparent',
              borderBottom: i < filtered.length - 1 ? `1px solid ${C.border}` : 'none',
            }}>
              <input type="checkbox" checked={selIds.includes(r.id)}
                onChange={() => toggle(r.id)}
                style={{ accentColor: C.btn, width: 16, height: 16 }} />
              <span style={{ fontSize: 13 }}>{getTypeIcon(r.type_name)}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, color: C.text }}>{r.title}</div>
                {r.external_id && <div style={{ fontSize: 11, color: C.muted }}>{r.external_id}</div>}
              </div>
              <span style={{ fontSize: 12, color: C.muted }}>v{r.version_number}</span>
              <StatusBadge status={r.status} />
            </label>
          ))}
        </div>
      </div>
      <ErrorBanner message={err} />
      <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
        <Btn variant="ghost" onClick={onClose}>Отмена</Btn>
        <Btn onClick={submit} disabled={loading}>{loading ? 'Создание…' : 'Создать запрос'}</Btn>
      </div>
    </Modal>
  );
}

/* ══════════════════════════════════════════════════════════
   СОЗДАНИЕ ТРЕБОВАНИЯ
══════════════════════════════════════════════════════════ */
function CreateRequirementModal({ open, onClose, onCreated, selectedProject, documents, existingReqs }) {
  const { token } = useAuth();
  const [title,        setTitle]        = useState('');
  const [desc,         setDesc]         = useState('');
  const [extId,        setExtId]        = useState('');
  const [typeName,     setTypeName]     = useState('');
  const [versionNum,   setVersionNum]   = useState(1);
  const [parentId,     setParentId]     = useState('');
  const [parentSearch, setParentSearch] = useState('');
  const [reqTypes,     setReqTypes]     = useState([]);
  const [sourceDocId,  setSourceDocId]  = useState('');
  const [sourceClause, setSourceClause] = useState('');
  const [docSearch,    setDocSearch]    = useState('');
  const [loading,      setLoading]      = useState(false);
  const [err,          setErr]          = useState('');
  const [showNewDoc,   setShowNewDoc]   = useState(false);
  const [localDocs,    setLocalDocs]    = useState([]);

  useEffect(() => { setLocalDocs(documents ?? []); }, [documents]);

  useEffect(() => {
    if (!open || !token) return;
    API.reqTypes(token).then(t => { setReqTypes(t ?? []); if (t?.length) setTypeName(t[0].name); }).catch(() => {});
    setTitle(''); setDesc(''); setExtId(''); setVersionNum(1);
    setParentId(''); setParentSearch(''); setSourceDocId(''); setSourceClause('');
    setDocSearch(''); setErr('');
  }, [open]);

  const filteredParents = useMemo(() => {
    const pool = (existingReqs ?? []);
    if (!parentSearch.trim()) return pool.slice(0, 30);
    const q = parentSearch.toLowerCase();
    return pool.filter(r =>
      r.title?.toLowerCase().includes(q) || r.external_id?.toLowerCase().includes(q));
  }, [existingReqs, parentSearch]);

  const filteredDocs = useMemo(() => {
    if (!docSearch.trim()) return localDocs;
    const q = docSearch.toLowerCase();
    return localDocs.filter(d => d.title?.toLowerCase().includes(q) || d.external_ref?.toLowerCase().includes(q));
  }, [localDocs, docSearch]);

  const selectedParent = (existingReqs ?? []).find(r => r.id === parentId);

  const submit = async () => {
    if (!title.trim() || !typeName) { setErr('Укажите название и тип'); return; }
    if (!selectedProject)           { setErr('Выберите проект');         return; }
    setLoading(true); setErr('');
    try {
      await API.createReq({
        project_id: selectedProject.id, type_name: typeName,
        title: title.trim(), version_number: versionNum,
        description: desc || undefined, external_id: extId || undefined,
        parent_id: parentId || undefined,
        source_document_id: sourceDocId || undefined,
        source_document_version: sourceDocId ? 1 : undefined,
        source_clause: sourceClause || undefined,
      }, token);
      onCreated(); onClose();
    } catch (e) { setErr(e.message); } finally { setLoading(false); }
  };

  return (
    <>
      <Modal open={open && !showNewDoc} onClose={onClose} title="Создать требование" wide>
        <div style={{ background: '#EFF6FF', borderRadius: 9, padding: '10px 16px', marginBottom: 20, fontSize: 13, color: C.muted }}>
          Проект: <strong style={{ color: C.navy }}>{selectedProject?.name ?? '—'}</strong>
          &nbsp;·&nbsp;Статус: <StatusBadge status="draft" />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 90px', gap: 12 }}>
          <Input label="Название" value={title} onChange={setTitle} required />
          <Input label="Внешний ID" value={extId} onChange={setExtId} placeholder="REQ-001" />
          <Input label="Версия" type="number" value={String(versionNum)}
            onChange={v => setVersionNum(Math.max(1, parseInt(v) || 1))} />
        </div>

        <Select label="Тип требования" value={typeName} onChange={setTypeName} required
          options={reqTypes.map(t => ({ value: t.name, label: `${getTypeIcon(t.name)} ${t.name}` }))} />

        <Textarea label="Описание" value={desc} onChange={setDesc} placeholder="Подробное описание…" rows={3} />

        {/* Родительское требование с поиском */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 600, color: C.navy, fontFamily: FONT }}>
            Родительское требование
          </label>
          {selectedParent && (
            <div style={{
              background: '#EFF6FF', borderRadius: 8, padding: '8px 12px',
              marginBottom: 8, display: 'flex', alignItems: 'center',
              justifyContent: 'space-between', gap: 8, border: `1px solid ${C.border}`,
            }}>
              <span style={{ fontWeight: 600, color: C.navy, fontSize: 13 }}>
                {getTypeIcon(selectedParent.type_name)} {selectedParent.title} {selectedParent.external_id}
              </span>
              <button onClick={() => { setParentId(''); setParentSearch(''); }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.error, fontSize: 18 }}>
                ×
              </button>
            </div>
          )}
          <input value={parentSearch} onChange={e => setParentSearch(e.target.value)}
            placeholder={selectedParent ? 'Изменить родителя…' : 'Поиск по названию или ID (пусто = корневое)'}
            style={{ width: '100%', padding: '8px 12px', borderRadius: 8,
              border: `1.5px solid ${C.border}`, background: '#F8FBFF',
              fontFamily: FONT, fontSize: 13, color: C.text, boxSizing: 'border-box', marginBottom: 4 }} />
          {parentSearch.trim() && (
            <div style={{ border: `1.5px solid ${C.border}`, borderRadius: 9, maxHeight: 180, overflowY: 'auto' }}>
              {filteredParents.length === 0 ? (
                <div style={{ padding: 12, textAlign: 'center', color: C.muted, fontSize: 13 }}>Ничего не найдено</div>
              ) : filteredParents.map((r, i) => (
                <button key={r.id} onClick={() => { setParentId(r.id); setParentSearch(''); }}
                  style={{
                    width: '100%', textAlign: 'left', padding: '9px 14px',
                    background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: FONT,
                    borderBottom: i < filteredParents.length - 1 ? `1px solid ${C.border}` : 'none',
                    display: 'flex', alignItems: 'center', gap: 8,
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#EFF6FF'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
                  <span>{getTypeIcon(r.type_name)}</span>
                  <span style={{ fontSize: 14, color: C.navy }}>{r.title}</span>
                  {r.external_id && <span style={{ fontSize: 11, color: C.muted }}>{r.external_id}</span>}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Документ-источник */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 600, color: C.navy, fontFamily: FONT }}>
            Документ-источник
          </label>
          <input value={docSearch} onChange={e => setDocSearch(e.target.value)}
            placeholder="Поиск по названию или внешней ссылке…"
            style={{ width: '100%', padding: '8px 12px', borderRadius: 8,
              border: `1.5px solid ${C.border}`, background: '#F8FBFF',
              fontFamily: FONT, fontSize: 13, color: C.text, boxSizing: 'border-box', marginBottom: 6 }} />
          <div style={{ display: 'flex', gap: 10 }}>
            <select value={sourceDocId} onChange={e => { setSourceDocId(e.target.value); setDocSearch(''); }}
              style={{ flex: 1, padding: '10px 14px', borderRadius: 9,
                border: `1.5px solid ${C.border}`, background: '#F8FBFF',
                fontFamily: FONT, fontSize: 14, color: C.text }}>
              <option value="">— Без источника —</option>
              {filteredDocs.map(d => (
                <option key={d.id} value={d.id}>
                  {d.external_ref ? `[${d.external_ref}] ` : ''}{d.title}
                </option>
              ))}
            </select>
            <Btn small variant="ghost" onClick={() => setShowNewDoc(true)}>+ Новый</Btn>
          </div>
        </div>

        {sourceDocId && (
          <Input label="Пункт источника" value={sourceClause} onChange={setSourceClause} placeholder="п. 3.2.1" />
        )}

        <ErrorBanner message={err} />
        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
          <Btn variant="ghost" onClick={onClose}>Отмена</Btn>
          <Btn onClick={submit} disabled={loading}>{loading ? 'Создание…' : 'Создать требование'}</Btn>
        </div>
      </Modal>

      <CreateDocumentModal
        open={showNewDoc} onClose={() => setShowNewDoc(false)}
        onCreated={doc => { setLocalDocs(p => [...p, doc]); setSourceDocId(doc.id); setShowNewDoc(false); }}
        selectedProject={selectedProject} token={token}
      />
    </>
  );
}

/* ══════════════════════════════════════════════════════════
   СТРАНИЦА
══════════════════════════════════════════════════════════ */
export default function RequirementsPage({ selectedProject }) {
  const { token, user } = useAuth();
  const isSuper = user?.is_supervisor;

  const [reqs,       setReqs]       = useState([]);
  const [docs,       setDocs]       = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [pdfView,    setPdfView]    = useState(null);
  const [detailReq,  setDetailReq]  = useState(null);
  const [approvalReq,setApprovalReq]= useState(null);
  const [ecrReq,     setEcrReq]     = useState(null);
  const [showCreate, setShowCreate] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [reqData, docData] = await Promise.all([
        selectedProject ? API.projReqs(selectedProject.id, token) : API.requirements(token),
        API.documents(token),
      ]);
      // Нормализуем поля (защита от PascalCase без json-тегов sqlc)
      setReqs((reqData ?? []).map(normalizeReq));
      setDocs(docData ?? []);
    } catch { setReqs([]); } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [selectedProject?.id]);

  return (
    <div>
      <PageHeader
        title="Таблица требований"
        subtitle={`${selectedProject?.name ?? 'Все проекты'} · ${reqs.length} записей`}
      >
        {isSuper && <Btn onClick={() => setShowCreate(true)}>+ Новое требование</Btn>}
        <Btn onClick={load} variant="ghost" small>↻ Обновить</Btn>
      </PageHeader>

      <Card style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? <Spinner /> : (
          <RequirementsTree
            reqs={reqs} docs={docs} isSuper={isSuper}
            onRowClick={setDetailReq}
            onApproval={setApprovalReq}
            onOpenPdf={doc => setPdfView(doc)}
          />
        )}
      </Card>

      <RequirementModal
        open={!!detailReq} req={detailReq} isSuper={isSuper}
        documents={docs} selectedProject={selectedProject}
        onClose={() => setDetailReq(null)}
        onCreateECR={r => { setDetailReq(null); setEcrReq(r); }}
        onCreateApproval={r => { setDetailReq(null); setApprovalReq(r); }}
      />
      <CreateApprovalModal open={!!approvalReq} req={approvalReq}
        onClose={() => setApprovalReq(null)} onCreated={load} />
      <CreateECRModal open={!!ecrReq} initialReq={ecrReq} allReqs={reqs}
        selectedProject={selectedProject}
        onClose={() => setEcrReq(null)} onCreated={load} />
      <CreateRequirementModal open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={() => { setShowCreate(false); load(); }}
        selectedProject={selectedProject} documents={docs} existingReqs={reqs} />
      <PDFViewer open={!!pdfView} docId={pdfView?.id} title={pdfView?.title}
        hasFile={!!pdfView?.file_path} onClose={() => setPdfView(null)} />
    </div>
  );
}
