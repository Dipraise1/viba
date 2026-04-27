import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import s from '../styles/Nav.module.css';

function AppleIcon() {
  return (
    <svg width="15" height="18" viewBox="0 0 15 18" fill="none" aria-hidden>
      <path
        d="M12.573 9.538c-.02-2.107 1.715-3.12 1.794-3.172-0.978-1.43-2.496-1.627-3.038-1.648-1.295-.132-2.528.766-3.183.766-.663 0-1.68-.748-2.763-.727-1.415.021-2.722.826-3.45 2.1-1.473 2.558-.377 6.346 1.057 8.42.7 1.016 1.536 2.152 2.635 2.11 1.06-.044 1.46-.682 2.743-.682 1.276 0 1.643.682 2.764.658 1.14-.02 1.86-.999 2.553-2.02.808-1.156 1.14-2.277 1.158-2.337-.025-.011-2.246-.862-2.27-3.468z"
        fill="currentColor"
      />
      <path
        d="M10.44 3.26C11.008 2.577 11.393 1.639 11.284.68c-.81.034-1.794.54-2.382 1.222-.52.605-.977 1.574-.854 2.502.9.07 1.818-.457 2.393-1.144z"
        fill="currentColor"
      />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg width="15" height="17" viewBox="0 0 15 17" fill="none" aria-hidden>
      <path d="M0.5 1.5C0.5 0.699 1.368 0.218 2.05 0.634L14.05 7.634C14.716 8.04 14.716 8.96 14.05 9.366L2.05 16.366C1.368 16.782 0.5 16.301 0.5 15.5V1.5Z"
        fill="currentColor"
      />
    </svg>
  );
}

export default function Nav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <nav className={`${s.nav} ${scrolled ? s.navScrolled : ''}`}>
      <Link href="/" className={s.logo}>viba</Link>
      <div className={s.actions}>
        <a href="#" className={`${s.storePill} ${s.applePill}`}>
          <AppleIcon />
          <span className={s.pillText}>
            <span className={s.pillSub}>Download on the</span>
            <span className={s.pillMain}>App Store</span>
          </span>
        </a>
        <a href="#" className={`${s.storePill} ${s.googlePill}`}>
          <svg width="18" height="18" viewBox="0 0 512 512" aria-hidden>
            <path d="M325.3 234.3L104.6 13l280.8 161.2-60.1 60.1z" fill="#EA4335"/>
            <path d="M19.3 0C13.5 2.6 9.3 8.3 9.3 16v480c0 7.7 4.2 13.4 10 16l242-242-242-270z" fill="#4285F4"/>
            <path d="M386.1 338.8L299.8 256l86.3-82.8 108.8 62.6c31 17.9 31 47 0 64.9l-108.8 38.1z" fill="#FBBC04"/>
            <path d="M104.6 499l220.7-220.7 60.1 60.1L104.6 499z" fill="#34A853"/>
          </svg>
          <span className={s.pillText}>
            <span className={s.pillSub}>Get it on</span>
            <span className={s.pillMain}>Google Play</span>
          </span>
        </a>
      </div>
    </nav>
  );
}
