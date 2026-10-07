/* ==========================================================================
   /media/:videoId — a Kirtan / Katha video, played inside Sikhify.
   Title, artist, category and description come from the Media catalogue
   (database, or the bundled catalogue on static hosting). Related videos:
   the same artist first, then others in the same category.
   ========================================================================== */
import { Link, useParams } from 'react-router-dom';
import PageHero from '../../components/common/PageHero.jsx';
import YouTubePlayer from '../../components/media/YouTubePlayer.jsx';
import { AsyncView, Empty } from '../../components/ui/States.jsx';
import Icon from '../../components/ui/Icon.jsx';
import { useAsync } from '../../hooks/useAsync.js';
import { useReactPage } from '../../hooks/useReactPage.js';
import { mediaService } from '../../services/media/mediaService.js';
import { isYouTubeVideoId, youTubeThumbnail } from '../../../../shared/youtube.js';
import { shareLink } from '../../utils/format.js';

export default function VideoPage() {
  const { videoId } = useParams();
  const state = useAsync(() => mediaService.video(videoId), [videoId]);
  const d = state.data;
  useReactPage(
    d ? `${d.video.title} — ${d.artist.name} — Sikh Media — Sikhify.in` : 'Video — Sikh Media — Sikhify.in',
    d ? `Watch “${d.video.title}” by ${d.artist.name} (${d.artist.category}) on Sikhify.` : 'Watch Kirtan and Katha on Sikhify.',
  );

  return (
    <main id="main-content">
      <PageHero
        crumbs={[{ label: 'Media', to: '/sikh-media' }, { label: 'Kirtan & Katha', to: '/sikh-media' }, ...(d ? [{ label: d.artist.name, to: `/sikh-media#artist=${d.artist.id}` }] : []), { label: d ? d.video.title : 'Video' }]}
        glyph="ਕੀਰਤਨ"
        eyebrow={d ? `Media · ${d.artist.category}` : 'Media'}
        title={d ? d.artist.name : 'Kirtan & Katha'}
        sub={d && d.artist.location ? d.artist.location : undefined}
      />
      <div className="sk-container sk-section">
        <AsyncView state={state}>
          {(data) => {
            if (!data) {
              // Only catalogued (reviewed) videos play under the Sikhify name.
              return (
                <Empty title="Video not found" text="This video isn't in the Sikhify Media catalogue (it may have been removed).">
                  <a className="sk-btn sk-btn-sm" href="/sikh-media">Browse Kirtan &amp; Katha</a>
                  {isYouTubeVideoId(videoId) ? (
                    <a className="sk-btn sk-btn-sm" href={`https://www.youtube.com/watch?v=${videoId}`} target="_blank" rel="noopener noreferrer">Open on YouTube<span className="sr-only"> (opens in a new tab)</span></a>
                  ) : null}
                </Empty>
              );
            }
            const { video, artist, related } = data;
            return (
              <div className="sk-watch">
                <div>
                  <YouTubePlayer
                    videoId={video.id}
                    title={video.title}
                    category={artist.category}
                    artist={<>by <a className="sk-media-artist-link" href={`/sikh-media#artist=${artist.id}`}>{artist.name}</a>{video.channel ? <> · YouTube channel: {video.channel}</> : null}</>}
                    description={video.description || ''}
                  />
                  <div className="gb-actions mt-4">
                    <a className="sk-btn sk-btn-sm" href={`/sikh-media#artist=${artist.id}`}><Icon name="user" size={15} />All videos by {artist.name}</a>
                    <button type="button" className="sk-btn sk-btn-sm" onClick={() => shareLink({ title: `${video.title} — ${artist.name}`, text: `Watch on Sikhify: ${video.title}`, url: window.location.href })}>
                      <Icon name="share" size={15} />Share
                    </button>
                  </div>
                  <section className="sk-card mt-6" aria-labelledby="about-artist">
                    <p className="sk-eyebrow">About the artist</p>
                    <h2 className="sk-card-title mt-1" id="about-artist">{artist.name}</h2>
                    <p className="sk-card-text">{artist.description}</p>
                    {artist.style ? <p className="sk-card-text"><strong>Style:</strong> {artist.style}</p> : null}
                    {artist.officialLinks && artist.officialLinks.length ? (
                      <ul className="sk-suggest mt-3" aria-label="Official links">
                        {artist.officialLinks.map((l) => <li key={l.url}><a className="sk-chip" href={l.url} target="_blank" rel="noopener noreferrer">{l.label}</a></li>)}
                      </ul>
                    ) : null}
                    <a className="panel-view-all block mt-3" href={`/sikh-media?category=${encodeURIComponent(artist.category)}`}>More {artist.category} artists →</a>
                  </section>
                </div>
                <aside aria-labelledby="related-heading">
                  <h2 className="sk-card-title" id="related-heading">Related videos</h2>
                  {related.length ? (
                    <ul className="flex flex-col gap-2 mt-3">
                      {related.map((r) => (
                        <li key={r.id}>
                          <Link className="sk-video-related" to={`/media/${r.id}`}>
                            <img src={youTubeThumbnail(r.id, 'mqdefault')} alt="" loading="lazy" width="140" height="79" />
                            <span className="min-w-0">
                              <span className="sk-card-title block" style={{ fontSize: '0.9rem' }}>{r.title}</span>
                              <span className="sk-card-meta block">{r.artist.name}</span>
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  ) : <p className="sk-card-meta">No related videos yet.</p>}
                </aside>
              </div>
            );
          }}
        </AsyncView>
      </div>
    </main>
  );
}
