/* Bản quyền thuộc về TKyl - Copyright © TKyl */
import React, { useState } from 'react';
import { auth } from '../firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import toast from 'react-hot-toast';
import { Mail, Lock, LogIn, UserPlus } from 'lucide-react';

export default function AuthScreen() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Vui lòng nhập đầy đủ email và mật khẩu');
      return;
    }
    setLoading(true);
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
        toast.success('Đăng nhập thành công!');
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
        toast.success('Đăng ký thành công!');
      }
    } catch (error) {
      console.error(error);
      if (error.code === 'auth/email-already-in-use') {
        toast.error('Email này đã được sử dụng!');
      } else if (error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
        toast.error('Email hoặc mật khẩu không chính xác!');
      } else if (error.code === 'auth/weak-password') {
        toast.error('Mật khẩu quá yếu, cần ít nhất 6 ký tự!');
      } else {
        toast.error('Đã xảy ra lỗi: ' + error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      await signInWithPopup(auth, provider);
      toast.success('Đăng nhập Google thành công!');
    } catch (error) {
      console.error(error);
      if (error.code === 'auth/missing-initial-state' || error.message?.includes('missing initial state') || error.message?.includes('sessionStorage')) {
        toast.error('Trình duyệt (Zalo/FB/Messenger) chặn bộ nhớ! Vui lòng bấm dấu 3 chấm góc trên chọn "Mở bằng trình duyệt" (Chrome/Safari) để đăng nhập Google.', { duration: 8000 });
      } else if (error.code === 'auth/popup-blocked') {
        toast.error('Trình duyệt đã chặn cửa sổ bật lên (popup). Vui lòng cho phép popup để tiếp tục!');
      } else if (error.code === 'auth/popup-closed-by-user') {
        // User closed popup, no error toast needed
      } else {
        toast.error('Lỗi đăng nhập Google: ' + error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      background: 'radial-gradient(circle at top left, #1e1b4b, #0f172a, #020617)',
      padding: '2rem'
    }}>
      <div className="glass-panel" style={{ 
        width: '100%', 
        maxWidth: '400px', 
        padding: '2.5rem', 
        borderRadius: 'var(--radius-lg)',
        boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
        border: '1px solid rgba(255,255,255,0.1)'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1 style={{ 
            fontSize: '2rem', 
            fontWeight: 800, 
            background: 'linear-gradient(135deg, #a855f7, #ec4899)', 
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            margin: '0 0 0.5rem 0'
          }}>
            TaskMaster
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            {isLogin ? 'Chào mừng bạn quay trở lại' : 'Tạo tài khoản không gian làm việc mới'}
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }} autoComplete="off">
          <div style={{ position: 'relative' }}>
            <Mail size={18} color="var(--text-muted)" style={{ position: 'absolute', top: '50%', left: '12px', transform: 'translateY(-50%)' }} />
            <input 
              type="email" 
              placeholder="Email của bạn" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-field"
              style={{ width: '100%', paddingLeft: '2.5rem' }}
              disabled={loading}
              autoComplete="new-password"
              name="taskmaster-email"
            />
          </div>
          
          <div style={{ position: 'relative' }}>
            <Lock size={18} color="var(--text-muted)" style={{ position: 'absolute', top: '50%', left: '12px', transform: 'translateY(-50%)' }} />
            <input 
              type="password" 
              placeholder="Mật khẩu (ít nhất 6 ký tự)" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-field"
              style={{ width: '100%', paddingLeft: '2.5rem' }}
              disabled={loading}
              autoComplete="new-password"
              name="taskmaster-password"
            />
          </div>

          <button 
            type="submit" 
            className="btn btn-primary" 
            style={{ width: '100%', justifyContent: 'center', marginTop: '0.5rem', padding: '0.75rem' }}
            disabled={loading}
          >
            {loading ? 'Đang xử lý...' : isLogin ? (
              <><LogIn size={18} /> Đăng nhập</>
            ) : (
              <><UserPlus size={18} /> Đăng ký ngay</>
            )}
          </button>
        </form>

        <div style={{ margin: '1.5rem 0', display: 'flex', alignItems: 'center', gap: '1rem', color: 'var(--text-muted)' }}>
          <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.1)' }}></div>
          <span style={{ fontSize: '0.8rem' }}>HOẶC</span>
          <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.1)' }}></div>
        </div>

        <button 
          type="button"
          onClick={handleGoogleSignIn}
          className="btn btn-ghost" 
          style={{ width: '100%', justifyContent: 'center', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)' }}
          disabled={loading}
        >
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" style={{ width: '18px', height: '18px', marginRight: '8px' }} />
          Tiếp tục với Google
        </button>

        <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
          {isLogin ? 'Chưa có tài khoản? ' : 'Đã có tài khoản? '}
          <button 
            type="button" 
            onClick={() => setIsLogin(!isLogin)}
            style={{ 
              background: 'none', border: 'none', color: 'var(--primary)', 
              fontWeight: 'bold', cursor: 'pointer', padding: 0 
            }}
          >
            {isLogin ? 'Đăng ký' : 'Đăng nhập'}
          </button>
        </div>

        <div style={{ marginTop: '2.5rem', textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)', opacity: 0.7 }}>
          © 2026 Bản quyền thuộc về TKyl
        </div>
      </div>
    </div>
  );
}
