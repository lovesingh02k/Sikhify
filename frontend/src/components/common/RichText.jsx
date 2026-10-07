/**
 * User-written text, rendered safely: React escapes everything, line breaks
 * are kept, and only http(s) URLs become links (rel="nofollow ugc noopener").
 * No HTML from users is ever rendered.
 */
const URL_RE = /(https?:\/\/[^\s<>"']+[^\s<>"'.,;:!?)\]])/g;

export default function RichText({ text, className = '' }) {
  const parts = String(text || '').split(URL_RE);
  return (
    <div className={`sk-richtext ${className}`.trim()}>
      {parts.map((p, i) => (i % 2 === 1
        ? <a key={i} href={p} target="_blank" rel="nofollow ugc noopener noreferrer">{p.length > 60 ? p.slice(0, 57) + '…' : p}</a>
        : <span key={i}>{p}</span>))}
    </div>
  );
}
