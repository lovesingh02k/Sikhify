/* ==========================================================================
   Sikhify — YouTubePlayer
   Plays YouTube videos inside Sikhify with the official YouTube player
   (IFrame Player API, privacy-enhanced youtube-nocookie.com host). Nothing is
   re-implemented or bypassed: YouTube's own controls, fullscreen and quality
   menus are all there. On top, Sikhify adds an accessible Play/Pause and
   Fullscreen control, a loading state, and honest error states — including
   "This video cannot be embedded by its owner." with a link to YouTube.

   If the IFrame API script can't load (blocked by an extension or network),
   the standard embed is shown instead (it still plays; only the extra
   controls and error detection are unavailable).

   Performance: YouTube's player is ~3.5 MB of script. Until the visitor
   presses Play, only the video's thumbnail is shown (a "click to load"
   poster); the player then loads and starts playing in place.
   ========================================================================== */
import { useEffect, useRef, useState } from 'react';
import Icon from '../ui/Icon.jsx';
import { isYouTubeVideoId, youTubeEmbedUrl, youTubeWatchUrl, youTubeThumbnail } from '../../../../shared/youtube.js';

let apiPromise = null;
/** Loads https://www.youtube.com/iframe_api once per page. */
export function loadYouTubeApi(timeout = 10000) {
  if (window.YT && window.YT.Player) return Promise.resolve(window.YT);
  if (!apiPromise) {
    apiPromise = new Promise((resolve, reject) => {
      const timer = setTimeout(() => { apiPromise = null; reject(new Error('YouTube player API timed out')); }, timeout);
      const prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        clearTimeout(timer);
        if (typeof prev === 'function') prev();
        resolve(window.YT);
      };
      const s = document.createElement('script');
      s.src = 'https://www.youtube.com/iframe_api';
      s.async = true;
      s.onerror = () => { clearTimeout(timer); apiPromise = null; s.remove(); reject(new Error('YouTube player API failed to load')); };
      document.head.appendChild(s);
    });
  }
  return apiPromise;
}

const ERRORS = {
  2: 'This video link is not valid.',
  5: "This video can't be played in your browser.",
  100: 'This video has been removed or made private by its owner.',
  101: 'This video cannot be embedded by its owner.',
  150: 'This video cannot be embedded by its owner.',
  153: 'This video cannot be embedded by its owner.',
};

export default function YouTubePlayer({ videoId, title, artist, category, description, headingLevel = 2, onEnded }) {
  const frameRef = useRef(null);
  const wrapRef = useRef(null);
  const playerRef = useRef(null);
  const [active, setActive] = useState(false); // has the visitor asked to play?
  const [state, setState] = useState('idle'); // idle · loading · ready · fallback · error
  const [error, setError] = useState(null);
  const [playing, setPlaying] = useState(false);
  const valid = isYouTubeVideoId(videoId);
  const Heading = `h${headingLevel}`;

  // A different video starts again from its poster.
  useEffect(() => { setActive(false); setState(isYouTubeVideoId(videoId) ? 'idle' : 'error'); setError(isYouTubeVideoId(videoId) ? null : ERRORS[2]); }, [videoId]);

  useEffect(() => {
    if (!valid || !active) return undefined;
    let cancelled = false;
    setState('loading');
    setError(null);
    setPlaying(false);
    const container = frameRef.current;

    loadYouTubeApi().then((YT) => {
      if (cancelled || !container) return;
      const target = document.createElement('div');
      container.replaceChildren(target);
      playerRef.current = new YT.Player(target, {
        videoId,
        host: 'https://www.youtube-nocookie.com',
        width: '100%',
        height: '100%',
        playerVars: { rel: 0, modestbranding: 1, playsinline: 1, autoplay: 1, origin: window.location.origin },
        events: {
          onReady: (e) => {
            if (cancelled) return;
            const iframe = e.target.getIframe();
            iframe.setAttribute('title', title ? `YouTube video: ${title}` : 'YouTube video player');
            iframe.setAttribute('allow', 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen');
            iframe.setAttribute('allowfullscreen', '');
            setState('ready');
            // The visitor pressed Play on the poster: start right away (browsers may still require a second tap).
            try { e.target.playVideo(); } catch { /* autoplay refused */ }
          },
          onStateChange: (e) => {
            if (cancelled) return;
            setPlaying(e.data === YT.PlayerState.PLAYING || e.data === YT.PlayerState.BUFFERING);
            if (e.data === YT.PlayerState.ENDED && onEnded) onEnded();
          },
          onError: (e) => {
            if (cancelled) return;
            setError(ERRORS[e.data] || "This video couldn't be played.");
            setState('error');
          },
        },
      });
    }).catch(() => {
      if (!cancelled) setState('fallback');
    });

    return () => {
      cancelled = true;
      try { playerRef.current && playerRef.current.destroy(); } catch { /* already gone */ }
      playerRef.current = null;
      if (container) container.replaceChildren();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId, active]);

  const toggle = () => {
    if (!active) { setActive(true); return; }
    const p = playerRef.current;
    if (!p || state !== 'ready') return;
    if (playing) p.pauseVideo(); else p.playVideo();
  };
  const fullscreen = () => {
    const el = wrapRef.current;
    if (!el) return;
    if (document.fullscreenElement) document.exitFullscreen();
    else if (el.requestFullscreen) el.requestFullscreen().catch(() => {});
  };

  const watchUrl = valid ? youTubeWatchUrl(videoId) : null;

  return (
    <figure className="sk-video" aria-label={title ? `Video: ${title}` : 'Video'}>
      <div className="sk-video-frame" ref={wrapRef}>
        {state === 'fallback' ? (
          <iframe
            src={youTubeEmbedUrl(videoId, { autoplay: '1' })}
            title={title ? `YouTube video: ${title}` : 'YouTube video player'}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
            allowFullScreen
            loading="lazy"
            referrerPolicy="strict-origin-when-cross-origin"
          />
        ) : (
          <div className="sk-video-target" ref={frameRef} hidden={state === 'error'} />
        )}
        {state === 'idle' ? (
          <button type="button" className="sk-video-poster" onClick={() => setActive(true)} aria-label={title ? `Play video: ${title}` : 'Play video'}>
            <img src={youTubeThumbnail(videoId)} srcSet={`${youTubeThumbnail(videoId)} 480w, ${youTubeThumbnail(videoId, 'sddefault')} 640w`}
              sizes="(min-width: 1100px) 820px, 100vw" width="480" height="360" alt="" decoding="async" fetchPriority="high"
              onError={(e) => { e.currentTarget.removeAttribute('srcset'); }} />
            <span className="sk-video-bigplay" aria-hidden="true"><Icon name="play" size={30} /></span>
          </button>
        ) : null}
        {state === 'loading' ? (
          <div className="sk-video-overlay" role="status" aria-live="polite">
            {valid ? <img src={youTubeThumbnail(videoId)} alt="" /> : null}
            <span className="sk-video-loading"><span className="sk-spinner" aria-hidden="true" />Loading video…</span>
          </div>
        ) : null}
        {state === 'error' ? (
          <div className="sk-video-overlay sk-video-error" role="alert">
            <Icon name="alert" size={28} />
            <p className="sk-video-error-title">{error}</p>
            {watchUrl ? (
              <a className="sk-btn sk-btn-gold sk-btn-sm" href={watchUrl} target="_blank" rel="noopener noreferrer">
                <Icon name="youtube" size={16} /> Watch on YouTube<span className="sr-only"> (opens in a new tab)</span>
              </a>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="sk-video-bar">
        <div className="flex items-center gap-2">
          <button type="button" className="sk-btn sk-btn-sm" onClick={toggle} disabled={state === 'loading' || state === 'error' || state === 'fallback'} aria-pressed={playing}>
            <Icon name={playing ? 'pause' : 'play'} size={15} />{playing ? 'Pause' : 'Play'}
          </button>
          <button type="button" className="sk-btn sk-btn-sm" onClick={fullscreen} disabled={state === 'error' || state === 'loading'}>
            <Icon name="fullscreen" size={15} />Fullscreen
          </button>
        </div>
        {watchUrl ? (
          <a className="sk-link-btn" href={watchUrl} target="_blank" rel="noopener noreferrer">
            Open on YouTube <Icon name="external" size={13} /><span className="sr-only"> (opens in a new tab)</span>
          </a>
        ) : null}
      </div>

      {title || artist || category || description ? (
        <figcaption className="sk-video-meta">
          {category ? <span className="sk-badge">{category}</span> : null}
          {title ? <Heading className="sk-video-title">{title}</Heading> : null}
          {artist ? <p className="sk-card-meta">{artist}</p> : null}
          {description ? <p className="sk-card-text" style={{ whiteSpace: 'pre-line' }}>{description}</p> : null}
        </figcaption>
      ) : null}
    </figure>
  );
}
