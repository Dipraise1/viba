import Head from 'next/head';
import Image from 'next/image';
import s from '../styles/Home.module.css';

/* ── Inline SVGs for platform logos ─────────────────────────── */
function TikTokIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.18 8.18 0 004.78 1.52V6.76a4.85 4.85 0 01-1.01-.07z"/>
    </svg>
  );
}

function InstaIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
    </svg>
  );
}

function YoutubeIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
    </svg>
  );
}

function FacebookIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
    </svg>
  );
}

function TwitchIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714z"/>
    </svg>
  );
}

/* ── Phone mockup ─────────────────────────────────────────────── */
function PhoneMockup() {
  return (
    <div className={s.phone}>
      <div className={s.phoneFrame}>
        <div className={s.phoneSpeaker} />

        {/* Status bar */}
        <div className={s.phoneStatusBar}>
          <span className={s.phoneTime}>9:41</span>
          <div className={s.phoneSignal}>
            <span /><span /><span />
          </div>
        </div>

        {/* App screen */}
        <div className={s.phoneScreen}>

          {/* Live header */}
          <div className={s.phoneLiveBar}>
            <div className={s.phoneLivePill}>
              <span className={s.phoneLiveDot} />
              LIVE
            </div>
            <span className={s.phoneViewers}>2.4K watching</span>
            <div className={s.phonePlatformRow}>
              <span className={s.phonePlatformDot} style={{background:'#010101'}}><TikTokIcon size={9}/></span>
              <span className={s.phonePlatformDot} style={{background:'#E1306C'}}><InstaIcon size={9}/></span>
              <span className={s.phonePlatformDot} style={{background:'#FF0000'}}><YoutubeIcon size={9}/></span>
            </div>
          </div>

          {/* Comment feed */}
          <div className={s.phoneComments}>
            <div className={s.phoneComment}>
              <span className={s.phoneBadge} style={{background:'#010101'}}><TikTokIcon size={7}/></span>
              <div className={s.phoneCommentBubble}>
                <span className={s.phoneCommentUser}>@nova</span>
                <span className={s.phoneCommentText}>this is fire 🔥🔥</span>
              </div>
            </div>
            <div className={s.phoneComment}>
              <span className={s.phoneBadge} style={{background:'#E1306C'}}><InstaIcon size={7}/></span>
              <div className={s.phoneCommentBubble}>
                <span className={s.phoneCommentUser}>@realbea</span>
                <span className={s.phoneCommentText}>love the energy!!</span>
              </div>
            </div>
            <div className={`${s.phoneComment} ${s.phoneGiftComment}`}>
              <span className={s.phoneBadge} style={{background:'#010101'}}><TikTokIcon size={7}/></span>
              <div className={s.phoneGiftBubble}>
                <span>🌹</span>
                <span className={s.phoneGiftText}>@zara sent <b>Rose ×10</b></span>
              </div>
            </div>
            <div className={s.phoneComment}>
              <span className={s.phoneBadge} style={{background:'#FF0000'}}><YoutubeIcon size={7}/></span>
              <div className={s.phoneCommentBubble}>
                <span className={s.phoneCommentUser}>Marcus</span>
                <span className={s.phoneCommentText}>first time here 👋</span>
              </div>
            </div>
          </div>

          {/* Reply bar */}
          <div className={s.phoneReplyBar}>
            <span className={s.phoneReplyInput}>Reply to @nova…</span>
            <button className={s.phoneReplyBtn} aria-label="send">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M1 6h10M6 1l5 5-5 5" stroke="#FF2D87" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
        </div>

        <div className={s.phoneHomeBar} />
      </div>

      {/* Floating gift pop */}
      <div className={s.floatingGift}>
        <span>⭐</span>
        <span className={s.floatingGiftText}>+50 Stars</span>
      </div>

      {/* Floating follower pop */}
      <div className={s.floatingFollow}>
        <span>+128 followers</span>
      </div>
    </div>
  );
}

/* ── Stat cards ───────────────────────────────────────────────── */
function StatCards() {
  const stats = [
    { value: '5', label: 'Platforms at once', color: '#FF2D87' },
    { value: '0ms', label: 'Extra setup time', color: '#A855F7' },
    { value: '∞', label: 'Comments managed', color: '#7B2FFF' },
  ];
  return (
    <div className={s.statCards}>
      {stats.map((st) => (
        <div key={st.label} className={s.statCard}>
          <span className={s.statValue} style={{ color: st.color }}>{st.value}</span>
          <span className={s.statLabel}>{st.label}</span>
        </div>
      ))}
    </div>
  );
}

/* ── Platform color bar ────────────────────────────────────────── */
function PlatformVisual() {
  const platforms = [
    { Icon: TikTokIcon, bg: '#010101', accent: '#69C9D0', name: 'TikTok' },
    { Icon: InstaIcon,  bg: '#C13584', accent: '#F77737', name: 'Instagram' },
    { Icon: FacebookIcon, bg: '#1877F2', accent: '#166FE5', name: 'Facebook' },
    { Icon: YoutubeIcon, bg: '#FF0000', accent: '#CC0000', name: 'YouTube' },
    { Icon: TwitchIcon,  bg: '#9146FF', accent: '#6B2ECC', name: 'Twitch' },
  ];
  return (
    <div className={s.platformVisual}>
      {platforms.map(({ Icon, bg, accent, name }) => (
        <div key={name} className={s.platformVisualCard} style={{ '--platform-bg': bg, '--platform-accent': accent } as React.CSSProperties}>
          <div className={s.platformVisualIcon}>
            <Icon size={26} />
          </div>
          <span className={s.platformVisualName}>{name}</span>
        </div>
      ))}
    </div>
  );
}

/* ── Main page ─────────────────────────────────────────────────── */
export default function Home() {
  const stripItems = [
    'Social Media Platform',
    'Simultaneous Streaming',
    'Unified Comments',
    'Cross-Platform Gifts',
    'Real-Time Analytics',
    'Viewer Rewards',
    'AI Growth Insights',
    'Seeker Ready',
    'Per-Platform Replies',
    'Gift Dashboard',
    'Earn $VIBA Tokens',
    'Connect & Stream',
  ];

  return (
    <>
      <Head>
        <title>Viba — Social Media Platform & Live Streaming, Everywhere at Once.</title>
      </Head>

      {/* ── HERO ──────────────────────────────────────────────────────── */}
      <section className={s.hero}>
        <div className={s.heroGrid} aria-hidden />
        <div className={s.glowLeft} aria-hidden />
        <div className={s.glowRight} aria-hidden />

        <div className={`${s.heroLogo} animate-up`}>
          <Image src="/logo.png" alt="Viba" width={96} height={96} priority />
        </div>

        <p className={`${s.eyebrow} animate-up`}>
          <span className={s.eyebrowDot} />
          Social media &amp; multi-platform live streaming
        </p>

        <h1 className={s.heroHeadline}>
          <span className={`${s.headLine1} animate-up animate-up-d1`}>Your audience</span>
          <span className={`${s.headLine2} animate-up animate-up-d2`}>is everywhere.</span>
          <span className={`${s.headLine3} animate-up animate-up-d3`}>
            So are <em className={s.youEm}>you.</em>
          </span>
        </h1>

        <p className={`${s.heroBrief} animate-up animate-up-d4`}>
          Viba is the social media platform that connects creators and their communities — and lets you go live on TikTok, Instagram, Facebook, YouTube, and Twitch simultaneously.
          One comment feed. Every gift. Zero tab-switching.
        </p>

        <div className={`${s.heroCta} animate-up animate-up-d5`}>
          <a href="#" className={s.ctaBtn}>
            <svg width="16" height="16" viewBox="0 0 15 18" fill="none" aria-hidden>
              <path d="M12.573 9.538c-.02-2.107 1.715-3.12 1.794-3.172-0.978-1.43-2.496-1.627-3.038-1.648-1.295-.132-2.528.766-3.183.766-.663 0-1.68-.748-2.763-.727-1.415.021-2.722.826-3.45 2.1-1.473 2.558-.377 6.346 1.057 8.42.7 1.016 1.536 2.152 2.635 2.11 1.06-.044 1.46-.682 2.743-.682 1.276 0 1.643.682 2.764.658 1.14-.02 1.86-.999 2.553-2.02.808-1.156 1.14-2.277 1.158-2.337-.025-.011-2.246-.862-2.27-3.468z" fill="white"/>
              <path d="M10.44 3.26C11.008 2.577 11.393 1.639 11.284.68c-.81.034-1.794.54-2.382 1.222-.52.605-.977 1.574-.854 2.502.9.07 1.818-.457 2.393-1.144z" fill="white"/>
            </svg>
            App Store
          </a>
          <a href="#" className={s.ctaBtnSecondary}>
            <svg width="17" height="17" viewBox="0 0 512 512" aria-hidden>
              <path d="M325.3 234.3L104.6 13l280.8 161.2-60.1 60.1z" fill="#EA4335"/>
              <path d="M19.3 0C13.5 2.6 9.3 8.3 9.3 16v480c0 7.7 4.2 13.4 10 16l242-242-242-270z" fill="#4285F4"/>
              <path d="M386.1 338.8L299.8 256l86.3-82.8 108.8 62.6c31 17.9 31 47 0 64.9l-108.8 38.1z" fill="#FBBC04"/>
              <path d="M104.6 499l220.7-220.7 60.1 60.1L104.6 499z" fill="#34A853"/>
            </svg>
            Google Play
          </a>
        </div>

        <div className={s.heroDivider} aria-hidden />
      </section>

      {/* ── MARQUEE STRIP ─────────────────────────────────────────────── */}
      <section className={s.stripWrap} aria-label="Features">
        <div className={s.stripTrack}>
          {/* Duplicated twice for seamless loop */}
          {[...stripItems, ...stripItems, ...stripItems, ...stripItems].map((f, i) => (
            <span key={i} className={s.stripItem}>
              <span className={s.stripDot} aria-hidden>·</span>
              {f}
            </span>
          ))}
        </div>
      </section>

      {/* ── STATS ──────────────────────────────────────────────────────── */}
      <section className={s.statsSection}>
        <StatCards />
      </section>

      {/* ── HOW IT WORKS ───────────────────────────────────────────────── */}
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
            <div className={s.stepIconCluster}>
              <span style={{background:'#010101'}}><TikTokIcon size={14}/></span>
              <span style={{background:'#C13584'}}><InstaIcon size={14}/></span>
              <span style={{background:'#1877F2'}}><FacebookIcon size={14}/></span>
              <span style={{background:'#FF0000'}}><YoutubeIcon size={14}/></span>
              <span style={{background:'#9146FF'}}><TwitchIcon size={14}/></span>
            </div>
          </div>

          <div className={s.stepDivider} aria-hidden />

          <div className={s.step}>
            <span className={s.stepNum}>02</span>
            <div className={s.stepBody}>
              <h3 className={s.stepTitle}>Hit go live</h3>
              <p className={s.stepDesc}>
                One tap starts your stream on every platform simultaneously. Your feed distributes in real time — no latency stacking, no extra uploads.
              </p>
            </div>
            <div className={s.stepLiveBadge}>
              <span className={s.stepLiveDot} />
              LIVE
            </div>
          </div>

          <div className={s.stepDivider} aria-hidden />

          <div className={s.step}>
            <span className={s.stepNum}>03</span>
            <div className={s.stepBody}>
              <h3 className={s.stepTitle}>Reply, react, earn</h3>
              <p className={s.stepDesc}>
                Every comment flows into one feed — each tagged with its platform. Reply directly. See every rose, star, and bit as they land.
              </p>
            </div>
            <div className={s.stepGifts}>
              <span>🌹</span><span>⭐</span><span>💎</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── VIBA TOKEN ─────────────────────────────────────────────────── */}
      <section className={s.token}>
        <div className={s.tokenGlow} aria-hidden />
        <div className={s.tokenLeft}>
          <p className={s.sectionLabel}>Viba Token</p>
          <h2 className={s.tokenHeadline}>
            Stream more.<br />Earn more.
          </h2>
          <p className={s.tokenDesc}>
            Every minute you go live earns you <strong>$VIBA tokens</strong> — automatically distributed based on your stream time, viewer count, and engagement across all platforms. No wallets to set up. No hoops to jump through.
          </p>
          <ul className={s.tokenList}>
            <li>
              <span className={s.tokenListDot} style={{ background: '#FF2D87' }} />
              <span><strong>Stream time</strong> — earn tokens for every minute live</span>
            </li>
            <li>
              <span className={s.tokenListDot} style={{ background: '#A855F7' }} />
              <span><strong>Viewer reach</strong> — more platforms, more viewers, more $VIBA</span>
            </li>
            <li>
              <span className={s.tokenListDot} style={{ background: '#7B2FFF' }} />
              <span><strong>Engagement</strong> — replies, gifts received, and follower growth all count</span>
            </li>
          </ul>
        </div>
        <div className={s.tokenRight}>
          <div className={s.tokenCard}>
            <div className={s.tokenCardHeader}>
              <div className={s.tokenSymbol}>V</div>
              <span className={s.tokenCardLabel}>Estimated earnings</span>
            </div>
            <div className={s.tokenAmount}>
              <span className={s.tokenAmountValue}>1,240</span>
              <span className={s.tokenAmountUnit}>$VIBA</span>
            </div>
            <p className={s.tokenCardSub}>from a 1hr stream · 2.4K viewers · 5 platforms</p>
            <div className={s.tokenBreakdown}>
              <div className={s.tokenBreakdownRow}>
                <span>Stream time</span>
                <span className={s.tokenBreakdownVal}>+400</span>
              </div>
              <div className={s.tokenBreakdownRow}>
                <span>Viewer reach</span>
                <span className={s.tokenBreakdownVal}>+560</span>
              </div>
              <div className={s.tokenBreakdownRow}>
                <span>Gifts &amp; engagement</span>
                <span className={s.tokenBreakdownVal}>+280</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── PLATFORMS ──────────────────────────────────────────────────── */}
      <section className={s.platforms}>
        <p className={s.platformsEyebrow}>Connect. Share. Stream everywhere.</p>
        <PlatformVisual />
        <p className={s.platformsSub}>
          More platforms coming. Your audience is there — Viba will be too.
        </p>
      </section>

      {/* ── VIEWER REWARDS ─────────────────────────────────────────────── */}
      <section className={s.rewards}>
        <div className={s.rewardsLeft}>
          <p className={s.sectionLabel}>Viewer Rewards</p>
          <h2 className={s.rewardsHeadline}>
            Your audience earns.<br />
            <span className={s.rewardsHeadlineAccent}>You control how.</span>
          </h2>
          <p className={s.rewardsDesc}>
            Share a portion of your $VIBA earnings directly with the viewers who show up for you. Set your own rules — reward watch time, loyalty, comments, or sharing. Your community, your economy.
          </p>
          <div className={s.rewardRules}>
            {[
              { icon: '⏱', title: 'Watch Time', desc: 'Base $VIBA per minute watched', value: '1x base', color: '#A855F7' },
              { icon: '💬', title: 'Comments', desc: 'Bonus for engaging in chat', value: '2x boost', color: '#FF2D87' },
              { icon: '🔁', title: 'Loyalty Bonus', desc: 'Extra for viewers who return', value: '1.5x boost', color: '#FFB800' },
              { icon: '⭐', title: 'Welcome Bonus', desc: 'Attract new viewers with a reward', value: '+20 $V', color: '#7B2FFF' },
            ].map((r) => (
              <div key={r.title} className={s.rewardRule}>
                <div className={s.rewardRuleIcon} style={{ background: r.color + '22' }}>{r.icon}</div>
                <div className={s.rewardRuleText}>
                  <div className={s.rewardRuleTitle}>{r.title}</div>
                  <div className={s.rewardRuleDesc}>{r.desc}</div>
                </div>
                <span className={s.rewardRuleValue} style={{ color: r.color }}>{r.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className={s.rewardsRight}>
          <div className={s.rewardMockCard}>
            <div className={s.rewardMockHeader}>
              <span className={s.rewardMockTitle}>Viewer Rewards</span>
              <span className={s.rewardMockToggle}>ON</span>
            </div>
            <div className={s.rewardPoolRow}>
              <span className={s.rewardPoolLabel}>Pool size — 20% of stream earnings</span>
              <span className={s.rewardPoolPct}>20%</span>
            </div>
            <div className={s.rewardLeaders}>
              {[
                { rank: '🏆', name: '@nova_waves', platform: '#010101', earned: '+124 $V' },
                { rank: '🥈', name: '@realbea', platform: '#E1306C', earned: '+98 $V' },
                { rank: '🥉', name: '@streamlord', platform: '#9146FF', earned: '+86 $V' },
                { rank: '#4', name: '@techvibes99', platform: '#FF0000', earned: '+64 $V' },
                { rank: '#5', name: '@zara.live', platform: '#010101', earned: '+52 $V' },
              ].map((v) => (
                <div key={v.name} className={s.rewardLeaderRow}>
                  <span className={s.rewardLeaderRank}>{v.rank}</span>
                  <span className={s.rewardLeaderDot} style={{ background: v.platform }} />
                  <span className={s.rewardLeaderName}>{v.name}</span>
                  <span className={s.rewardLeaderEarned}>{v.earned}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── AI INSIGHTS ────────────────────────────────────────────────── */}
      <section className={s.insights}>
        <div className={s.insightsHeader}>
          <p className={s.insightsEyebrow}>
            <span>✦</span> Viba AI
          </p>
          <h2 className={s.insightsHeadline}>
            Your data. Smarter growth.
          </h2>
          <p className={s.insightsDesc}>
            Viba sees what no single platform can — your full audience across every stream. Our AI turns that into clear, actionable suggestions so you know exactly what to do next.
          </p>
        </div>

        <div className={s.insightCards}>
          {[
            { icon: '📺', title: 'YouTube loves long-form', body: 'Your YouTube audience watches 24 min on average — 3x longer than TikTok. They want depth.', impact: '+40% retention' },
            { icon: '🕖', title: 'Stream 2 hours earlier', body: 'Your combined peak audience is active at 6:30 PM. You\'re currently going live at 9 PM.', impact: '+28% reach' },
            { icon: '💜', title: 'Twitch drives loyalty', body: 'Twitch is 18% of your viewers but 62% of your returning audience. It\'s your real community.', impact: 'Stronger core' },
            { icon: '⚡', title: 'Rewards double retention', body: 'Streams with Viewer Rewards active have 2x returning viewer rate vs streams without.', impact: '2x return viewers' },
            { icon: '📸', title: 'Instagram clips spread', body: 'Clips from Instagram Live get 3x more shares than TikTok clips. Lean into visual moments.', impact: '+15% followers' },
            { icon: '🎯', title: 'Know your audience', body: 'Audience demographics, top countries, and gender splits — per platform, not averaged out.', impact: 'Better content' },
          ].map((card) => (
            <div key={card.title} className={s.insightCard}>
              <div className={s.insightCardIcon}>{card.icon}</div>
              <div className={s.insightCardTitle}>{card.title}</div>
              <div className={s.insightCardBody}>{card.body}</div>
              <div className={s.insightCardImpact}>↑ {card.impact}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── SEEKER READY ───────────────────────────────────────────────── */}
      <section className={s.seeker}>
        <div className={s.seekerGlow} aria-hidden />
        <div className={s.seekerBadge}>
          <span className={s.seekerBadgeDot} />
          <span className={s.seekerBadgeText}>Solana Seeker Ready</span>
        </div>
        <h2 className={s.seekerHeadline}>
          Built for the<br />
          <span className={s.seekerHeadlineAccent}>Web3 mobile era.</span>
        </h2>
        <p className={s.seekerDesc}>
          Viba is optimized for Solana Seeker — the dedicated Web3 phone with hardware wallet security. Stream, earn, and reward your community with the power of Solana built in.
        </p>
        <div className={s.seekerFeatures}>
          {[
            { icon: '🔐', title: 'Seed Vault Security', desc: 'Token transactions signed in hardware — your $VIBA never exposed to apps' },
            { icon: '⚡', title: 'Real-Time Payments', desc: 'Instant SOL-speed token distribution to viewers mid-stream' },
            { icon: '📍', title: 'Location-Verified Live', desc: 'GPS-attested streams prove your content is real and live' },
            { icon: '🤖', title: 'AI on Device', desc: 'Growth insights run locally — your analytics stay private' },
          ].map((f) => (
            <div key={f.title} className={s.seekerFeature}>
              <div className={s.seekerFeatureIcon}>{f.icon}</div>
              <div>
                <div className={s.seekerFeatureTitle}>{f.title}</div>
                <div className={s.seekerFeatureDesc}>{f.desc}</div>
              </div>
            </div>
          ))}
        </div>
        <div className={s.seekerSolanaRow}>
          <span className={s.seekerSolanaText}>Powered by</span>
          <svg width="80" height="14" viewBox="0 0 646 96" fill="none" aria-label="Solana">
            <path d="M108.53 75.69L90.86 94.05c-.5.52-1.19.82-1.91.82H3.96C2.4 94.87.9 93.5.9 91.94c0-.74.28-1.44.78-1.96L19.35 71.6c.5-.52 1.19-.82 1.91-.82h84.99c1.56 0 2.84 1.36 2.84 2.91 0 .73-.28 1.44-.56 2zm0-55.38L90.86 2c-.5-.52-1.19-.82-1.91-.82H3.96C2.4 1.18.9 2.54.9 4.1c0 .74.28 1.44.78 1.96l17.67 18.38c.5.52 1.19.82 1.91.82h84.99c1.56 0 2.84-1.36 2.84-2.91 0-.73-.28-1.44-.56-2zM3.96 47.6h84.99c.72 0 1.41.3 1.91.82l17.67 18.38c.28.52.56 1.22.56 1.95 0 1.56-1.28 2.91-2.84 2.91H21.26c-.72 0-1.41-.3-1.91-.82L1.68 52.46C1.18 51.94.9 51.24.9 50.5c0-1.56 1.28-2.91 2.84-2.91h.22z" fill="#14F195"/>
            <text x="130" y="76" fontFamily="Arial" fontSize="72" fontWeight="700" fill="white">Solana</text>
          </svg>
        </div>
      </section>

      {/* ── BOTTOM CTA ─────────────────────────────────────────────────── */}
      <section className={s.bottomCta}>
        <div className={s.bottomGlow} aria-hidden />
        <p className={s.bottomLabel}>Available now</p>
        <h2 className={s.bottomHeadline}>
          One social platform.<br />Every stream.<br />
          <span className={s.bottomHeadlineAccent}>Earn every minute.</span>
        </h2>
        <div className={s.bottomActions}>
          <a href="#" className={s.ctaBtnLarge}>
            <svg width="18" height="22" viewBox="0 0 15 18" fill="none" aria-hidden>
              <path d="M12.573 9.538c-.02-2.107 1.715-3.12 1.794-3.172-0.978-1.43-2.496-1.627-3.038-1.648-1.295-.132-2.528.766-3.183.766-.663 0-1.68-.748-2.763-.727-1.415.021-2.722.826-3.45 2.1-1.473 2.558-.377 6.346 1.057 8.42.7 1.016 1.536 2.152 2.635 2.11 1.06-.044 1.46-.682 2.743-.682 1.276 0 1.643.682 2.764.658 1.14-.02 1.86-.999 2.553-2.02.808-1.156 1.14-2.277 1.158-2.337-.025-.011-2.246-.862-2.27-3.468z" fill="white"/>
              <path d="M10.44 3.26C11.008 2.577 11.393 1.639 11.284.68c-.81.034-1.794.54-2.382 1.222-.52.605-.977 1.574-.854 2.502.9.07 1.818-.457 2.393-1.144z" fill="white"/>
            </svg>
            <span>
              <span className={s.ctaBtnSub}>Download on the</span>
              App Store
            </span>
          </a>
          <a href="#" className={s.ctaBtnLargeOutline}>
            <svg width="20" height="20" viewBox="0 0 512 512" aria-hidden>
              <path d="M325.3 234.3L104.6 13l280.8 161.2-60.1 60.1z" fill="#EA4335"/>
              <path d="M19.3 0C13.5 2.6 9.3 8.3 9.3 16v480c0 7.7 4.2 13.4 10 16l242-242-242-270z" fill="#4285F4"/>
              <path d="M386.1 338.8L299.8 256l86.3-82.8 108.8 62.6c31 17.9 31 47 0 64.9l-108.8 38.1z" fill="#FBBC04"/>
              <path d="M104.6 499l220.7-220.7 60.1 60.1L104.6 499z" fill="#34A853"/>
            </svg>
            <span>
              <span className={s.ctaBtnSub}>Get it on</span>
              Google Play
            </span>
          </a>
        </div>
      </section>
    </>
  );
}
