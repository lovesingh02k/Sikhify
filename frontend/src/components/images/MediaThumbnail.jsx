import OptimizedImage from './OptimizedImage.jsx';
import Icon from '../ui/Icon.jsx';
import { youTubeThumb } from '../../utils/images.js';

/** YouTube thumbnail in a 16:9 frame, lazy-loaded at the size it is shown. Decorative: the link/caption names the video. */
export default function MediaThumbnail({ videoId, sizes = '(min-width: 1024px) 380px, 92vw', playIcon = true, width }) {
  const t = youTubeThumb(videoId);
  return (
    <span className="sk-thumb" style={width ? { width, flexShrink: 0 } : undefined}>
      <OptimizedImage src={t.src} srcSet={t.srcSet} sources={[]} sizes={sizes} width={t.width} height={t.height} decorative
        className="sk-thumb-img" style={{ aspectRatio: '16 / 9' }} imgClassName="sk-thumb-el" fallback={<span className="sk-thumb-missing" aria-hidden="true"><Icon name="youtube" size={22} /></span>} />
      {playIcon ? <span className="sk-media-play" aria-hidden="true"><Icon name="play" size={18} /></span> : null}
    </span>
  );
}
