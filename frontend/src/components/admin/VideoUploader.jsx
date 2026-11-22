/* ==========================================================================
   Upload video files (staff): each file goes straight to the Vercel Blob
   store with a progress bar, then shows as a playable preview with a remove
   button. `value` is the list of uploaded video URLs.
   ========================================================================== */
import { useId, useRef, useState } from 'react';
import Icon from '../ui/Icon.jsx';
import { uploadService } from '../../services/community/index.js';
import { LIMITS } from '../../../../shared/community.js';
import { VIDEO_TYPES } from '../../../../shared/contentTypes.js';

const MAX_MB = Math.round(LIMITS.videoUploadBytes / 1048576);

export default function VideoUploader({ value, onChange, max = 5, onBusy }) {
  const id = useId();
  const input = useRef(null);
  const [progress, setProgress] = useState(null); // { name, pct }
  const [error, setError] = useState('');

  async function pick(e) {
    const files = [...e.target.files].slice(0, Math.max(0, max - value.length));
    e.target.value = '';
    if (!files.length) return;
    setError('');
    onBusy?.(true);
    let urls = [...value];
    for (const file of files) {
      if (!VIDEO_TYPES[file.type]) { setError(`“${file.name}” is not an MP4, WebM or MOV video.`); continue; }
      if (file.size > LIMITS.videoUploadBytes) { setError(`“${file.name}” is larger than ${MAX_MB} MB.`); continue; }
      setProgress({ name: file.name, pct: 0 });
      try {
        const url = await uploadService.video(file, { onProgress: (pct) => setProgress({ name: file.name, pct }) });
        urls = [...urls, url];
        onChange(urls);
      } catch (err) {
        setError(err.message || 'Video upload failed');
      }
    }
    setProgress(null);
    onBusy?.(false);
  }

  const busy = !!progress;
  return (
    <div>
      {value.length ? (
        <ul className="sk-video-uploads" aria-label="Uploaded videos">
          {value.map((url, i) => (
            <li key={url}>
              <video src={url} controls preload="metadata" />
              <button type="button" className="sk-btn sk-btn-sm" onClick={() => onChange(value.filter((u) => u !== url))}>
                <Icon name="trash" size={14} />Remove video {i + 1}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {busy ? (
        <div className="sk-video-progress" role="status">
          <span>Uploading “{progress.name}” — {Math.round(progress.pct)}%</span>
          <span className="sk-progress"><span style={{ width: `${progress.pct}%` }} /></span>
          <small>Keep this page open until it finishes.</small>
        </div>
      ) : null}
      {value.length < max && !busy ? (
        <>
          <input ref={input} id={id} type="file" accept={Object.keys(VIDEO_TYPES).join(',')} multiple={max - value.length > 1} className="sr-only" onChange={pick} />
          <label htmlFor={id} className="sk-action" style={{ cursor: 'pointer' }} tabIndex={0} role="button"
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); input.current?.click(); } }}>
            <Icon name="upload" size={16} />Upload video
          </label>
          <p className="sk-form-help">MP4, WebM or MOV · up to {MAX_MB} MB each · {max} videos at most.</p>
        </>
      ) : null}
      {error ? <p className="sk-form-error" role="alert">{error}</p> : null}
    </div>
  );
}
