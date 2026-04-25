import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import s from '../styles/Footer.module.css';

export default function Footer() {
  return (
    <footer className={s.footer}>
      <div className={s.inner}>
        <Image src="/logo.png" alt="Viba" width={40} height={40} className={s.logo} />
        <div className={s.links}>
          <Link href="/privacy" className={s.link}>Privacy Policy</Link>
          <Link href="/terms" className={s.link}>Terms of Service</Link>
          <Link href="/delete-data" className={s.link}>Delete My Data</Link>
        </div>
        <span className={s.copy}>© 2026 Viba</span>
      </div>
    </footer>
  );
}
