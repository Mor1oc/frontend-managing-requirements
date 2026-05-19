import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { API } from '../api';
import { C, FONT } from '../theme';
import {
  Card, Table, PageHeader, Btn, Modal,
  StatusBadge, Input, Textarea, Select, ErrorBanner, Spinner,
} from '../components/UI';
import PDFViewer from '../components/PDFViewer';

/* ── Редактирование документа ─────────────────────────────────────────────── */
function DocumentEditModal({ open, doc, onClose, onUpdated }) {
  const { token } = useAuth();
  const [title,   setTitle]   = useState('');
  const [desc,    setDesc]    = useState('');
  const [status,  setStatus]  = useState('active');
  const [loading, setLoading] = useState(false);
  const [err,     setErr]     = useState('');

  useEffect(() => {
    if (doc) {
      setTitle(doc.title      ?? '');
      setDesc(doc.description ?? '');
      setStatus(doc.status    ?? 'active');
      setErr('');
    }
  }, [doc]);

  const save = async () => {
    if (!title.trim()) { setErr('Укажите название'); return; }
    setLoading(true); setErr('');
    try {
      await API.updateDocument(doc.id, {
        version_number: doc.version_number,
        title: title.trim(),
        description: desc,
        status,
      }, token);
      onUpdated();
      onClose();
    } catch (e) { setErr(e.message); } finally { setLoading(false); }
  };

  if (!doc) return null;
  return (
    <Modal open={open} onClose={onClose} title="Редактировать документ">
      <div style={{
        background: '#EFF6FF', borderRadius: 9, padding: '10px 16px', marginBottom: 20,
        fontSize: 13, color: C.muted,
      }}>
        Тип: <strong style={{ color: C.navy }}>{doc.type_code}</strong>
        &nbsp;·&nbsp;Версия: <strong style={{ color: C.navy }}>v{doc.version_number}</strong>
      </div>
      <Input label="Название" value={title} onChange={setTitle} required />
      <Textarea label="Описание" value={desc} onChange={setDesc}
        placeholder="Описание документа…" />
      <Select label="Статус" value={status} onChange={setStatus} options={[
        { value: 'draft',      label: 'Черновик'   },
        { value: 'active',     label: 'Активный'   },
        { value: 'deprecated', label: 'Устаревший' },
      ]} />
      <ErrorBanner message={err} />
      <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
        <Btn variant="ghost" onClick={onClose}>Отмена</Btn>
        <Btn onClick={save} disabled={loading}>
          {loading ? 'Сохранение…' : 'Сохранить'}
        </Btn>
      </div>
    </Modal>
  );
}

/* ── Создание документа (экспортируется для RequirementsPage) ─────────────── */
export function CreateDocumentModal({ open, onClose, onCreated, selectedProject, token }) {
  const [title,       setTitle]       = useState('');
  const [desc,        setDesc]        = useState('');
  const [typeCode,    setTypeCode]    = useState('');
  const [externalRef, setExternalRef] = useState('');
  const [isExternal,  setIsExternal]  = useState(true);
  const [file,        setFile]        = useState(null);
  const [docTypes,    setDocTypes]    = useState([]);
  const [loading,     setLoading]     = useState(false);
  const [err,         setErr]         = useState('');
  const fileRef = useRef();

  useEffect(() => {
    if (!open || !token) return;
    API.docTypes(token)
      .then(t => { setDocTypes(t ?? []); if (t?.length) setTypeCode(t[0].type_code); })
      .catch(() => {});
    setTitle(''); setDesc(''); setExternalRef(''); setFile(null); setErr('');
  }, [open, token]);

  const submit = async () => {
    if (!title.trim() || !typeCode) { setErr('Укажите название и тип'); return; }
    setLoading(true); setErr('');
    try {
      const form = new FormData();
      form.append('title',        title.trim());
      form.append('description',  desc);
      form.append('type_code',    typeCode);
      form.append('external_ref', externalRef);
      form.append('is_external',  String(isExternal));
      if (selectedProject?.id) form.append('project_id', selectedProject.id);
      if (file) form.append('file', file);
      const created = await API.createDocument(form, token);
      onCreated(created);
      onClose();
    } catch (e) { setErr(e.message); } finally { setLoading(false); }
  };

  return (
    <Modal open={open} onClose={onClose} title="Создать документ">
      <Input label="Название" value={title} onChange={setTitle}
        placeholder="Название документа" required />
      <Textarea label="Описание" value={desc} onChange={setDesc}
        placeholder="Описание…" />
      <Input label="Внешний ref" value={externalRef} onChange={setExternalRef}
        placeholder="DOC-001" />
      <Select
        label="Тип документа" value={typeCode} onChange={setTypeCode} required
        options={docTypes.map(t => ({ value: t.type_code, label: t.type_code }))}
      />

      <div style={{ marginBottom: 16 }}>
        <label style={{
          display: 'block', marginBottom: 6,
          fontSize: 13, fontWeight: 600, color: C.navy, fontFamily: FONT,
        }}>
          PDF-файл
          <span style={{ color: C.muted, fontWeight: 400 }}>
            {' '}(можно добавить позже)
          </span>
        </label>
        <div
          onClick={() => fileRef.current?.click()}
          style={{
            border: `2px dashed ${file ? C.accentDark : C.border}`,
            borderRadius: 9, padding: 20, textAlign: 'center',
            cursor: 'pointer',
            background: file ? '#EFF6FF' : '#FAFCFF',
          }}
        >
          {file ? (
            <div style={{ color: C.navy, fontWeight: 600 }}>
              📎 {file.name}
              <span style={{ color: C.muted, fontWeight: 400, marginLeft: 8 }}>
                ({(file.size / 1024).toFixed(0)} KB)
              </span>
            </div>
          ) : (
            <div style={{ color: C.muted }}>
              <div style={{ fontSize: 24, marginBottom: 6 }}>📄</div>
              Нажмите для выбора PDF
            </div>
          )}
        </div>
        <input ref={fileRef} type="file" accept=".pdf" style={{ display: 'none' }}
          onChange={e => setFile(e.target.files?.[0] ?? null)} />
        {file && (
          <button onClick={() => setFile(null)} style={{
            marginTop: 8, background: 'none', border: 'none',
            color: C.error, cursor: 'pointer', fontSize: 13,
          }}>✕ Убрать файл</button>
        )}
      </div>

      <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, cursor: 'pointer' }}>
        <input type="checkbox" checked={isExternal}
          onChange={e => setIsExternal(e.target.checked)}
          style={{ accentColor: C.btn, width: 16, height: 16 }} />
        <span style={{ fontSize: 14, color: C.text }}>Внешний документ</span>
      </label>

      <ErrorBanner message={err} />
      <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
        <Btn variant="ghost" onClick={onClose}>Отмена</Btn>
        <Btn onClick={submit} disabled={loading}>
          {loading ? 'Создание…' : 'Создать документ'}
        </Btn>
      </div>
    </Modal>
  );
}

/* ── Страница документов ──────────────────────────────────────────────────── */
export default function DocumentsPage({ selectedProject }) {
  const { token } = useAuth();
  const [docs,         setDocs]         = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [docTypes,     setDocTypes]     = useState([]);
  const [typeFilter,   setTypeFilter]   = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // PDF viewer state
  const [pdfView,    setPdfView]    = useState(null); // { docId, title, hasFile }
  const [editDoc,    setEditDoc]    = useState(null);
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    API.docTypes(token).then(t => setDocTypes(t ?? [])).catch(() => {});
  }, [token]);

  useEffect(() => { load(); }, [selectedProject?.id]);

  const load = async () => {
    setLoading(true);
    try {
      const data = await API.documents(token);
      setDocs(data ?? []);
    } catch { setDocs([]); } finally { setLoading(false); }
  };

  const fmtDate = v => v ? new Date(v).toLocaleDateString('ru') : '—';

  const visible = docs.filter(d => {
    if (typeFilter   !== 'all' && d.type_code !== typeFilter) return false;
    if (statusFilter !== 'all' && d.status    !== statusFilter) return false;
    return true;
  });

  const columns = [
    { key: 'external_ref',     label: 'Ref',       render: v => v ?? '—' },
    { key: 'title',            label: 'Название',  render: v => (
      <span style={{ fontWeight: 600, color: C.navy }}>{v}</span>
    )},
    { key: 'type_code',        label: 'Тип'        },
    { key: 'version_number',   label: 'Версия',    render: v => `v${v}` },
    { key: 'status',           label: 'Статус',    render: v => <StatusBadge status={v} /> },
    { key: 'is_external',      label: 'Внешний',   render: v => v ? 'Да' : 'Нет' },
    { key: 'uploaded_by_name', label: 'Загружен'   },
    { key: 'uploaded_at',      label: 'Дата',      render: fmtDate },
    {
      key: '_actions', label: '',
      render: (_, row) => (
        <div style={{ display: 'flex', gap: 6 }}>
          {/* Кнопка просмотра PDF — только если файл прикреплён */}
          {row.file_path && (
            <Btn small variant="accent"
              onClick={e => {
                e.stopPropagation();
                setPdfView({ docId: row.id, title: row.title, hasFile: true });
              }}>
              📄 Открыть
            </Btn>
          )}
          <Btn small variant="ghost"
            onClick={e => { e.stopPropagation(); setEditDoc(row); }}>
            ✏️
          </Btn>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader title="Документы" subtitle={selectedProject?.name ?? 'Все документы'}>
        <Btn onClick={() => setShowCreate(true)}>+ Создать документ</Btn>
        <Btn onClick={load} variant="ghost" small>↻ Обновить</Btn>
      </PageHeader>

      {/* Фильтры */}
      <div style={{
        display: 'flex', gap: 12, marginBottom: 20,
        flexWrap: 'wrap', alignItems: 'center',
      }}>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
          style={filterStyle}>
          <option value="all">Все типы</option>
          {docTypes.map(t => (
            <option key={t.type_code} value={t.type_code}>{t.type_code}</option>
          ))}
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          style={filterStyle}>
          <option value="all">Все статусы</option>
          <option value="draft">Черновик</option>
          <option value="active">Активный</option>
          <option value="deprecated">Устаревший</option>
        </select>
        <span style={{ color: C.muted, fontSize: 13, marginLeft: 'auto' }}>
          {visible.length} из {docs.length}
        </span>
      </div>

      <Card style={{ padding: 0, overflow: 'hidden' }}>
        <Table
          columns={columns}
          data={visible}
          loading={loading}
          onRowClick={row => {
            if (row.file_path) {
              setPdfView({ docId: row.id, title: row.title, hasFile: true });
            }
          }}
        />
      </Card>

      {/* Общий PDF просмотрщик */}
      <PDFViewer
        open={!!pdfView}
        docId={pdfView?.docId}
        title={pdfView?.title}
        hasFile={!!pdfView?.hasFile}
        onClose={() => setPdfView(null)}
      />

      <DocumentEditModal
        open={!!editDoc} doc={editDoc}
        onClose={() => setEditDoc(null)} onUpdated={load}
      />
      <CreateDocumentModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={() => { setShowCreate(false); load(); }}
        selectedProject={selectedProject}
        token={token}
      />
    </div>
  );
}

const filterStyle = {
  padding: '7px 12px', borderRadius: 8,
  border: `1.5px solid ${C.border}`,
  background: '#F8FBFF', fontFamily: FONT,
  fontSize: 13, color: C.text, cursor: 'pointer',
};
