/* /contact — how to reach the Sikhify team, and the quicker routes for common requests. */
import PageHero from '../components/common/PageHero.jsx';
import { useReactPage } from '../hooks/useReactPage.js';

const EMAIL = 'sikhify.in@gmail.com';

const ROUTES = [
  ['/directory/gurdwaras/suggest', 'Add or correct a Gurdwara', 'Suggest a new Gurdwara or a fix to an existing listing.'],
  ['/submit', 'Submit / Update Information', 'Add or correct a directory entry — every submission is reviewed.'],
  ['/faq', 'Questions about Sikhi', 'Answers to common questions about Sikh beliefs and practice.'],
  ['/privacy-policy', 'Your data', 'What we collect and how it is used.'],
];

export default function Contact() {
  useReactPage('Contact Us — Sikhify.in', 'How to reach the Sikhify team with questions, corrections or feedback.');
  return (
    <main id="main-content">
      <PageHero crumbs={[{ label: 'Contact Us' }]} eyebrow="Support" title={<>Contact <span className="gold">Us</span></>}
        sub="Questions, corrections or feedback — we would love to hear from you." />
      <div className="sk-container sk-section sk-stack" style={{ maxWidth: 900 }}>
        <section aria-labelledby="email-h" className="sk-card">
          <h2 className="sk-card-title" id="email-h">Email us</h2>
          <div className="fest-prose mt-3">
            <p>Write to <a href={`mailto:${EMAIL}`}>{EMAIL}</a> about anything on Sikhify — a mistake you spotted, a suggestion, or help with your account.</p>
            <p>If you are writing about a specific page, please include its link.</p>
          </div>
        </section>
        <section aria-labelledby="routes-h">
          <h2 className="sk-section-title" id="routes-h">Quicker routes</h2>
          <ul className="sk-grid sk-grid-2 mt-6">
            {ROUTES.map(([to, title, text]) => (
              <li key={to} className="sk-card">
                <p className="sk-card-title"><a href={to}>{title}</a></p>
                <p className="sk-card-meta">{text}</p>
              </li>
            ))}
          </ul>
          <p className="sk-card-meta mt-6">To report a post or comment in the Community, use the Report option on it.</p>
        </section>
      </div>
    </main>
  );
}
