import Head from 'next/head';
import s from '../styles/Legal.module.css';

export default function Privacy() {
  return (
    <>
      <Head>
        <title>Privacy Policy — Viba</title>
      </Head>

      <div className={s.page}>
        <header className={s.header}>
          <span className={s.label}>Legal</span>
          <h1 className={s.title}>Privacy Policy</h1>
          <p className={s.meta}>Effective January 1, 2025 · Last updated January 1, 2025</p>
        </header>

        <div className={s.content}>

          <div className={s.section}>
            <h2 className={s.sectionTitle}><span>01</span>Overview</h2>
            <div className={s.body}>
              <p>
                Viba (&ldquo;we&rdquo;, &ldquo;our&rdquo;, or &ldquo;us&rdquo;) operates the Viba mobile application and website (collectively, the &ldquo;Service&rdquo;). This Privacy Policy explains what information we collect, how we use it, and your rights regarding that information.
              </p>
              <p>
                By using Viba, you agree to the collection and use of information in accordance with this policy. If you do not agree, please discontinue use of the Service.
              </p>
            </div>
          </div>

          <div className={s.section}>
            <h2 className={s.sectionTitle}><span>02</span>Information We Collect</h2>
            <div className={s.body}>
              <p><strong>Account Information</strong></p>
              <p>When you create a Viba account, we collect your email address, display name, and profile photo (if provided).</p>

              <p><strong>Platform OAuth Tokens</strong></p>
              <p>When you connect a third-party platform (TikTok, Instagram, Facebook, YouTube, Twitch), we receive and securely store OAuth access tokens granted by those platforms. These tokens allow Viba to initiate live streams and read comment data on your behalf. We do not store your passwords for any third-party platform.</p>

              <p><strong>Streaming & Activity Data</strong></p>
              <ul>
                <li>Stream sessions (start time, duration, platforms streamed to)</li>
                <li>Viewer counts and engagement metrics provided by each platform</li>
                <li>Comments read from connected platforms during live sessions</li>
                <li>Gift and monetization events (roses, stars, bits) received during streams</li>
                <li>Replies sent through Viba to each platform</li>
              </ul>

              <p><strong>Device & Technical Information</strong></p>
              <ul>
                <li>Device type, operating system, and OS version</li>
                <li>App version</li>
                <li>IP address (used for fraud prevention and not stored long-term)</li>
                <li>Crash reports and diagnostic logs</li>
              </ul>

              <p><strong>Analytics</strong></p>
              <p>We collect anonymized usage analytics to understand how features are used and improve the product. This includes screen views, feature interaction events, and session duration. We do not sell this data.</p>
            </div>
          </div>

          <div className={s.section}>
            <h2 className={s.sectionTitle}><span>03</span>How We Use Your Information</h2>
            <div className={s.body}>
              <ul>
                <li>To provide and operate the Service — initiating simultaneous live streams, aggregating comment feeds, displaying gift notifications</li>
                <li>To authenticate your identity and maintain your account</li>
                <li>To communicate with you about your account, security, or significant service updates</li>
                <li>To improve, debug, and develop new features based on aggregated usage patterns</li>
                <li>To detect and prevent fraud, abuse, or violations of our Terms of Service</li>
                <li>To comply with applicable law and legal process</li>
              </ul>
              <p>We do not use your data for advertising, nor do we sell it to third parties.</p>
            </div>
          </div>

          <div className={s.section}>
            <h2 className={s.sectionTitle}><span>04</span>Third-Party Platforms</h2>
            <div className={s.body}>
              <p>Viba integrates with the following platforms via their official APIs. When you connect a platform, data flows are governed by both this policy and each platform&apos;s own privacy policy:</p>
              <ul>
                <li><strong>TikTok</strong> — governed by TikTok&apos;s Privacy Policy. We access live stream management and comment read scopes only.</li>
                <li><strong>Meta (Instagram & Facebook)</strong> — governed by Meta&apos;s Privacy Policy. We access live video creation and comment read permissions only.</li>
                <li><strong>Google (YouTube)</strong> — governed by Google&apos;s Privacy Policy. We use YouTube Data API v3 with live streaming and chat scopes.</li>
                <li><strong>Twitch</strong> — governed by Twitch&apos;s Privacy Policy. We access stream management and chat read/write scopes.</li>
              </ul>
              <p>You can revoke Viba&apos;s access to any platform at any time through that platform&apos;s app settings, or through Viba&apos;s connected accounts settings.</p>
            </div>
          </div>

          <div className={s.section}>
            <h2 className={s.sectionTitle}><span>05</span>Data Retention</h2>
            <div className={s.body}>
              <p>We retain your account and activity data for as long as your account is active. Streaming session data and comment history are retained for up to 12 months after each session.</p>
              <p>Analytics data is aggregated and anonymized after 90 days.</p>
              <p>When you delete your account or submit a data deletion request, we permanently delete your personal data within 30 days, except where retention is required by applicable law.</p>
            </div>
          </div>

          <div className={s.section}>
            <h2 className={s.sectionTitle}><span>06</span>Your Rights</h2>
            <div className={s.body}>
              <p>Depending on your location, you may have the following rights regarding your personal data:</p>
              <ul>
                <li><strong>Access</strong> — Request a copy of the personal data we hold about you</li>
                <li><strong>Correction</strong> — Request correction of inaccurate data</li>
                <li><strong>Deletion</strong> — Request deletion of your personal data and account</li>
                <li><strong>Portability</strong> — Request your data in a structured, machine-readable format</li>
                <li><strong>Restriction</strong> — Request that we limit how we use your data in certain circumstances</li>
                <li><strong>Objection</strong> — Object to processing based on legitimate interests</li>
              </ul>
              <p>To exercise any of these rights, contact us at <a href="mailto:privacy@viba.app">privacy@viba.app</a> or use our <a href="/delete-data">data deletion request page</a>.</p>
            </div>
          </div>

          <div className={s.section}>
            <h2 className={s.sectionTitle}><span>07</span>Security</h2>
            <div className={s.body}>
              <p>We use industry-standard encryption (TLS in transit, AES-256 at rest) to protect your data. OAuth tokens are stored encrypted and scoped to the minimum permissions required to operate the Service.</p>
              <p>No method of transmission over the internet is 100% secure. We encourage you to use a strong, unique password for your Viba account and to review connected platform permissions regularly.</p>
            </div>
          </div>

          <div className={s.section}>
            <h2 className={s.sectionTitle}><span>08</span>Children&apos;s Privacy</h2>
            <div className={s.body}>
              <p>Viba is not intended for use by individuals under the age of 13. We do not knowingly collect personal information from children under 13. If we become aware that we have collected such information, we will delete it promptly.</p>
            </div>
          </div>

          <div className={s.section}>
            <h2 className={s.sectionTitle}><span>09</span>Changes to This Policy</h2>
            <div className={s.body}>
              <p>We may update this Privacy Policy from time to time. We will notify you of material changes by posting the new policy and updating the effective date. Continued use of the Service after changes constitutes acceptance of the updated policy.</p>
            </div>
          </div>

          <div className={s.section}>
            <h2 className={s.sectionTitle}><span>10</span>Contact</h2>
            <div className={s.body}>
              <p>For questions, concerns, or data requests related to this Privacy Policy, contact us at:</p>
              <p><a href="mailto:privacy@viba.app">privacy@viba.app</a></p>
            </div>
          </div>

        </div>
      </div>
    </>
  );
}
