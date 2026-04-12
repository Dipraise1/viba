import Head from 'next/head';
import s from '../styles/Home.module.css';

export default function Home() {
  return (
    <>
      <Head>
        <title>Viba — Go Live Everywhere. At Once.</title>
      </Head>

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section className={s.hero}>
        {/* Grid background */}
        <div className={s.heroGrid} aria-hidden />

        {/* Glow orbs */}
        <div className={s.glowLeft} aria-hidden />
        <div className={s.glowRight} aria-hidden />

        {/* Eyebrow */}
        <p className={`${s.eyebrow} animate-up`}>
          <span className={s.eyebrowDot} />
          Multi-platform live streaming
        </p>

        {/* Headline — left-aligned, bleeds right */}
        <h1 className={s.heroHeadline}>
          <span className={`${s.headLine1} animate-up animate-up-d1`}>Your audience</span>
          <span className={`${s.headLine2} animate-up animate-up-d2`}>is everywhere.</span>
          <span className={`${s.headLine3} animate-up animate-up-d3`}>
            So are <em className={s.youEm}>you.</em>
          </span>
        </h1>

        <p className={`${s.heroBrief} animate-up animate-up-d4`}>
          Go live on TikTok, Instagram, Facebook, YouTube, and Twitch — simultaneously.<br />
          One comment feed. Every gift. Zero tab-switching.
        </p>

        <div className={`${s.heroCta} animate-up animate-up-d5`}>
          <a href="#" className={s.ctaBtn}>Download the App</a>
          <span className={s.ctaNote}>iOS & Android · Free</span>
        </div>

        {/* Divider line */}
        <div className={s.heroDivider} aria-hidden />
      </section>

      {/* ── FEATURES STRIP ───────────────────────────────────────────────── */}
      <section className={s.stripWrap} aria-label="Features">
        <div className={s.stripTrack}>
          {[
            'Simultaneous Streaming',
            'Unified Comments',
            'Cross-Platform Gifts',
            'Real-Time Analytics',
            'Per-Platform Replies',
            'Gift Dashboard',
            'Simultaneous Streaming',
            'Unified Comments',
            'Cross-Platform Gifts',
            'Real-Time Analytics',
            'Per-Platform Replies',
            'Gift Dashboard',
          ].map((f, i) => (
            <span key={i} className={s.stripItem}>
              {f}
              <span className={s.stripDot} aria-hidden>·</span>
            </span>
          ))}
        </div>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────────────────────────── */}
      <section className={s.how}>
        <div className={s.howHeader}>
          <p className={s.sectionLabel}>How it works</p>
          <div className={s.sectionRule} />
        </div>

        <div className={s.steps}>
          <div className={s.step}>
            <span className={s.stepNum}>01</span>
            <div className={s.stepBody}>
              <h3 className={s.stepTitle}>Connect your accounts</h3>
              <p className={s.stepDesc}>
                Link TikTok, Instagram, Facebook, YouTube, and Twitch once. Viba handles OAuth — no stream keys, no copy-pasting.
              </p>
            </div>
          </div>

          <div className={s.stepDivider} aria-hidden />

          <div className={s.step}>
            <span className={s.stepNum}>02</span>
            <div className={s.stepBody}>
              <h3 className={s.stepTitle}>Hit go live</h3>
              <p className={s.stepDesc}>
                One tap starts your stream on every platform at the same time. Your camera feed distributes in real time — no latency stacking.
              </p>
            </div>
          </div>

          <div className={s.stepDivider} aria-hidden />

          <div className={s.step}>
            <span className={s.stepNum}>03</span>
            <div className={s.stepBody}>
              <h3 className={s.stepTitle}>Reply, react, earn</h3>
              <p className={s.stepDesc}>
                Every comment from every platform flows into one feed — each tagged with its source. Reply directly. See every rose, star, and bit as they land.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── PLATFORMS ────────────────────────────────────────────────────── */}
      <section className={s.platforms}>
        <p className={s.platformsEyebrow}>Stream everywhere.</p>
        <div className={s.platformNames}>
          <span>TikTok</span>
          <span className={s.platformSep}>·</span>
          <span>Instagram</span>
          <span className={s.platformSep}>·</span>
          <span>Facebook</span>
          <span className={s.platformSep}>·</span>
          <span>YouTube</span>
          <span className={s.platformSep}>·</span>
          <span>Twitch</span>
        </div>
        <p className={s.platformsSub}>
          More platforms coming. Your audience is there — Viba will be too.
        </p>
      </section>

      {/* ── BOTTOM CTA ───────────────────────────────────────────────────── */}
      <section className={s.bottomCta}>
        <div className={s.bottomGlow} aria-hidden />
        <p className={s.bottomLabel}>Available now</p>
        <h2 className={s.bottomHeadline}>
          One stream.<br />Every platform.
        </h2>
        <div className={s.bottomActions}>
          <a href="#" className={s.ctaBtn}>App Store</a>
          <a href="#" className={s.ctaBtnOutline}>Google Play</a>
        </div>
      </section>
    </>
  );
}
