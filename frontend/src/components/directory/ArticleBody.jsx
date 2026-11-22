/* ==========================================================================
   A blog article's body. The text is plain, with two kinds of special line
   (the admin's blog editor inserts both from its toolbar):
     ## Heading                   → a section heading
     ![Caption](/uploads/…)       → an image with its caption
   Everything else is paragraphs, separated by a blank line. Images must be
   Sikhify uploads or https links; anything else stays as text.
   ========================================================================== */
import { UPLOAD_PATH_RE } from '../../../../shared/contentTypes.js';

const IMAGE_LINE = /^!\[([^\]]*)\]\((\S+)\)$/;
const HEADING_LINE = /^##\s+(.+)$/;
const safeImage = (url) => UPLOAD_PATH_RE.test(url) || /^https:\/\/[^\s"'<>]+$/i.test(url);

/** Body text → [{kind: 'p' | 'h' | 'img', …}] */
export function parseArticle(text) {
  const blocks = [];
  let para = [];
  const flush = () => { if (para.length) { blocks.push({ kind: 'p', text: para.join('\n') }); para = []; } };
  for (const raw of String(text || '').split('\n')) {
    const line = raw.trim();
    const img = IMAGE_LINE.exec(line);
    const h = HEADING_LINE.exec(line);
    if (!line) flush();
    else if (img && safeImage(img[2])) { flush(); blocks.push({ kind: 'img', alt: img[1].trim(), src: img[2] }); }
    else if (h) { flush(); blocks.push({ kind: 'h', text: h[1].trim() }); }
    else para.push(raw);
  }
  flush();
  return blocks;
}

export default function ArticleBody({ text }) {
  const blocks = parseArticle(text);
  return (
    <div className="sk-article">
      {blocks.map((b, i) => {
        if (b.kind === 'h') return <h3 key={i} className="sk-article-h">{b.text}</h3>;
        if (b.kind === 'img') {
          return (
            <figure key={i} className="sk-article-figure">
              <img src={b.src} alt={b.alt} loading="lazy" decoding="async" />
              {b.alt ? <figcaption>{b.alt}</figcaption> : null}
            </figure>
          );
        }
        return <p key={i} className="sk-dprose">{b.text}</p>;
      })}
    </div>
  );
}
