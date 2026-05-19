import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { API } from '../api';
import { C, FONT } from '../theme';
import {
  Card, Table, PageHeader, Btn, Modal,
  InfoGrid, StatusBadge, Input, Textarea, Select, ErrorBanner, Spinner,
} from '../components/UI';
import PDFViewer from '../components/PDFViewer';
import { CreateDocumentModal } from './DocumentsPage';

/* ── Создание требования (только супервайзер) ─────────────────────────────── */
function CreateRequirementModal({ open, onClose, onCreated, selectedProject, documents }) {
  const { token, user } = useAuth();
  const [title,         setTitle]         = useState('');
  const [desc,          setDesc]          = useState('');
  const [extId,         setExtId]         = useState('');
  const [typeName,      setTypeName]      = useState('');
  const [versionNumber, setVersionNumber] = useState(1);
  const [reqTypes,      setReqTypes]      = useState([]);
  const [sourceDocId,   setSourceDocId]   = useState('');
  const [sourceClause,  setSourceClause]  = useState('');
  const [loading,       setLoading]       = useState(false);
  const [err,           setErr]           = useState('');
  const [showNewDoc,    setShowNewDoc]    = useState(false);
  const [localDocs,     setLocalDocs]     = useState([]);

  useEffect(() => { setLocalDocs(documents ?? []); }, [documents]);

  useEffect(() => {
    if (!open || !token) return;
    API.reqTypes(token)
      .then(t => { setReqTypes(t ?? []); if (t?.length) setTypeName(t[0].name); })
      .catch(() => {});
    setTitle(''); setDesc(''); setExtId(''); setVersionNumber(1);
    setSourceDocId(''); setSourceClause(''); setErr('');
  }, [open]);

  const submit = async () => {
    if (!title.trim() || !typeName) { setErr('Укажите название и тип'); return; }
    if (!selectedProject)           { setErr('Выберите проект');         return; }
    setLoading(true); setErr('');
    try {
      await API.createReq({
        project_id:              selectedProject.id,
        type_name:               typeName,
        title:                   title.trim(),
        version_number:          versionNumber,       // всегда передаём явно
        description:             desc             || undefined,
        external_id:             extId            || undefined,
        source_document_id:      sourceDocId      || undefined,
        source_document_version: sourceDocId ? 1  : undefined,
        source_clause:           sourceClause     || undefined,
      }, token);
      onCreated();
      onClose();
    } catch (e) { setErr(e.message); } finally { setLoading(false); }
  };

  return (
    <>
      <Modal open={open && !showNewDoc} onClose={onClose} title="Создать требование" wide>
        <div style={{
          background: '#EFF6FF', borderRadius: 9, padding: '10px 16px', marginBottom: 20,
          fontSize: 13, color: C.muted,
        }}>
          Проект: <strong style={{ color: C.navy }}>{selectedProject?.name ?? '—'}</strong>
          &nbsp;·&nbsp;Начальный статус: <StatusBadge status="draft" />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 120px', gap: 12 }}>
          <div style={{ gridColumn: '1 / 3' }}>
            <Input label="Название" value={title} onChange={setTitle}
              placeholder="Система должна…" required />
          </div>
          <Input
            label="Версия"
            type="number"
            value={String(versionNumber)}
            onChange={v => setVersionNumber(Math.max(1, parseInt(v) || 1))}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Input label="Внешний ID" value={extId} onChange={setExtId} placeholder="REQ-001" />
          <Select
            label="Тип требования" value={typeName} onChange={setTypeName} required
            options={reqTypes.map(t => ({ value: t.name, label: t.name }))}
          />
        </div>

        <Textarea label="Описание" value={desc} onChange={setDesc}
          placeholder="Подробное описание…" rows={4} />

        {/* Документ-источник */}
        <div style={{ marginBottom: 16 }}>
          <label style={{
            display: 'block', marginBottom: 6,
            fontSize: 13, fontWeight: 600, color: C.navy, fontFamily: FONT,
          }}>
            Документ-источник
          </label>
          <div style={{ display: 'flex', gap: 10 }}>
            <select
              value={sourceDocId}
              onChange={e => setSourceDocId(e.target.value)}
              style={{
                flex: 1, padding: '10px 14px', borderRadius: 9,
                border: `1.5px solid ${C.border}`, background: '#F8FBFF',
                fontFamily: FONT, fontSize: 14, color: C.text,
              }}
            >
              <option value="">— Без источника —</option>
              {localDocs.map(d => (
                <option key={d.id} value={d.id}>{d.title} (v{d.version_number})</option>
              ))}
            </select>
            <Btn small variant="ghost" onClick={() => setShowNewDoc(true)}>
              + Новый документ
            </Btn>
          </div>
        </div>

        {sourceDocId && (
          <Input label="Пункт источника" value={sourceClause} onChange={setSourceClause}
            placeholder="п. 3.2.1" />
        )}

        <ErrorBanner message={err} />
        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
          <Btn variant="ghost" onClick={onClose}>Отмена</Btn>
          <Btn onClick={submit} disabled={loading}>
            {loading ? 'Создание…' : 'Создать требование'}
          </Btn>
        </div>
      </Modal>

      <CreateDocumentModal
        open={showNewDoc}
        onClose={() => setShowNewDoc(false)}
        onCreated={doc => {
          setLocalDocs(p => [...p, doc]);
          setSourceDocId(doc.id);
          setShowNewDoc(false);
        }}
        selectedProject={selectedProject}
        token={token}
      />
    </>
  );
}

/* ── Детали требования ────────────────────────────────────────────────────── */
function RequirementModal({ open, req, onClose, onCreateECR, onCreateApproval, isSuper, documents }) {
  const { token } = useAuth();
  const [versions,  setVersions]  = useState([]);
  const [loadingV,  setLoadingV]  = useState(false);
  const [pdfDocId,  setPdfDocId]  = useState(null);   // открыть PDF просмотр

  useEffect(() => {
    if (!open || !req) return;
    setLoadingV(true);
    API.reqVersions(req.id, token)
      .then(v => setVersions(v ?? []))
      .catch(() => setVersions([]))
      .finally(() => setLoadingV(false));
  }, [open, req?.id]);

  if (!req) return null;

  const sourceDoc = documents?.find(d => d.id === req.source_document_id);

  return (
    <>
      <Modal open={open} onClose={onClose} title={req.title} wide>
        {req.description && (
          <p style={{ color: C.text, marginBottom: 20, lineHeight: 1.7, fontSize: 15 }}>
            {req.description}
          </p>
        )}

        <InfoGrid items={[
          ['Внешний ID',  req.external_id ?? '—',  false],
          ['Тип',         req.type   ?? '—',  false],
          ['Версия',      `v${req.version_number}`, false],
          ['Статус',      req.status,               true ],
          ['Проект',      req.project_name ?? '—',  false],
          ['Baseline',    req.is_baseline ? 'Да' : 'Нет', false],
          ['Создано',     req.created_at ? new Date(req.created_at).toLocaleDateString('ru') : '—', false],
          ['Изменено',    req.changed_at  ? new Date(req.changed_at).toLocaleDateString('ru')  : '—', false],
        ]} />

        {/* Документ-источник с кнопкой просмотра PDF */}
        {req.source_document_id && (
          <div style={{
            background: '#EFF6FF', borderRadius: 9,
            padding: '12px 16px', marginBottom: 16,
          }}>
            <div style={{
              fontSize: 11, fontWeight: 700, color: C.muted,
              textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 6,
            }}>
              Документ-источник
            </div>
            <div style={{ fontWeight: 600, color: C.navy, marginBottom: 4 }}>
              {sourceDoc?.title ?? `ID: ${req.source_document_id.slice(0, 8)}…`}
            </div>
            {req.source_clause && (
              <div style={{ fontSize: 13, color: C.muted, marginBottom: 8 }}>
                Пункт: <strong style={{ color: C.text }}>{req.source_clause}</strong>
              </div>
            )}
            {sourceDoc?.file_path ? (
              <Btn small variant="accent" onClick={() => setPdfDocId(sourceDoc.id)}>
                📄 Открыть документ
              </Btn>
            ) : (
              <span style={{ fontSize: 12, color: C.muted }}>PDF-файл не прикреплён</span>
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

        {/* История версий */}
        {loadingV ? <Spinner size={24} /> : versions.length > 1 && (
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
      </Modal>

      {/* PDF просмотр источника */}
      <PDFViewer
        open={!!pdfDocId}
        docId={pdfDocId}
        title={sourceDoc?.title ?? 'Документ'}
        hasFile={!!sourceDoc?.file_path}
        onClose={() => setPdfDocId(null)}
      />
    </>
  );
}

/* ── Подтверждение выполнимости ───────────────────────────────────────────── */
function CreateApprovalModal({ open, req, onClose, onCreated }) {
  const { token, user } = useAuth();
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [err,     setErr]     = useState('');

  const submit = async () => {
    if (!req) return;
    setLoading(true); setErr('');
    try {
      await API.createApproval(req.id, {
        version_number: req.version_number,
        comment,
        approver_id: user?.id,
      }, token);
      setComment(''); onCreated(); onClose();
    } catch (e) { setErr(e.message); } finally { setLoading(false); }
  };

  return (
    <Modal open={open} onClose={onClose} title="Создать подтверждение выполнимости">
      {req && (
        <div style={{ background: '#EFF6FF', borderRadius: 9, padding: '12px 16px', marginBottom: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.muted, marginBottom: 4 }}>ТРЕБОВАНИЕ</div>
          <div style={{ fontWeight: 600, color: C.navy }}>{req.title}</div>
          <div style={{ fontSize: 13, color: C.muted, marginTop: 3 }}>
            v{req.version_number} · <StatusBadge status={req.status} />
          </div>
        </div>
      )}
      <Textarea label="Комментарий" value={comment} onChange={setComment}
        placeholder="Введите комментарий…" />
      <ErrorBanner message={err} />
      <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
        <Btn variant="ghost" onClick={onClose}>Отмена</Btn>
        <Btn onClick={submit} disabled={loading}>
          {loading ? 'Создание…' : 'Создать'}
        </Btn>
      </div>
    </Modal>
  );
}

/* ── Создание ECR ─────────────────────────────────────────────────────────── */
function CreateECRModal({ open, initialReq, allReqs, selectedProject, onClose, onCreated }) {
  const { token, user } = useAuth();
  const [title,    setTitle]    = useState('');
  const [desc,     setDesc]     = useState('');
  const [priority, setPriority] = useState('medium');
  const [selIds,   setSelIds]   = useState([]);
  const [loading,  setLoading]  = useState(false);
  const [err,      setErr]      = useState('');

  useEffect(() => {
    if (open) {
      setSelIds(initialReq ? [initialReq.id] : []);
      setTitle(''); setDesc(''); setPriority('medium'); setErr('');
    }
  }, [open, initialReq?.id]);

  const toggle = id => setSelIds(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);

  const submit = async () => {
    if (!title.trim())    { setErr('Введите название'); return; }
    if (!selectedProject) { setErr('Выберите проект');  return; }
    setLoading(true); setErr('');
    try {
      const links = allReqs
        .filter(r => selIds.includes(r.id))
        .map(r => ({ requirement_id: r.id, version_number: r.version_number }));
      await API.createEcr({
        title: title.trim(), description: desc, priority,
        requester_id: user?.id, project_id: selectedProject.id,
        requirement_links: links,
      }, token);
      onCreated(); onClose();
    } catch (e) { setErr(e.message); } finally { setLoading(false); }
  };

  return (
    <Modal open={open} onClose={onClose} title="Создать запрос на изменение" wide>
      <Input label="Название" value={title} onChange={setTitle}
        placeholder="Кратко опишите изменение…" required />
      <Textarea label="Описание" value={desc} onChange={setDesc} />
      <Select label="Приоритет" value={priority} onChange={setPriority} options={[
        { value: 'low',      label: 'Низкий'      },
        { value: 'medium',   label: 'Средний'     },
        { value: 'high',     label: 'Высокий'     },
        { value: 'critical', label: 'Критический' },
      ]} />

      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: C.navy, marginBottom: 8 }}>
          Затронутые требования
          <span style={{ color: C.muted, fontWeight: 400 }}> · выбрано {selIds.length}</span>
        </div>
        <div style={{
          maxHeight: 220, overflowY: 'auto',
          border: `1.5px solid ${C.border}`, borderRadius: 9,
        }}>
          {allReqs.map((r, i) => (
            <label key={r.id} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '10px 16px', cursor: 'pointer',
              background: selIds.includes(r.id) ? '#EFF6FF' : 'transparent',
              borderBottom: i < allReqs.length - 1 ? `1px solid ${C.border}` : 'none',
            }}>
              <input type="checkbox" checked={selIds.includes(r.id)}
                onChange={() => toggle(r.id)}
                style={{ accentColor: C.btn, width: 16, height: 16 }} />
              <span style={{ flex: 1, fontSize: 14 }}>{r.title}</span>
              <span style={{ fontSize: 12, color: C.muted }}>v{r.version_number}</span>
              <StatusBadge status={r.status} />
            </label>
          ))}
        </div>
      </div>

      <ErrorBanner message={err} />
      <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
        <Btn variant="ghost" onClick={onClose}>Отмена</Btn>
        <Btn onClick={submit} disabled={loading}>
          {loading ? 'Создание…' : 'Создать запрос'}
        </Btn>
      </div>
    </Modal>
  );
}

/* ── Страница требований ──────────────────────────────────────────────────── */
export default function RequirementsPage({ selectedProject }) {
  const { token, user } = useAuth();
  const isSuper = user?.is_supervisor;

  const [reqs,       setReqs]       = useState([]);
  const [docs,       setDocs]       = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [pdfView,    setPdfView]    = useState(null); // { docId, title, hasFile }

  const [detailReq,   setDetailReq]   = useState(null);
  const [approvalReq, setApprovalReq] = useState(null);
  const [ecrReq,      setEcrReq]      = useState(null);
  const [showCreate,  setShowCreate]  = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [reqData, docData] = await Promise.all([
        selectedProject ? API.projReqs(selectedProject.id, token) : API.requirements(token),
        API.documents(token),
      ]);
      setReqs(reqData ?? []);
      setDocs(docData ?? []);
    } catch { setReqs([]); } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [selectedProject?.id]);

  const fmtDate = v => v ? new Date(v).toLocaleDateString('ru') : '—';

  const columns = [
    { key: 'external_id',    label: 'ID',        render: v => v ?? '—' },
    { key: 'title',          label: 'Название',  render: v => (
      <span style={{ fontWeight: 600, color: C.navy }}>{v}</span>
    )},
    { key: 'type',      label: 'Тип'        },
    { key: 'version_number', label: 'Версия',    render: v => `v${v}` },
    { key: 'status',         label: 'Статус',    render: v => <StatusBadge status={v} /> },
    { key: 'is_baseline',    label: 'Baseline',  render: v => v
      ? <span style={{ color: C.success, fontWeight: 700 }}>✓</span>
      : <span style={{ color: C.muted }}>—</span>
    },
    { key: 'created_at',     label: 'Создано',   render: fmtDate },
    {
      key: '_doc', label: '📄',
      render: (_, row) => {
        const srcDoc = docs.find(d => d.id === row.source_document_id);
        if (!srcDoc?.file_path) return null;
        return (
          <Btn small variant="accent"
            onClick={e => {
              e.stopPropagation();
              setPdfView({ docId: srcDoc.id, title: srcDoc.title, hasFile: true });
            }}
          >
            📄
          </Btn>
        );
      },
    },
    ...(isSuper ? [{
      key: '_approval', label: '',
      render: (_, row) => (
        <Btn small variant="ghost"
          onClick={e => { e.stopPropagation(); setApprovalReq(row); }}>
          + Подтв.
        </Btn>
      ),
    }] : []),
  ];

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
        <Table columns={columns} data={reqs} loading={loading} onRowClick={setDetailReq} />
      </Card>

      <RequirementModal
        open={!!detailReq} req={detailReq} isSuper={isSuper} documents={docs}
        onClose={() => setDetailReq(null)}
        onCreateECR={r => { setDetailReq(null); setEcrReq(r); }}
        onCreateApproval={r => { setDetailReq(null); setApprovalReq(r); }}
      />
      <CreateApprovalModal
        open={!!approvalReq} req={approvalReq}
        onClose={() => setApprovalReq(null)} onCreated={load}
      />
      <CreateECRModal
        open={!!ecrReq} initialReq={ecrReq} allReqs={reqs}
        selectedProject={selectedProject}
        onClose={() => setEcrReq(null)} onCreated={load}
      />
      <CreateRequirementModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={() => { setShowCreate(false); load(); }}
        selectedProject={selectedProject}
        documents={docs}
      />

      {/* PDF просмотр из таблицы */}
      <PDFViewer
        open={!!pdfView}
        docId={pdfView?.docId}
        title={pdfView?.title}
        hasFile={!!pdfView?.hasFile}
        onClose={() => setPdfView(null)}
      />
    </div>
  );
}
