import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import s from '../styles/Nav.module.css';

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
        <a href="#" className={s.storePill}>
          App Store
        </a>
        <a href="#" className={s.storePill}>
          Google Play
        </a>
      </div>
    </nav>
  );
}
