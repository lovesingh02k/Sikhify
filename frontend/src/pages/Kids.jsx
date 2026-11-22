/* ==========================================================================
   /kids — Kids: Learn Sikhi. A page children can use on their own:
   the Ten Gurus, the Gurmukhi alphabet (tap a letter to see its name), the
   three golden rules, the Five Ks, a short quiz, and the stories and videos
   that admins add as `kids` directory records (shown below, when there are any).
   Facts are the basic, widely agreed ones taught in Sikh Sunday schools.
   ========================================================================== */
import { useState } from 'react';
import KidsQuiz from '../components/kids/KidsQuiz.jsx';
import { Link } from 'react-router-dom';
import PageHero from '../components/common/PageHero.jsx';
import DirectoryCard from '../components/directory/DirectoryCard.jsx';
import Icon from '../components/ui/Icon.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useAsync } from '../hooks/useAsync.js';
import { useReactPage } from '../hooks/useReactPage.js';
import { entryService } from '../services/content/contentService.js';
import { loadGurus } from './Gurus/GurusIndex.jsx';
import '../components/directory/directory.css';

/** Painti Akhri — the 35 letters of Gurmukhi, in their traditional order. */
const LETTERS = [
  ['ੳ', 'Ura'], ['ਅ', 'Aira'], ['ੲ', 'Iri'], ['ਸ', 'Sassa'], ['ਹ', 'Haha'],
  ['ਕ', 'Kakka'], ['ਖ', 'Khakha'], ['ਗ', 'Gagga'], ['ਘ', 'Ghagga'], ['ਙ', 'Nganga'],
  ['ਚ', 'Chachcha'], ['ਛ', 'Chhachha'], ['ਜ', 'Jajja'], ['ਝ', 'Jhajja'], ['ਞ', 'Nyanya'],
  ['ਟ', 'Tainka'], ['ਠ', 'Thattha'], ['ਡ', 'Dadda'], ['ਢ', 'Dhadda'], ['ਣ', 'Nanna'],
  ['ਤ', 'Tatta'], ['ਥ', 'Thattha'], ['ਦ', 'Dadda'], ['ਧ', 'Dhadda'], ['ਨ', 'Nanna'],
  ['ਪ', 'Pappa'], ['ਫ', 'Phaphpha'], ['ਬ', 'Babba'], ['ਭ', 'Bhabba'], ['ਮ', 'Mamma'],
  ['ਯ', 'Yayya'], ['ਰ', 'Rara'], ['ਲ', 'Lalla'], ['ਵ', 'Vava'], ['ੜ', 'Rarra'],
];

const RULES = [
  ['ਨਾਮ ਜਪਣਾ', 'Naam Japna', 'Remember Waheguru — in prayer, in Simran, and all through the day.', 'heart'],
  ['ਕਿਰਤ ਕਰਨੀ', 'Kirat Karni', 'Work hard and be honest — never cheat or take what isn’t yours.', 'check'],
  ['ਵੰਡ ਛਕਣਾ', 'Vand Chhakna', 'Share what you have with others, like the free Langar at every Gurdwara.', 'users'],
];

const FIVE_KS = [
  ['ਕੇਸ', 'Kesh', 'Uncut hair, kept as Waheguru made it, and covered with a dastar or chunni.'],
  ['ਕੰਘਾ', 'Kanga', 'A small wooden comb to keep the hair clean and tidy.'],
  ['ਕੜਾ', 'Kara', 'A steel bracelet — a reminder to do good with our hands.'],
  ['ਕਛਹਿਰਾ', 'Kachhera', 'Cotton shorts worn as an undergarment, a reminder of self-control.'],
  ['ਕਿਰਪਾਨ', 'Kirpan', 'A small sword, a reminder to stand up for what is right and protect others.'],
];

const QUIZ = [
  ['Who was the first Sikh Guru?', ['Guru Nanak Dev Ji', 'Guru Gobind Singh Ji', 'Guru Arjan Dev Ji'], 0],
  ['How many Gurus were there in human form?', ['Five', 'Ten', 'Twelve'], 1],
  ['Who is the Guru of the Sikhs today?', ['Guru Har Krishan Ji', 'Sri Guru Granth Sahib Ji', 'Guru Tegh Bahadur Ji'], 1],
  ['Which Guru created the Khalsa on Vaisakhi in 1699?', ['Guru Ram Das Ji', 'Guru Gobind Singh Ji', 'Guru Angad Dev Ji'], 1],
  ['In which city is Sri Harmandir Sahib (the Golden Temple)?', ['Amritsar', 'Delhi', 'Patna'], 0],
  ['What is the free community kitchen at a Gurdwara called?', ['Sangat', 'Langar', 'Kirtan'], 1],
  ['Which of these is one of the Five Ks?', ['Kara', 'Kitab', 'Kursi'], 0],
  ['What does “Vand Chhakna” mean?', ['Sleeping early', 'Sharing with others', 'Singing loudly'], 1],
];

const SECTIONS = [['gurus', 'Ten Gurus'], ['gurmukhi', 'Gurmukhi'], ['rules', 'Golden rules'], ['five-ks', 'Five Ks'], ['quiz', 'Quiz'], ['stories', 'Stories & videos']];

export default function Kids() {
  useReactPage('Kids — Learn Sikhi | Sikhify', 'Learn Sikhi for children: the Ten Gurus, the Gurmukhi alphabet, the three golden rules, the Five Ks, a quiz, stories and videos.');
  return (
    <main id="main-content" className="sk-kids">
      <PageHero crumbs={[{ label: 'Learn', to: '/learn-sikhism' }, { label: 'Kids — Learn Sikhi' }]} glyph="ਬੱਚੇ" eyebrow="Learn · For children"
        title={<>Kids — <span className="gold">Learn Sikhi</span></>}
        sub="Meet the Ten Gurus, learn the Gurmukhi letters, play a quiz, and enjoy stories and videos.">
        <nav aria-label="On this page" className="page-subnav">
          {SECTIONS.map(([id, label]) => <a key={id} href={`#${id}`}>{label}</a>)}
        </nav>
      </PageHero>
      <div className="sk-container sk-section sk-stack" style={{ gap: '3.5rem' }}>
        <Gurus />
        <Gurmukhi />
        <Rules />
        <FiveKs />
        <Quiz />
        <Stories />
      </div>
    </main>
  );
}

function Section({ id, emoji, title, sub, children }) {
  return (
    <section id={id} aria-labelledby={`${id}-h`} className="sk-kids-section">
      <header className="sk-kids-head">
        <span className="sk-kids-badge" aria-hidden="true">{emoji}</span>
        <div>
          <h2 className="sk-section-title" id={`${id}-h`}>{title}</h2>
          {sub ? <p className="sk-card-text" style={{ marginTop: '0.2rem' }}>{sub}</p> : null}
        </div>
      </header>
      {children}
    </section>
  );
}

function Gurus() {
  const state = useAsync(loadGurus, []);
  const gurus = state.data || [];
  return (
    <Section id="gurus" emoji="ੴ" title="The Ten Gurus" sub="Sikhi began with Guru Nanak Dev Ji. Tap a Guru to read their story.">
      <ol className="sk-kids-gurus" role="list">
        {gurus.map((g) => (
          <li key={g.id}>
            <Link className="sk-kids-guru" to={`/gurus/${g.id}`}>
              <span className="sk-kids-num">{g.number}</span>
              <span className="min-w-0">
                <span className="sk-card-title block">{g.name}</span>
                <span className="sk-kids-pa" lang="pa">{g.gurmukhi}</span>
              </span>
            </Link>
          </li>
        ))}
      </ol>
      {state.error ? <p className="sk-muted mt-3">The Gurus couldn’t load. <Link to="/gurus">Open the Ten Gurus page</Link>.</p> : null}
      <p className="sk-card-text mt-4">After the Ten Gurus, our Guru forever is <strong>Sri Guru Granth Sahib Ji</strong>.</p>
    </Section>
  );
}

function Gurmukhi() {
  const [open, setOpen] = useState(null);
  return (
    <Section id="gurmukhi" emoji="ੳ" title="Learn the Gurmukhi letters" sub="Gurmukhi is the script of Gurbani. It has 35 main letters (Painti Akhri). Tap a letter to see its name.">
      <ul className="sk-kids-letters" role="list">
        {LETTERS.map(([ch, name], i) => (
          <li key={i}>
            <button type="button" className="sk-kids-letter" aria-pressed={open === i} onClick={() => setOpen(open === i ? null : i)}
              aria-label={`${ch} — ${name}`}>
              <span lang="pa" aria-hidden="true">{ch}</span>
              <small aria-hidden="true">{open === i ? name : ' '}</small>
            </button>
          </li>
        ))}
      </ul>
    </Section>
  );
}

function Rules() {
  return (
    <Section id="rules" emoji="★" title="The three golden rules" sub="Guru Nanak Dev Ji taught three simple ways to live every day.">
      <ul className="sk-grid sk-grid-3" role="list">
        {RULES.map(([pa, en, text, icon]) => (
          <li key={en} className="sk-card sk-kids-card">
            <span className="sk-kids-icon"><Icon name={icon} size={20} /></span>
            <p className="sk-kids-pa mt-3" lang="pa">{pa}</p>
            <p className="sk-card-title">{en}</p>
            <p className="sk-card-text">{text}</p>
          </li>
        ))}
      </ul>
    </Section>
  );
}

function FiveKs() {
  return (
    <Section id="five-ks" emoji="ੲ" title="The Five Ks" sub="Five gifts from Guru Gobind Singh Ji that a Khalsa Sikh keeps. Each one starts with the sound “K”.">
      <ul className="sk-kids-ks" role="list">
        {FIVE_KS.map(([pa, en, text]) => (
          <li key={en} className="sk-card sk-kids-card">
            <p className="sk-kids-pa" lang="pa">{pa}</p>
            <p className="sk-card-title">{en}</p>
            <p className="sk-card-text">{text}</p>
          </li>
        ))}
      </ul>
    </Section>
  );
}

function Quiz() {
  const { can } = useAuth();
  const more = useAsync(() => entryService.list('kids', { category: 'Quiz', page: 1 }), []);
  const quizzes = (more.data && more.data.items) || [];
  return (
    <Section id="quiz" emoji="?" title="Quiz time!" sub="Pick an answer for each question. You’ll see straight away if it’s right.">
      <KidsQuiz questions={QUIZ.map(([question, options, answer]) => ({ question, options, answer }))} />
      {quizzes.length ? (
        <div className="mt-8">
          <h3 className="sk-card-title">More quizzes</h3>
          <ul className="sk-kids-morequiz mt-3" role="list">
            {quizzes.map((e) => (
              <li key={e.id}>
                <Link className="sk-kids-guru" to={e.url}>
                  <span className="sk-kids-num" aria-hidden="true">?</span>
                  <span className="min-w-0">
                    <span className="sk-card-title block">{e.title}</span>
                    <span className="sk-card-meta block">{(e.fields && e.fields.quiz ? e.fields.quiz.length : 0)} questions{e.fields && e.fields.age_group ? ` · Ages ${e.fields.age_group}` : ''}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {can('content.manage') ? (
        <p className="mt-4"><Link className="sk-btn sk-btn-sm" to="/admin/content/new?type=kids&kind=Quiz"><Icon name="plus" size={14} />Make a new quiz</Link></p>
      ) : null}
    </Section>
  );
}

function Stories() {
  const { can } = useAuth();
  // Pages of 24 are added below each other ("Show more"); quizzes have their own section above.
  const [page, setPage] = useState(1);
  const [loaded, setLoaded] = useState([]);
  const state = useAsync(() => entryService.list('kids', { page }).then((d) => {
    setLoaded((prev) => (page === 1 ? d.items : [...prev, ...d.items.filter((x) => !prev.some((p) => p.id === x.id))]));
    return d;
  }), [page]);
  const items = loaded.filter((e) => e.category !== 'Quiz');
  const more = state.data && page < state.data.pages;
  return (
    <Section id="stories" emoji="📖" title="Stories, Sakhis & videos" sub="Sakhis from Sikh history, stories about Sikh heroes, and videos to watch.">
      {state.loading && !loaded.length ? <p className="sk-muted">Loading…</p> : items.length ? (
        <>
          <ul className="sk-dgrid" role="list">
            {items.map((e) => <li key={e.id}><DirectoryCard entry={e} type="kids" headingLevel={3} /></li>)}
          </ul>
          {more ? (
            <p className="mt-4"><button type="button" className="sk-btn" disabled={state.loading} onClick={() => setPage((n) => n + 1)}>{state.loading ? 'Loading…' : 'Show more'}</button></p>
          ) : null}
        </>
      ) : state.error ? (
        <p className="sk-muted">Stories couldn’t load just now. <button type="button" className="sk-link-btn" onClick={state.reload}>Try again</button></p>
      ) : (
        <div className="sk-card sk-kids-card">
          <p className="sk-card-title">New stories are on their way</p>
          <p className="sk-card-text">Meanwhile, read about the <Link to="/gurus">Ten Gurus</Link>, explore <a href="/sikh-history">Sikh History</a>, or listen to <a href="/sikh-media">Kirtan</a>.</p>
        </div>
      )}
      {can('content.manage') ? (
        <p className="mt-4"><Link className="sk-btn sk-btn-sm sk-btn-gold" to="/admin/content/new?type=kids"><Icon name="plus" size={14} />Add a story or video</Link></p>
      ) : null}
    </Section>
  );
}
