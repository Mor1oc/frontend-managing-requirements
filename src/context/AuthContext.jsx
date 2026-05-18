import { createContext, useContext, useState, useEffect } from 'react';
import { API } from '../api';

const AuthCtx = createContext(null);

// ── Нормализация пользователя ─────────────────────────────────────────────────
// sqlc без emit_json_tags возвращает PascalCase поля (IsSupervisor, FullName…).
// sqlc с emit_json_tags возвращает snake_case (is_supervisor, full_name…).
// pgtype.Text сериализуется как строка (Valid=true) или null (Valid=false).
// Эта функция обрабатывает оба варианта и делает поля единообразными.

function extractString(val) {
  if (!val) return '';
  if (typeof val === 'string') return val;
  // pgtype.Text без json_tags: { String: "...", Valid: true }
  if (typeof val === 'object' && 'String' in val) return val.String || '';
  return String(val);
}

function normalizeUser(raw) {
  if (!raw) return null;
  return {
    id:            raw.id            ?? raw.ID,
    full_name:     raw.full_name     ?? raw.FullName     ?? '',
    email:         raw.email         ?? raw.Email        ?? '',
    department:    extractString(raw.department    ?? raw.Department),
    position:      extractString(raw.position      ?? raw.Position),
    // bool NOT NULL → Go bool → JSON boolean в обоих форматах,
    // отличается только имя ключа: is_supervisor vs IsSupervisor
    is_supervisor: raw.is_supervisor ?? raw.IsSupervisor ?? false,
    created_at:    raw.created_at    ?? raw.CreatedAt,
    updated_at:    raw.updated_at    ?? raw.UpdatedAt,
  };
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('rm_token'));
  const [user,  setUser]  = useState(null);
  const [ready, setReady] = useState(false);

  // При загрузке страницы восстанавливаем сессию через /user/me
  // (возвращает актуальные данные из БД, а не из JWT)
  useEffect(() => {
    if (!token) { setReady(true); return; }
    API.me(token)
      .then(raw  => setUser(normalizeUser(raw)))
      .catch(()  => { setToken(null); localStorage.removeItem('rm_token'); })
      .finally(() => setReady(true));
  }, []);

  const login = async (email, password) => {
    const res = await API.login({ email, password });
    localStorage.setItem('rm_token', res.token);
    setToken(res.token);
    // Нормализуем: res.user может быть в любом из форматов
    setUser(normalizeUser(res.user));
  };

  const logout = () => {
    localStorage.removeItem('rm_token');
    setToken(null);
    setUser(null);
  };

  // Позволяет обновить профиль без перезахода (используется в UserModal)
  const refreshUser = async () => {
    if (!token) return;
    try {
      const raw = await API.me(token);
      setUser(normalizeUser(raw));
    } catch (_) {}
  };

  return (
    <AuthCtx.Provider value={{ token, user, setUser: (raw) => setUser(normalizeUser(raw)), login, logout, ready, refreshUser }}>
      {children}
    </AuthCtx.Provider>
  );
}

export const useAuth = () => useContext(AuthCtx);
