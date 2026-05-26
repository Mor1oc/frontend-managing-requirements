import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { API } from '../api';
import { C, FONT } from '../theme';
import { Input, Btn, ErrorBanner } from '../components/UI';

export default function LoginPage() {
  const { login } = useAuth();
  const [isReg, setIsReg]     = useState(false);
  const [email, setEmail]     = useState('');
  const [pass,  setPass]      = useState('');
  const [name,  setName]      = useState('');
  const [dept,  setDept]      = useState('');
  const [pos,   setPos]       = useState('');
  const [err,   setErr]       = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setErr(''); setLoading(true);
    try {
      if (isReg) {
        await API.register({ full_name: name, email, password: pass, department: dept, position: pos });
      }
      await login(email, pass);
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e) => { if (e.key === 'Enter') submit(); };

  return (
    <div style={{
      minHeight: '100vh',
      background: `linear-gradient(145deg, #EFF6FF 0%, #CADFFF 50%, #DBEAFE 100%)`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: FONT, padding: 20,
    }}>
      {/* Decorative blobs */}
      <div style={{
        position: 'fixed', top: '-80px', right: '-80px',
        width: 320, height: 320, borderRadius: '50%',
        background: 'rgba(202,223,255,.4)', pointerEvents: 'none',
      }} />
      <div style={{
        position: 'fixed', bottom: '-60px', left: '-60px',
        width: 240, height: 240, borderRadius: '50%',
        background: 'rgba(126,174,232,.25)', pointerEvents: 'none',
      }} />

      <div style={{
        background: '#fff', borderRadius: 22,
        padding: '44px 48px', width: 440, maxWidth: '100%',
        boxShadow: '0 28px 80px rgba(15,52,96,.16)',
        border: `1px solid rgba(202,223,255,.6)`,
        position: 'relative',
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{
            width: 58, height: 58, borderRadius: 16,
            background: `linear-gradient(135deg, ${C.btn}, ${C.accentDark})`,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 28, color: '#fff', marginBottom: 14,
            boxShadow: '0 8px 24px rgba(29,111,164,.28)',
          }}>📋</div>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 800, color: C.navy, letterSpacing: '-.5px' }}>
            NovaReq
          </h1>
          <p style={{ margin: '8px 0 0', color: C.muted, fontSize: 14 }}>
            {isReg ? 'Создайте аккаунт для работы' : 'Войдите в систему управления требованиями'}
          </p>
        </div>

        {/* Form */}
        {isReg && (
          <>
            <Input label="Полное имя" value={name} onChange={setName}
              placeholder="Иванов Иван Иванович" required />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Input label="Отдел" value={dept} onChange={setDept} placeholder="Разработка" />
              <Input label="Должность" value={pos} onChange={setPos} placeholder="Инженер" />
            </div>
          </>
        )}
        <Input
          label="Email"
          type="email"
          value={email}
          onChange={setEmail}
          placeholder="ivan@company.ru"
          required
        />
        <Input
          label="Пароль"
          type="password"
          value={pass}
          onChange={setPass}
          placeholder="Минимум 8 символов"
          required
          style={{ marginBottom: 20 }}
        />

        <ErrorBanner message={err} />

        <Btn
          onClick={submit}
          disabled={loading}
          fullWidth
          style={{ padding: '14px', fontSize: 15 }}
        >
          {loading ? 'Загрузка…' : (isReg ? 'Зарегистрироваться' : 'Войти')}
        </Btn>

        <div style={{ textAlign: 'center', marginTop: 22, fontSize: 14, color: C.muted }}>
          {isReg ? 'Уже есть аккаунт? ' : 'Нет аккаунта? '}
          <span
            onClick={() => { setIsReg(p => !p); setErr(''); }}
            style={{ color: C.btn, cursor: 'pointer', fontWeight: 700 }}
          >
            {isReg ? 'Войти' : 'Зарегистрироваться'}
          </span>
        </div>
      </div>
    </div>
  );
}
