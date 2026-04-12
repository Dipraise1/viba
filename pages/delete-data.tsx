import Head from 'next/head';
import React, { useState } from 'react';
import s from '../styles/DeleteData.module.css';

type State = 'idle' | 'loading' | 'success';

export default function DeleteData() {
  const [email, setEmail] = useState('');
  const [formState, setFormState] = useState<State>('idle');
  const [error, setError] = useState('');

  const isValidEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!isValidEmail(email)) {
      setError('Please enter a valid email address.');
      return;
    }

    setFormState('loading');
    // Simulate async request
    await new Promise((r) => setTimeout(r, 1400));
    setFormState('success');
  };

  return (
    <>
      <Head>
        <title>Delete My Data — Viba</title>
      </Head>

      <div className={s.page}>
        <div className={s.header}>
          <span className={s.label}>Account</span>
          <h1 className={s.title}>Delete My Data</h1>
          <p className={s.subtitle}>
            You have the right to request permanent deletion of your Viba account and all associated data.
          </p>
        </div>

        {formState === 'success' ? (
          <div className={s.successState}>
            <div className={s.successIcon}>
              <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                <path d="M6 14.5L11.5 20L22 9" stroke="#FF2D87" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h2 className={s.successTitle}>Request received.</h2>
            <p className={s.successDesc}>
              We&apos;ve received your deletion request for <strong>{email}</strong>. Your account and all associated data will be permanently deleted within <strong>30 days</strong>.
            </p>
            <p className={s.successDesc}>
              You&apos;ll receive a confirmation email when the deletion is complete. If you have questions, contact <a href="mailto:privacy@viba.app" className={s.emailLink}>privacy@viba.app</a>.
            </p>
          </div>
        ) : (
          <>
            {/* What gets deleted */}
            <div className={s.scopeBlock}>
              <p className={s.scopeTitle}>What gets deleted</p>
              <ul className={s.scopeList}>
                <li>
                  <span className={s.scopeDash}>—</span>
                  <span>Your Viba account and profile</span>
                </li>
                <li>
                  <span className={s.scopeDash}>—</span>
                  <span>All connected platform OAuth tokens (TikTok, Instagram, Facebook, YouTube, Twitch)</span>
                </li>
                <li>
                  <span className={s.scopeDash}>—</span>
                  <span>Your full comment and reply history</span>
                </li>
                <li>
                  <span className={s.scopeDash}>—</span>
                  <span>Gift and earnings history across all platforms</span>
                </li>
                <li>
                  <span className={s.scopeDash}>—</span>
                  <span>Stream session history and analytics</span>
                </li>
                <li>
                  <span className={s.scopeDash}>—</span>
                  <span>Device information and app usage data</span>
                </li>
              </ul>
            </div>

            {/* OAuth revocation note */}
            <div className={s.notice}>
              <div className={s.noticeIcon}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <circle cx="8" cy="8" r="7" stroke="rgba(255,184,0,0.6)" strokeWidth="1.2"/>
                  <path d="M8 5v4M8 11v.5" stroke="rgba(255,184,0,0.8)" strokeWidth="1.4" strokeLinecap="round"/>
                </svg>
              </div>
              <p className={s.noticeText}>
                <strong>Also recommended:</strong> Manually revoke Viba&apos;s access in the connected apps settings of each platform you linked — TikTok, Instagram, Facebook, YouTube, and Twitch. This ensures Viba&apos;s API access is fully removed at the platform level.
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className={s.form} noValidate>
              <div className={s.fieldGroup}>
                <label className={s.fieldLabel} htmlFor="email">
                  Account email address
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className={`${s.input} ${error ? s.inputError : ''}`}
                  autoComplete="email"
                  disabled={formState === 'loading'}
                />
                {error && <p className={s.errorMsg}>{error}</p>}
              </div>

              <button
                type="submit"
                className={s.submitBtn}
                disabled={formState === 'loading' || !email}
              >
                {formState === 'loading' ? (
                  <span className={s.spinner} aria-hidden />
                ) : null}
                {formState === 'loading' ? 'Submitting…' : 'Request Deletion'}
              </button>

              <p className={s.formNote}>
                We&apos;ll send a confirmation to this address. Data deletion is permanent and cannot be undone.
              </p>
            </form>

            <div className={s.contact}>
              <p>
                Questions? Email us at{' '}
                <a href="mailto:privacy@viba.app" className={s.emailLink}>
                  privacy@viba.app
                </a>
              </p>
            </div>
          </>
        )}
      </div>
    </>
  );
}
