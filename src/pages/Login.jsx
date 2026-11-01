import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { usePageStyles, useTitle } from '../hooks.js';
import css from '../styles/login.css?inline';
import { API_BASE_URL } from '../api.js';


const LOGIN_ENDPOINT = `${API_BASE_URL}/auth/login`;

export default function Login() {
  usePageStyles(css);
  useTitle('Sign In · ERP');
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // The sign-in page is always light.
  useEffect(() => {
    document.body.classList.remove('dark-themes-variables');
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    const trimmedEmail = email.trim();

    if (!trimmedEmail || !password) {
      setError('Enter your email and password.');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(LOGIN_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmedEmail, password }),
      });

      if (!response.ok) {
        if (response.status === 401) setError('Incorrect email or password.');
        else if (response.status === 404) setError('Login endpoint was not found.');
        else setError('Sign-in failed. Please try again.');
        setLoading(false);
        return;
      }

      const data = await response.json();
      console.log('Login successful:', data);

      const storage = remember ? localStorage : sessionStorage;

      if (data.token) {
        // "token" is the key the API helper reads; "erp_token" is kept because
        // the original login script used that name.
        storage.setItem('token', data.token);
        storage.setItem('erp_token', data.token);
      }
      if (data.userId) storage.setItem('erp_user_id', data.userId);
      if (data.name) storage.setItem('erp_user_name', data.name);
      if (data.email) storage.setItem('erp_user_email', data.email);

     navigate(data.role === 'ADMIN' ? '/dashboard' : '/products');
    } catch (err) {
      console.error('Login error:', err);
      setError('Could not reach the server. Is Spring Boot running?');
      setLoading(false);
    }
  };

  return (
    <main className="login-card">
      <div className="logo">
        ElectroTrack<span className="danger">ERP</span>
      </div>

      <p className="subtitle">Sign in to your account</p>

      <div className={`error-banner${error ? ' show' : ''}`} id="error-banner">
        <span className="material-symbols-sharp">error</span>
        <span id="error-text">{error || 'Something went wrong.'}</span>
      </div>

      <form id="login-form" onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="email">Email</label>
          <div className="input-wrap">
            <span className="material-symbols-sharp">mail</span>
            <input
              type="email"
              id="email"
              name="email"
              placeholder="you@company.com"
              required
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
        </div>

        <div className="field">
          <label htmlFor="password">Password</label>
          <div className="input-wrap">
            <span className="material-symbols-sharp">lock</span>
            <input
              type={showPassword ? 'text' : 'password'}
              id="password"
              name="password"
              placeholder="••••••••"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="button"
              className="toggle-visibility"
              id="toggle-visibility"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              onClick={() => setShowPassword((s) => !s)}
            >
              <span className="material-symbols-sharp" id="toggle-icon">
                {showPassword ? 'visibility_off' : 'visibility'}
              </span>
            </button>
          </div>
        </div>

        <div className="row-between">
          <label className="remember">
            <input
              type="checkbox"
              id="remember"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
            />
            <span>Remember me</span>
          </label>

          <a href="#" className="forgot" onClick={(e) => e.preventDefault()}>
            Forgot password?
          </a>
        </div>

        <button
          type="submit"
          className={`btn-primary${loading ? ' loading' : ''}`}
          id="submit-btn"
          disabled={loading}
        >
          <span className="spinner"></span>
          <span className="btn-label">Sign In</span>
        </button>
      </form>

      <p className="signup-hint">
        Don't have an account? <Link to="/create-account">Create Account</Link>
      </p>
    </main>
  );
}
