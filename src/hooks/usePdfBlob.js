import { useState, useEffect } from 'react';
import { API } from '../api';

/**
 * Загружает PDF через fetch с Authorization header и возвращает blob URL.
 * Браузер не может передать заголовок в <iframe src=...>, поэтому
 * единственный рабочий способ — fetch → Blob → createObjectURL.
 *
 * @param {string|null} docId   - ID документа
 * @param {boolean}     enabled - загружать ли прямо сейчас
 * @param {string}      token   - JWT
 */
export function usePdfBlob(docId, enabled, token) {
  const [blobUrl,  setBlobUrl]  = useState(null);
  const [loading,  setLoading]  = useState(false);
  const [fetchErr, setFetchErr] = useState('');

  useEffect(() => {
    if (!enabled || !docId) {
      setBlobUrl(null);
      setFetchErr('');
      return;
    }

    let cancelled  = false;
    let createdUrl = null;

    setLoading(true);
    setFetchErr('');
    setBlobUrl(null);

    fetch(API.docFileUrl(docId), {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.blob();
      })
      .then(blob => {
        if (cancelled) return;
        createdUrl = URL.createObjectURL(blob);
        setBlobUrl(createdUrl);
      })
      .catch(e => { if (!cancelled) setFetchErr(e.message); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => {
      cancelled = true;
      if (createdUrl) URL.revokeObjectURL(createdUrl);
    };
  }, [enabled, docId, token]);

  const revoke = () => {
    if (blobUrl) URL.revokeObjectURL(blobUrl);
    setBlobUrl(null);
  };

  return { blobUrl, loading, fetchErr, revoke };
}
