import Head from 'next/head';
import s from '../styles/Legal.module.css';

export default function Terms() {
  return (
    <>
      <Head>
        <title>Terms of Service — Viba</title>
      </Head>

      <div className={s.page}>
        <header className={s.header}>
          <span className={s.label}>Legal</span>
          <h1 className={s.title}>Terms of Service</h1>
          <p className={s.meta}>Effective January 1, 2025 · Last updated January 1, 2025</p>
        </header>

        <div className={s.content}>

          <div className={s.section}>
            <h2 className={s.sectionTitle}><span>01</span>Acceptance of Terms</h2>
            <div className={s.body}>
              <p>
                By downloading, installing, or using the Viba mobile application or website (the &ldquo;Service&rdquo;), you agree to be bound by these Terms of Service (&ldquo;Terms&rdquo;). If you do not agree to these Terms, do not use the Service.
              </p>
              <p>
                Viba reserves the right to update these Terms at any time. Continued use of the Service after changes are posted constitutes your acceptance of the revised Terms.
              </p>
            </div>
          </div>

          <div className={s.section}>
            <h2 className={s.sectionTitle}><span>02</span>Eligibility</h2>
            <div className={s.body}>
              <p>You must be at least 13 years old to use Viba. By using the Service, you represent and warrant that you meet this age requirement.</p>
              <p>If you are between 13 and 18 years of age, you may only use Viba with the consent and supervision of a parent or legal guardian who agrees to these Terms on your behalf.</p>
              <p>The Service is not available in jurisdictions where its use is prohibited by applicable law.</p>
            </div>
          </div>

          <div className={s.section}>
            <h2 className={s.sectionTitle}><span>03</span>Account Responsibilities</h2>
            <div className={s.body}>
              <p>You are responsible for maintaining the confidentiality of your account credentials and for all activity that occurs under your account.</p>
              <ul>
                <li>You must provide accurate information when creating your account</li>
                <li>You may not share your account with others or transfer it to another person</li>
                <li>You must notify us immediately at <a href="mailto:legal@viba.app">legal@viba.app</a> if you suspect unauthorized access to your account</li>
                <li>You are solely responsible for any content you stream or publish through the Service</li>
              </ul>
            </div>
          </div>

          <div className={s.section}>
            <h2 className={s.sectionTitle}><span>04</span>Third-Party Platform Compliance</h2>
            <div className={s.body}>
              <p>Viba connects to third-party platforms including TikTok, Instagram, Facebook, YouTube, and Twitch. By using Viba to stream to these platforms, you agree to also comply with each platform&apos;s own Terms of Service, Community Guidelines, and applicable policies.</p>
              <p>Violations of a connected platform&apos;s rules may result in suspension of your account on that platform and may also result in suspension of your Viba account. Viba is not responsible for any actions taken by third-party platforms against your account.</p>
              <p>Viba makes no representation that use of the Service is permitted under any specific third-party platform&apos;s terms at any given time.</p>
            </div>
          </div>

          <div className={s.section}>
            <h2 className={s.sectionTitle}><span>05</span>Content & Ownership</h2>
            <div className={s.body}>
              <p>You retain ownership of all content you create and stream through Viba. By using the Service, you grant Viba a limited, non-exclusive, royalty-free license to process, transmit, and cache your content solely as necessary to provide the Service.</p>
              <p>You represent and warrant that you own or have the necessary rights to all content you stream, and that your content does not infringe any third-party intellectual property, privacy, or other rights.</p>
              <p>Viba does not claim ownership over your streams, likenesses, or creative work.</p>
            </div>
          </div>

          <div className={s.section}>
            <h2 className={s.sectionTitle}><span>06</span>Prohibited Conduct</h2>
            <div className={s.body}>
              <p>You may not use Viba to:</p>
              <ul>
                <li>Stream, broadcast, or distribute illegal content of any kind</li>
                <li>Stream content that depicts or promotes violence, exploitation, or abuse</li>
                <li>Harass, threaten, or intimidate other users, viewers, or any third parties</li>
                <li>Engage in spam, artificial engagement inflation, or bot-driven interactions</li>
                <li>Circumvent platform-level restrictions or access controls</li>
                <li>Use the Service to transmit malware, phishing content, or other harmful code</li>
                <li>Impersonate any person or entity, or misrepresent your affiliation with any entity</li>
                <li>Violate any applicable local, national, or international law or regulation</li>
                <li>Attempt to reverse-engineer, decompile, or otherwise extract the source code of the Service</li>
                <li>Resell, sublicense, or commercially exploit the Service without our written permission</li>
              </ul>
            </div>
          </div>

          <div className={s.section}>
            <h2 className={s.sectionTitle}><span>07</span>Limitation of Liability</h2>
            <div className={s.body}>
              <p>To the fullest extent permitted by law, Viba and its officers, directors, employees, and agents shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising out of or related to your use of the Service.</p>
              <p>This includes, without limitation, loss of revenue, loss of data, loss of goodwill, service interruption, or any damages resulting from actions taken by third-party platforms against your accounts.</p>
              <p>In no event shall Viba&apos;s total liability to you exceed the amount you paid to Viba in the twelve months preceding the claim.</p>
              <p>Some jurisdictions do not allow certain limitations on liability. In such jurisdictions, Viba&apos;s liability shall be limited to the greatest extent permitted by law.</p>
            </div>
          </div>

          <div className={s.section}>
            <h2 className={s.sectionTitle}><span>08</span>Disclaimer of Warranties</h2>
            <div className={s.body}>
              <p>The Service is provided &ldquo;as is&rdquo; and &ldquo;as available&rdquo; without warranties of any kind, express or implied, including but not limited to warranties of merchantability, fitness for a particular purpose, and non-infringement.</p>
              <p>Viba does not warrant that the Service will be uninterrupted, error-free, or free of harmful components, or that defects will be corrected.</p>
            </div>
          </div>

          <div className={s.section}>
            <h2 className={s.sectionTitle}><span>09</span>Termination</h2>
            <div className={s.body}>
              <p>Viba reserves the right to suspend or terminate your account at any time, with or without notice, for violations of these Terms or for any other reason at our sole discretion.</p>
              <p>You may delete your account at any time through the app settings. Upon termination, your right to use the Service ceases immediately. Sections that by their nature should survive termination (including limitation of liability, disclaimers, and governing law) shall survive.</p>
            </div>
          </div>

          <div className={s.section}>
            <h2 className={s.sectionTitle}><span>10</span>Governing Law</h2>
            <div className={s.body}>
              <p>These Terms shall be governed by and construed in accordance with the laws of the State of Delaware, United States, without regard to its conflict of law provisions.</p>
              <p>Any disputes arising from these Terms or your use of the Service shall be resolved through binding arbitration in accordance with the American Arbitration Association&apos;s rules, except where prohibited by applicable law.</p>
            </div>
          </div>

          <div className={s.section}>
            <h2 className={s.sectionTitle}><span>11</span>Contact</h2>
            <div className={s.body}>
              <p>For questions about these Terms of Service, contact us at:</p>
              <p><a href="mailto:legal@viba.app">legal@viba.app</a></p>
            </div>
          </div>

        </div>
      </div>
    </>
  );
}
