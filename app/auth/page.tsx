'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { authenticate } from '../../lib/auth';

export default function AuthPage() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Simulate brief delay for UX
    await new Promise(resolve => setTimeout(resolve, 300));

    if (authenticate(password)) {
      router.push('/');
    } else {
      setError('Invalid password. Please try again.');
      setPassword('');
    }
    setLoading(false);
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h1>Access Your Workout</h1>
          <p>Enter your password to continue</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="input-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              autoFocus
              disabled={loading}
            />
          </div>

          {error && <p className="auth-error">{error}</p>}

          <button type="submit" className="auth-submit" disabled={loading || !password}>
            {loading ? 'Verifying...' : 'Access Workout'}
          </button>
        </form>

        <p className="auth-hint">Contact your coach for password</p>
      </div>

      <style jsx>{`
        .auth-container {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          background: var(--bg);
        }

        .auth-card {
          width: 100%;
          max-width: 400px;
          background: var(--card-bg);
          border-radius: 20px;
          padding: 32px;
          border: 1px solid var(--border);
          box-shadow: var(--shadow-lg);
        }

        .auth-header {
          text-align: center;
          margin-bottom: 32px;
        }

        .auth-header h1 {
          font-size: 24px;
          font-weight: 700;
          color: var(--text);
          margin-bottom: 8px;
        }

        .auth-header p {
          font-size: 14px;
          color: var(--text-muted);
        }

        .auth-form {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .input-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .input-group label {
          font-size: 13px;
          font-weight: 600;
          color: var(--text-muted);
          text-transform: uppercase;
        }

        .input-group input {
          padding: 14px 16px;
          border: 2px solid var(--border);
          border-radius: 12px;
          font-size: 16px;
          background: var(--input-bg);
          color: var(--text);
          transition: border-color 0.2s;
        }

        .input-group input:focus {
          outline: none;
          border-color: var(--primary);
        }

        .input-group input::placeholder {
          color: var(--text-muted);
          opacity: 0.6;
        }

        .auth-error {
          color: #ef4444;
          font-size: 14px;
          text-align: center;
          margin: 0;
        }

        .auth-submit {
          padding: 16px;
          background: var(--primary);
          color: white;
          border: none;
          border-radius: 12px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.2s;
        }

        .auth-submit:hover:not(:disabled) {
          background: var(--primary-dark);
        }

        .auth-submit:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .auth-hint {
          text-align: center;
          font-size: 13px;
          color: var(--text-muted);
          margin-top: 24px;
        }

        .auth-checking {
          text-align: center;
          padding: 60px;
          color: var(--text-muted);
        }
      `}</style>
    </div>
  );
}
