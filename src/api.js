const BASE = import.meta?.env?.VITE_API_URL ?? 'http://localhost:8080';

async function req(path, opts = {}, token = null) {
  const headers = { ...(token ? { Authorization: `Bearer ${token}` } : {}) };
  if (!(opts.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }
  const res = await fetch(`${BASE}${path}`, { ...opts, headers });
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(e.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export const API = {
  login:          (d)           => req('/auth/login',    { method: 'POST', body: JSON.stringify(d) }),
  register:       (d)           => req('/auth/register', { method: 'POST', body: JSON.stringify(d) }),
  me:             (t)           => req('/user/me', {}, t),
  updateUser:     (d, t)        => req('/user/', { method: 'PUT', body: JSON.stringify(d) }, t),
  projects:       (t)           => req('/project/all', {}, t),
  createProject:  (d, t)        => req('/project/create', { method: 'POST', body: JSON.stringify(d) }, t),
  projReqs:       (id, t)       => req(`/project/${id}/requirements`, {}, t),
  projApprovals:  (id, t)       => req(`/project/${id}`, {}, t),
  specUrl:        (projectId, t)=> `${BASE}/project/${projectId}/specification`,
  requirements:   (t)           => req('/requrement/all', {}, t),
  reqVersions:    (id, t)       => req(`/requrement/${id}/versions`, {}, t),
  reqTypes:       (t)           => req('/requrement/types', {}, t),
  createReq:      (d, t)        => req('/requrement/', { method: 'POST', body: JSON.stringify(d) }, t),
  approvals:      (t)           => req('/aproval/all', {}, t),
  createApproval: (rId, d, t)   => req(`/aproval/${rId}`, { method: 'POST', body: JSON.stringify(d) }, t),
  updateApproval: (rId, d, t)   => req(`/aproval/${rId}`, { method: 'PUT',  body: JSON.stringify(d) }, t),
  documents:      (t)           => req('/document/all', {}, t),
  documentById:   (id, t)       => req(`/document/${id}`, {}, t),
  docTypes:       (t)           => req('/document/types', {}, t),
  createDocument: (formData, t) => req('/document/', { method: 'POST', body: formData }, t),
  updateDocument: (id, d, t)    => req(`/document/${id}`, { method: 'PUT', body: JSON.stringify(d) }, t),
  docFileUrl:     (id)          => `${BASE}/document/${id}/file`,
  ecrs:           (t)           => req('/ecr/all', {}, t),
  createEcr:      (d, t)        => req('/ecr/', { method: 'POST',  body: JSON.stringify(d) }, t),
  patchEcr:       (id, d, t)    => req(`/ecr/${id}`, { method: 'PATCH', body: JSON.stringify(d) }, t),
  createEco:      (d, t)        => req('/ecr/eco', { method: 'POST', body: JSON.stringify(d) }, t),
  ecos:           (t)           => req('/eco/all', {}, t),
  eco:            (id, t)       => req(`/eco/${id}`, {}, t),
  patchEco:       (id, d, t)    => req(`/eco/${id}`, { method: 'PATCH', body: JSON.stringify(d) }, t),
};
