import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { API } from '../api';
import { C, FONT } from '../theme';
import {
  Card, Table, PageHeader, Btn, Modal,
  StatusBadge, Input, Textarea, Select, ErrorBanner, Spinner,
} from '../components/UI';

/* ── PDF Viewer modal ─────────────────────────────────────────────────────── */
function PDFViewerModal({ open, doc, searchClause, onClose }) {
  if (!doc) return null;

  const fileUrl = API.docFileUrl(doc.id);
  // Chrome / Firefox built-in PDF viewer supports #search=text
  const viewerUrl = searchClause
    ? `${fileUrl}#search=${encodeURIComponent(searchClause)}`
    : fileUrl;

  return (
    <Modal open={open} onClose={onClose} title={doc.title} wide>
      {/* Clause info */}
      {searchClause && (
        <div style={{
          background: '#FFFBEB', border: '1px solid #FDE68A',
          borderRadius: 9, padding: '10px 16px', marginBottom: 14,
          fontSize: 13, color: '#92400E',
        }}>
          🔍 Поиск пункта: <strong>{searchClause}</strong>
          <span style={{ color: C.muted, marginLeft: 8 }}>
            (работает во встроенном PDF-просмотре Chrome/Firefox)
          </span>
        </div>
      )}

      {doc.file_path ? (
        <>
          <iframe
            src={viewerUrl}
            title={doc.title}
            style={{
              width: '100%', height: '70vh',
              border: `1px solid ${C.border}`, borderRadius: 9,
            }}
          />
          <div style={{ display: 'flex', gap: 10, marginTop: 12, justifyContent: 'flex-end' }}>
            <a href={fileUrl} target="_blank" rel="noreferrer">
              <Btn variant="ghost" small>↗ Открыть в новой вкладке</Btn>
            </a>
            <a href={fileUrl} download>
              <Btn variant="ghost" small>⬇ Скачать PDF</Btn>
            </a>
            <Btn variant="ghost" onClick={onClose}>Закрыть</Btn>
          </div>
        </>
      ) : (
        <div style={{
          textAlign: 'center', padding: 40,
          color: C.muted, background: '#F8FBFF', borderRadius: 9,
        }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📄</div>
          <div style={{ fontSize: 15 }}>К этому документу не прикреплён PDF-файл</div>
          <div style={{ fontSize: 13, marginTop: 6 }}>
            Отредактируйте документ и загрузите файл
          </div>
        </div>
      )}
    </Modal>
  );
}

/* ── Document detail / edit modal ─────────────────────────────────────────── */
function DocumentModal({ open, doc, onClose, onUpdated, docTypes }) {
  const { token } = useAuth();
  const [title,   setTitle]  = useState('');
  const [desc,    setDesc]   = useState('');
  const [status,  setStatus] = useState('active');
  const [loading, setLoading] = useState(false);
  const [err,     setErr]    = useState('');

  useEffect(() => {
    if (doc) {
      setTitle(doc.title ?? '');
      setDesc(doc.description ?? '');
      setStatus(doc.status ?? 'active');
      setErr('');
    }
  }, [doc]);

  const save = async () => {
    setLoading(true); setErr('');
    try {
      await API.updateDocument(doc.id, {
        version_number: doc.version_number,
        title,
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
        &nbsp;·&nbsp;Загружен: <strong style={{ color: C.navy }}>{doc.uploaded_by_name}</strong>
      </div>

      <Input label="Название" value={title} onChange={setTitle} required />
      <Textarea label="Описание" value={desc} onChange={setDesc} placeholder="Описание документа..." />
      <Select label="Статус" value={status} onChange={setStatus} options={[
        { value: 'draft',      label: 'Черновик'   },
        { value: 'active',     label: 'Активный'   },
        { value: 'deprecated', label: 'Устаревший'  },
      ]} />

      <ErrorBanner message={err} />
      <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
        <Btn variant="ghost" onClick={onClose}>Отмена</Btn>
        <Btn onClick={save} disabled={loading}>{loading ? 'Сохранение…' : 'Сохранить'}</Btn>
      </div>
    </Modal>
  );
}

/* ── Create document modal ────────────────────────────────────────────────── */
export function CreateDocumentModal({ open, onClose, onCreated, selectedProject, token, user }) {
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
    if (open && token) {
      API.docTypes(token).then(t => {
        setDocTypes(t ?? []);
        if (t?.length) setTypeCode(t[0].type_code);
      }).catch(() => {});
      setTitle(''); setDesc(''); setExternalRef(''); setFile(null); setErr('');
    }
  }, [open]);

  const submit = async () => {
    if (!title.trim() || !typeCode) { setErr('Укажите название и тип документа'); return; }
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
        placeholder="Описание..." />
      <Input label="Внешний ref" value={externalRef} onChange={setExternalRef}
        placeholder="DOC-001" />
      <Select
        label="Тип документа"
        value={typeCode}
        onChange={setTypeCode}
        required
        options={docTypes.map(t => ({ value: t.type_code, label: t.type_code }))}
      />

      {/* File upload */}
      <div style={{ marginBottom: 16 }}>
        <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 600, color: C.navy }}>
          PDF-файл <span style={{ color: C.muted, fontWeight: 400 }}>(необязательно, можно добавить позже)</span>
        </label>
        <div
          onClick={() => fileRef.current?.click()}
          style={{
            border: `2px dashed ${file ? C.accentDark : C.border}`,
            borderRadius: 9, padding: '20px', textAlign: 'center',
            cursor: 'pointer', background: file ? '#EFF6FF' : '#FAFCFF',
            transition: 'all .15s',
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
              Нажмите для выбора PDF-файла
            </div>
          )}
        </div>
        <input
          ref={fileRef}
          type="file"
          accept=".pdf"
          style={{ display: 'none' }}
          onChange={e => setFile(e.target.files?.[0] ?? null)}
        />
        {file && (
          <button
            onClick={() => setFile(null)}
            style={{ marginTop: 8, background: 'none', border: 'none', color: C.error, cursor: 'pointer', fontSize: 13 }}
          >
            ✕ Убрать файл
          </button>
        )}
      </div>

      <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, cursor: 'pointer' }}>
        <input
          type="checkbox"
          checked={isExternal}
          onChange={e => setIsExternal(e.target.checked)}
          style={{ accentColor: C.btn, width: 16, height: 16 }}
        />
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

/* ── Documents page ───────────────────────────────────────────────────────── */
export default function DocumentsPage({ selectedProject }) {
  const { token, user } = useAuth();
  const [docs,      setDocs]      = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [scope,     setScope]     = useState('project'); // 'project' | 'all'
  const [docTypes,  setDocTypes]  = useState([]);
  const [typeFilter,setTypeFilter]= useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modals
  const [viewDoc,    setViewDoc]    = useState(null);  // PDF viewer
  const [editDoc,    setEditDoc]    = useState(null);  // edit modal
  const [showCreate, setShowCreate] = useState(false); // create modal

  useEffect(() => {
    API.docTypes(token).then(t => setDocTypes(t ?? [])).catch(() => {});
  }, []);

  useEffect(() => { load(); }, [scope, selectedProject?.id]);

  const load = async () => {
    setLoading(true);
    try {
      const data = await API.documents(token);
      let filtered = data ?? [];
      // Filter by project if scope = project
      if (scope === 'project' && selectedProject) {
        // Backend doesn't expose docs-by-project endpoint easily,
        // so we filter client-side by what we have.
        // If you add GET /document/all?project_id=X on backend - use that instead.
      }
      setDocs(filtered);
    } catch { setDocs([]); } finally { setLoading(false); }
  };

  const fmtDate = v => v ? new Date(v).toLocaleDateString('ru') : '—';

  // client-side filtering
  const visible = docs.filter(d => {
    if (typeFilter !== 'all' && d.type_code !== typeFilter) return false;
    if (statusFilter !== 'all' && d.status !== statusFilter) return false;
    return true;
  });

  const columns = [
    { key: 'external_ref',    label: 'Ref',       render: v => v ?? '—' },
    { key: 'title',           label: 'Название',  render: v => (
      <span style={{ fontWeight: 600, color: C.navy }}>{v}</span>
    )},
    { key: 'type_code',       label: 'Тип'        },
    { key: 'version_number',  label: 'Версия',    render: v => `v${v}` },
    { key: 'status',          label: 'Статус',    render: v => <StatusBadge status={v} /> },
    { key: 'is_external',     label: 'Внешний',   render: v => v ? 'Да' : 'Нет' },
    { key: 'uploaded_by_name',label: 'Загружен'   },
    { key: 'uploaded_at',     label: 'Дата',      render: fmtDate },
    {
      key: '_actions',
      label: '',
      render: (_, row) => (
        <div style={{ display: 'flex', gap: 6 }}>
          {row.file_path && (
            <Btn small variant="accent" onClick={e => { e.stopPropagation(); setViewDoc(row); }}>
              📄 PDF
            </Btn>
          )}
          <Btn small variant="ghost" onClick={e => { e.stopPropagation(); setEditDoc(row); }}>
            ✏️
          </Btn>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader title="Документы" subtitle={selectedProject?.name ?? 'Все проекты'}>
        <Btn onClick={() => setShowCreate(true)}>+ Создать документ</Btn>
        <Btn onClick={load} variant="ghost" small>↻ Обновить</Btn>
      </PageHeader>

      {/* Scope + filter bar */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        {/* Scope toggle */}
        <div style={{
          display: 'flex', background: '#EFF6FF',
          border: `1px solid ${C.border}`, borderRadius: 9, overflow: 'hidden',
        }}>
          {[['project','Проект'],['all','Все']].map(([val, label]) => (
            <button key={val} onClick={() => setScope(val)} style={{
              background: scope === val ? C.accent : 'transparent',
              color: scope === val ? C.navy : C.muted,
              border: 'none', padding: '7px 18px',
              fontFamily: FONT, fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}>{label}</button>
          ))}
        </div>

        {/* Type filter */}
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} style={filterSelectStyle}>
          <option value="all">Все типы</option>
          {docTypes.map(t => <option key={t.type_code} value={t.type_code}>{t.type_code}</option>)}
        </select>

        {/* Status filter */}
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={filterSelectStyle}>
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
          onRowClick={row => setViewDoc(row)}
        />
      </Card>

      {/* Modals */}
      <PDFViewerModal
        open={!!viewDoc}
        doc={viewDoc}
        searchClause={viewDoc?.description ?? ''}
        onClose={() => setViewDoc(null)}
      />

      <DocumentModal
        open={!!editDoc}
        doc={editDoc}
        docTypes={docTypes}
        onClose={() => setEditDoc(null)}
        onUpdated={load}
      />

      <CreateDocumentModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={() => { setShowCreate(false); load(); }}
        selectedProject={selectedProject}
        token={token}
        user={user}
      />
    </div>
  );
}

const filterSelectStyle = {
  padding: '7px 12px', borderRadius: 8,
  border: `1.5px solid ${C.border}`,
  background: '#F8FBFF', fontFamily: FONT,
  fontSize: 13, color: C.text, cursor: 'pointer',
};
