import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { usePageStyles, useTitle } from '../hooks.js';
import css from '../styles/create-account.css?inline';

const SIGNUP_ENDPOINT = 'http://localhost:8088/api/auth/register';

function PasswordField({ id, label, value, onChange, autoComplete = 'new-password', toggleId }) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <div className="input-wrap">
        <span className="material-symbols-sharp">lock</span>
        <input
          type={visible ? 'text' : 'password'}
          id={id}
          name={id}
          placeholder="••••••••"
          required
          minLength={6}
          autoComplete={autoComplete}
          value={value}
          onChange={onChange}
        />
        <button
          type="button"
          className="toggle-visibility"
          id={toggleId}
          aria-label={visible ? 'Hide password' : 'Show password'}
          onClick={() => setVisible((v) => !v)}
        >
          <span className="material-symbols-sharp">
            {visible ? 'visibility_off' : 'visibility'}
          </span>
        </button>
      </div>
    </div>
  );
}

export default function CreateAccount() {
  usePageStyles(css);
  useTitle('Create Account · ERP');
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const timer = useRef(null);

  useEffect(() => {
    document.body.classList.remove('dark-themes-variables');
    return () => clearTimeout(timer.current);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const trimmedName = name.trim();
    const trimmedEmail = email.trim();

    if (!trimmedName || !trimmedEmail || !password || !confirmPassword) {
      setError('Please fill in all fields.');
      setSuccess('');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      setSuccess('');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      setSuccess('');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(SIGNUP_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmedName, email: trimmedEmail, password }),
      });

      if (!response.ok) {
        setSuccess('');
        if (response.status === 409) setError('An account with this email already exists.');
        else if (response.status === 400) setError('Please check the information you entered.');
        else setError('Account creation failed. Please try again.');
        setLoading(false);
        return;
      }

      setError('');
      setSuccess('Account created successfully! Redirecting to login...');
      timer.current = setTimeout(() => navigate('/login'), 1500);
    } catch (err) {
      console.error('Signup error:', err);
      setSuccess('');
      setError('Could not reach the server. Is the backend running?');
      setLoading(false);
    }
  };

  return (
    <div className="login-card">
      <div className="logo">
        ERP<span className="danger">CISTIM</span>
      </div>

      <p className="subtitle">Create your ERP account</p>

      <div className={`error-banner${error ? ' show' : ''}`} id="error-banner">
        <span className="material-symbols-sharp">error</span>
        <span id="error-text">{error || 'Something went wrong.'}</span>
      </div>

      <div className={`success-banner${success ? ' show' : ''}`} id="success-banner">
        <span className="material-symbols-sharp">check_circle</span>
        <span id="success-text">{success || 'Account created successfully.'}</span>
      </div>

      <form id="signup-form" onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="name">Full Name</label>
          <div className="input-wrap">
            <span className="material-symbols-sharp">person</span>
            <input
              type="text"
              id="name"
              name="name"
              placeholder="Your full name"
              required
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
        </div>

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
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
        </div>

        <PasswordField
          id="password"
          label="Password"
          toggleId="toggle-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <PasswordField
          id="confirm-password"
          label="Confirm Password"
          toggleId="toggle-confirm-password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />

        <button
          type="submit"
          className={`btn-primary${loading ? ' loading' : ''}`}
          id="signup-btn"
          disabled={loading}
        >
          <span className="spinner"></span>
          <span className="btn-label">Create Account</span>
        </button>
      </form>

      <p className="signup-hint">
        Already have an account? <Link to="/login">Sign in</Link>
      </p>
    </div>
  );
}
