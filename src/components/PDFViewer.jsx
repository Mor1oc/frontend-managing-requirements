import { useAuth } from '../context/AuthContext';
import { usePdfBlob } from '../hooks/usePdfBlob';
import { C, FONT } from '../theme';
import { Modal, Btn, Spinner } from './UI';

/**
 * Универсальный модал просмотра PDF.
 * Загружает файл через fetch с JWT, показывает в <iframe>.
 *
 * Props:
 *   open     - boolean
 *   docId    - string (ID документа)
 *   title    - string (заголовок модала)
 *   hasFile  - boolean (есть ли прикреплённый файл)
 *   onClose  - function
 */
export default function PDFViewer({ open, docId, title, hasFile, onClose }) {
  const { token } = useAuth();
  const { blobUrl, loading, fetchErr, revoke } = usePdfBlob(
    docId,
    open && !!hasFile,
    token,
  );

  const handleClose = () => { revoke(); onClose(); };

  return (
    <Modal open={open} onClose={handleClose} title={title ?? 'Просмотр документа'} wide>
      {!hasFile ? (
        <div style={{
          textAlign: 'center', padding: 48,
          background: '#F8FBFF', borderRadius: 10,
        }}>
          <div style={{ fontSize: 44, marginBottom: 14 }}>📄</div>
          <div style={{ fontSize: 15, color: C.navy, fontWeight: 600 }}>
            PDF-файл не прикреплён
          </div>
          <div style={{ fontSize: 13, color: C.muted, marginTop: 6 }}>
            Отредактируйте документ и загрузите файл
          </div>
          <div style={{ marginTop: 20 }}>
            <Btn variant="ghost" onClick={handleClose}>Закрыть</Btn>
          </div>
        </div>
      ) : loading ? (
        <div style={{ padding: 40, textAlign: 'center' }}>
          <Spinner />
          <div style={{ color: C.muted, marginTop: 12, fontSize: 14 }}>
            Загрузка документа…
          </div>
        </div>
      ) : fetchErr ? (
        <div style={{
          background: '#FEE2E2', color: C.error,
          padding: '14px 18px', borderRadius: 9, fontSize: 14, marginBottom: 16,
        }}>
          Не удалось загрузить файл: {fetchErr}
        </div>
      ) : blobUrl ? (
        <>
          <iframe
            src={blobUrl}
            title={title}
            style={{
              width: '100%', height: '72vh',
              border: `1px solid ${C.border}`,
              borderRadius: 9, display: 'block',
            }}
          />
          <div style={{ display: 'flex', gap: 10, marginTop: 12, justifyContent: 'flex-end' }}>
            <a
              href={blobUrl}
              download={`${title ?? 'document'}.pdf`}
              style={{ textDecoration: 'none' }}
            >
              <Btn variant="ghost" small>⬇ Скачать PDF</Btn>
            </a>
            <Btn variant="ghost" onClick={handleClose}>Закрыть</Btn>
          </div>
        </>
      ) : null}
    </Modal>
  );
}
