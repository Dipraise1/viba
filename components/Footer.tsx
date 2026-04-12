import React from 'react';
import Link from 'next/link';
import s from '../styles/Footer.module.css';

export default function Footer() {
  return (
    <footer className={s.footer}>
      <div className={s.inner}>
        <span className={s.logo}>viba</span>
        <div className={s.links}>
          <Link href="/privacy" className={s.link}>Privacy Policy</Link>
          <Link href="/terms" className={s.link}>Terms of Service</Link>
          <Link href="/delete-data" className={s.link}>Delete My Data</Link>
        </div>
        <span className={s.copy}>© 2025 Viba</span>
      </div>
    </footer>
  );
}
