import { useId, useRef, useState } from 'react';
import Icon from '../ui/Icon.jsx';
import { uploadService } from '../../services/community/index.js';

/**
 * Upload images (resized in the browser, verified by the server) and show
 * previews with remove buttons. `value` is the list of /uploads/… URLs.
 */
export default function ImagePicker({ value, onChange, purpose = 'post', max = 4, label = 'Add photos', onBusy }) {
  const id = useId();
  const input = useRef(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function pick(e) {
    const files = [...e.target.files].slice(0, Math.max(0, max - value.length));
    e.target.value = '';
    if (!files.length) return;
    setBusy(true);
    onBusy?.(true);
    setError('');
    const urls = [];
    for (const f of files) {
      try { urls.push(await uploadService.image(f, purpose)); } catch (err) { setError(err.message || 'Upload failed'); }
    }
    onChange([...value, ...urls]);
    setBusy(false);
    onBusy?.(false);
  }

  return (
    <div>
      {value.length ? (
        <ul className="flex flex-wrap gap-2 mb-2" aria-label="Attached images">
          {value.map((url) => (
            <li key={url} className="relative">
              <img src={url} alt="" width="88" height="88" style={{ width: 88, height: 88, objectFit: 'cover', borderRadius: 10 }} />
              <button type="button" className="sk-icon-btn" style={{ position: 'absolute', top: -8, right: -8, width: 28, height: 28, background: 'var(--surface)', boxShadow: 'var(--shadow-card)' }}
                aria-label="Remove image" onClick={() => onChange(value.filter((u) => u !== url))}><Icon name="close" size={14} /></button>
            </li>
          ))}
        </ul>
      ) : null}
      {value.length < max ? (
        <>
          <input ref={input} id={id} type="file" accept="image/png,image/jpeg,image/webp,image/gif" multiple={max > 1} className="sr-only" onChange={pick} disabled={busy} />
          <label htmlFor={id} className="sk-action" style={{ cursor: busy ? 'progress' : 'pointer' }}
            tabIndex={0} role="button" onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); input.current?.click(); } }}>
            {busy ? <span className="sk-spinner" aria-hidden="true" /> : <Icon name="image" size={16} />}{busy ? 'Uploading…' : label}
          </label>
        </>
      ) : null}
      {error ? <p className="sk-form-error" role="alert">{error}</p> : null}
    </div>
  );
}
