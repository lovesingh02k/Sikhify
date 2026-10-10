/* /privacy-policy (file deliberately not named "PrivacyPolicy": ad/cookie blockers block such scripts) — what Sikhify collects, why, who else is involved, and how to ask
   for your data or its deletion. Every statement here describes what the code actually
   does (backend/src: auth, submissions, uploads, rate limits; frontend storage keys
   "sikhify:*"); update this page whenever that changes. */
import { Link } from 'react-router-dom';
import PageHero from '../components/common/PageHero.jsx';
import { useReactPage } from '../hooks/useReactPage.js';

const UPDATED = '10 October 2026';

const SECTIONS = [
  ['summary', 'In short'],
  ['collect', 'What we collect'],
  ['use', 'How we use it'],
  ['public', 'What other people can see'],
  ['cookies', 'Cookies and browser storage'],
  ['third', 'Services we rely on'],
  ['keep', 'How long we keep it'],
  ['security', 'How we protect it'],
  ['rights', 'Your choices and requests'],
  ['children', 'Children'],
  ['changes', 'Changes to this policy'],
];

export default function PrivacyPolicy() {
  useReactPage('Privacy Policy — Sikhify.in', 'What Sikhify collects, why, who else is involved, and how to see, correct or delete your data.');
  return (
    <main id="main-content">
      <PageHero crumbs={[{ label: 'Privacy Policy' }]} eyebrow="Support" title="Privacy Policy"
        sub={`How Sikhify handles your information. Last updated ${UPDATED}.`} />
      <div className="sk-container sk-section sk-stack" style={{ maxWidth: 900 }}>
        <nav className="sk-card" aria-labelledby="pp-toc">
          <h2 className="sk-card-title" id="pp-toc">On this page</h2>
          <ol className="pp-toc mt-3">
            {SECTIONS.map(([id, label]) => <li key={id}><a className="panel-view-all" href={`#${id}`}>{label}</a></li>)}
          </ol>
        </nav>

        <section id="summary" aria-labelledby="summary-h">
          <h2 className="sk-section-title" id="summary-h">In short</h2>
          <div className="fest-prose pp-prose mt-3">
            <ul>
              <li>You can read everything on Sikhify — Gurbani, Hukamnama, Nitnem, history, the directory — <strong>without an account</strong>.</li>
              <li>We collect only what is needed to run your account, review what you send us, and keep the site safe.</li>
              <li>We do <strong>not</strong> sell your data, show advertising, or use advertising or analytics trackers.</li>
              <li>You can ask to see, correct or delete your data at any time — <Link className="panel-view-all" to="/submit?kind=privacy">send a privacy request</Link>.</li>
            </ul>
          </div>
        </section>

        <section id="collect" aria-labelledby="collect-h">
          <h2 className="sk-section-title" id="collect-h">What we collect</h2>
          <div className="fest-prose pp-prose mt-3">
            <h3>If you create an account</h3>
            <ul>
              <li><strong>Name, username and email address.</strong></li>
              <li><strong>Your password</strong> — stored only as a one-way scrypt hash. Nobody at Sikhify can read it.</li>
              <li><strong>Profile details you choose to add:</strong> a bio, your location (with a setting for whether it is shown), interests and a profile photo.</li>
              <li><strong>Sign-in sessions:</strong> when each session started, when it expires, and your browser&apos;s name/version (its &ldquo;user agent&rdquo;), so you can recognise your sessions and sign out of all of them.</li>
              <li><strong>What you do in the community:</strong> posts, comments, reactions, group memberships, reports you make, and your notifications.</li>
            </ul>
            <h3>If you send a submission (with or without an account)</h3>
            <ul>
              <li>What you write in the form: the information, the source you give, and any note to reviewers.</li>
              <li>Without an account, a <strong>name and email address only if you choose to give them</strong> (an email is required for privacy requests, so we can reply).</li>
              <li>A one-way hash of your network (IP) address, used only to notice the same submission being sent twice.</li>
            </ul>
            <h3>Images you upload</h3>
            <p>Uploaded images are re-encoded on our server. Hidden photo metadata — such as camera details and GPS location — is removed and not stored.</p>
            <h3>Technical information</h3>
            <p>To stop spam and password-guessing, we count requests per network (IP) address and per account for a short time (see <a className="panel-view-all" href="#keep">How long we keep it</a>). Our hosting provider also keeps standard server logs.</p>
          </div>
        </section>

        <section id="use" aria-labelledby="use-h">
          <h2 className="sk-section-title" id="use-h">How we use it</h2>
          <div className="fest-prose pp-prose mt-3">
            <ul>
              <li>To sign you in and keep your account secure.</li>
              <li>To show your posts, comments and profile in the community.</li>
              <li>To review submissions, ask follow-up questions, and tell you the outcome.</li>
              <li>To send emails you ask for — currently only <strong>password-reset links</strong>. We do not send marketing email.</li>
              <li>To prevent spam, abuse and attacks, and to moderate the community.</li>
            </ul>
          </div>
        </section>

        <section id="public" aria-labelledby="public-h">
          <h2 className="sk-section-title" id="public-h">What other people can see</h2>
          <div className="fest-prose pp-prose mt-3">
            <p>Your <strong>name, username, profile photo, bio and interests</strong>, and everything you post or comment in public places, can be seen by others. Your <strong>location</strong> is shown only if you turn that on. Posts in private groups are visible to that group&apos;s members.</p>
            <p>Your <strong>email address is never shown</strong> to other members. Sikhify administrators and moderators can see account details and submissions when they need to — for example, to review a submission or handle a report.</p>
            <p>When a submission is approved, the <em>information</em> you sent (for example a Gurdwara&apos;s address) may be published; your name and email are not published with it.</p>
          </div>
        </section>

        <section id="cookies" aria-labelledby="cookies-h">
          <h2 className="sk-section-title" id="cookies-h">Cookies and browser storage</h2>
          <div className="fest-prose pp-prose mt-3">
            <p>Sikhify sets <strong>one cookie</strong>, <code>sk_session</code>, and only when you sign in. It keeps you signed in, is not readable by scripts on the page, and expires after 30 days or when you sign out.</p>
            <p>Your browser&apos;s local storage (names beginning with <code>sikhify:</code>) remembers conveniences on <em>your device only</em> — light/dark theme, reading preferences such as text size and transliteration, bookmarks, where you were on a page, and whether you are signed in (so the menu shows the right buttons straight away). This never leaves your device; clearing your browser&apos;s site data removes it.</p>
            <p>We use no advertising or analytics cookies.</p>
          </div>
        </section>

        <section id="third" aria-labelledby="third-h">
          <h2 className="sk-section-title" id="third-h">Services we rely on</h2>
          <div className="fest-prose pp-prose mt-3">
            <p>These services receive information only as needed to do their job:</p>
            <dl className="sk-dl">
              <dt>Vercel</dt><dd>Hosts the website and the API (it handles every request, including your IP address).</dd>
              <dt>Turso</dt><dd>Stores the Sikhify database, on servers in Mumbai, India (Amazon Web Services).</dd>
              <dt>Resend</dt><dd>Delivers password-reset emails (receives your email address and the email).</dd>
              <dt>BaniDB</dt><dd>Your browser loads Gurbani text and the Hukamnama from <code>api.banidb.com</code>.</dd>
              <dt>YouTube</dt><dd>Videos load from <code>youtube-nocookie.com</code> (YouTube&apos;s privacy-enhanced mode), and on the homepage only after you press play. YouTube&apos;s own privacy policy applies to a video once it plays.</dd>
              <dt>OpenStreetMap</dt><dd>Map tiles on directory pages load from OpenStreetMap&apos;s tile servers. &ldquo;Directions&rdquo; links open Google Maps — only if you click them.</dd>
              <dt>Google Fonts</dt><dd>The site&apos;s fonts load from Google&apos;s font servers.</dd>
              <dt>Media hosts</dt><dd>Some images and audio load from Wikimedia Commons, Pexels, the Internet Archive and SGPC&apos;s Hukamnama server.</dd>
            </dl>
            <p>When your browser loads something from these services, they receive your IP address and normal browser information, as with any website.</p>
          </div>
        </section>

        <section id="keep" aria-labelledby="keep-h">
          <h2 className="sk-section-title" id="keep-h">How long we keep it</h2>
          <div className="fest-prose pp-prose mt-3">
            <ul>
              <li><strong>Account and profile:</strong> until you ask us to delete your account.</li>
              <li><strong>Sign-in sessions:</strong> until you sign out, or 30 days; expired sessions are then removed.</li>
              <li><strong>Password-reset links:</strong> they stop working after 1 hour.</li>
              <li><strong>Spam and security counters</strong> (which include IP addresses): from 15 minutes up to 24 hours, then removed.</li>
              <li><strong>Submissions:</strong> kept with their review history, so decisions can be checked later. Ask us and we will remove your name and email from them.</li>
              <li><strong>Posts and comments:</strong> until you or a moderator delete them, or your account is deleted.</li>
              <li><strong>Backups</strong> of the database are made before maintenance and kept privately by the site administrators.</li>
            </ul>
          </div>
        </section>

        <section id="security" aria-labelledby="security-h">
          <h2 className="sk-section-title" id="security-h">How we protect it</h2>
          <div className="fest-prose pp-prose mt-3">
            <p>Everything is sent over encrypted HTTPS connections. Passwords are hashed with scrypt; session and reset tokens are stored only as hashes. Admin tools need a staff account, and repeated failed sign-ins are slowed down. No system is perfectly secure, but we work to keep your information safe, and we will tell affected users if a breach puts their data at risk.</p>
          </div>
        </section>

        <section id="rights" aria-labelledby="rights-h">
          <h2 className="sk-section-title" id="rights-h">Your choices and requests</h2>
          <div className="fest-prose pp-prose mt-3">
            <p>You can change your profile at any time in <Link className="panel-view-all" to="/community/settings">Account settings</Link>, change your password, and sign out of every device.</p>
            <p>You can also ask us to:</p>
            <ul>
              <li>tell you what personal data we hold about you, and give you a copy;</li>
              <li>correct anything that is wrong;</li>
              <li>delete your account and personal data, or remove your name and email from a submission.</li>
            </ul>
            <p>Use the <Link className="panel-view-all" to="/submit?kind=privacy">privacy request form</Link>. If you have an account, sign in first so we know the request is yours; otherwise include your email so we can confirm it. A Sikhify administrator handles each request by hand and replies by email.</p>
          </div>
        </section>

        <section id="children" aria-labelledby="children-h">
          <h2 className="sk-section-title" id="children-h">Children</h2>
          <div className="fest-prose pp-prose mt-3">
            <p>Anyone can read Sikhify without an account. If you are under 18, please ask a parent or guardian before creating an account or posting in the community. If you believe a child has given us personal data without permission, send a privacy request and we will delete it.</p>
          </div>
        </section>

        <section id="changes" aria-labelledby="changes-h">
          <h2 className="sk-section-title" id="changes-h">Changes to this policy</h2>
          <div className="fest-prose pp-prose mt-3">
            <p>When the way Sikhify uses data changes, we update this page and the date at the top. Questions? <Link className="panel-view-all" to="/submit?kind=privacy">Send us a privacy request</Link> or read the <Link className="panel-view-all" to="/faq">FAQ</Link>.</p>
          </div>
        </section>
      </div>
    </main>
  );
}
