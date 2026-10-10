/* ==========================================================================
   /admin/banners/new · /admin/banners/:id — create or edit a homepage banner.
   Grouped fields with plain labels, errors beside each field, values kept
   after an error, and a live preview rendered by the same code as the
   homepage (utils/bannerHtml.js). "Save draft" never publishes; "Save &
   publish" puts it on the homepage (within its dates, if any).
   Two kinds: a custom banner (image / video / button), or a festival / important
   day — pick a published observance and the banner shows it in the light
   observance design with its verified date (hidden while it has none).
   ========================================================================== */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AdminHeader, Pill } from '../../components/admin/AdminKit.jsx';
import ImagePicker from '../../components/community/ImagePicker.jsx';
import { TextInput, TextArea, Select, FormError } from '../../components/ui/Form.jsx';
import { AsyncView } from '../../components/ui/States.jsx';
import { useAsync } from '../../hooks/useAsync.js';
import { usePageMeta } from '../../hooks/usePageMeta.js';
import { adminService } from '../../services/admin/adminService.js';
import { bannerHtml, wireBannerPlayers } from '../../utils/bannerHtml.js';
import { getYouTubeVideoId, youTubeWatchUrl } from '../../../../shared/youtube.js';
import { nextVerifiedOccurrence, cardOf } from '../../../../shared/festivals.js';
import { festivalDateLabel } from '../../utils/festivalCard.js';
import { toast } from '../../utils/format.js';

const NO_OPTIONS = { eyebrow: '', kicker: '', subtitle: '', gurmukhi: '' };
const EMPTY = { observanceId: '', options: NO_OPTIONS, title: '', description: '', imageUrl: '', imageAlt: '', youtube: '', ctaLabel: '', ctaUrl: '', startsAt: '', endsAt: '' };
const dateOnly = (iso) => (iso ? String(iso).slice(0, 10) : '');

/** Published festivals / important days, each with the card the homepage would show (null without an upcoming verified date). */
function useFestivals() {
  return useAsync(() => adminService.festivals({ status: 'published' }).then((d) => d.items.map((o) => {
    const occ = nextVerifiedOccurrence(o, d.today);
    return { id: o.id, title: o.title, card: occ ? cardOf(o, occ, d.today) : null };
  }).sort((a, b) => (a.card ? 0 : 1) - (b.card ? 0 : 1)
    || (a.card && b.card ? (a.card.start < b.card.start ? -1 : a.card.start > b.card.start ? 1 : 0) : a.title.localeCompare(b.title)))), []);
}

function Preview({ form, festival }) {
  const ref = useRef(null);
  const videoId = getYouTubeVideoId(form.youtube);
  const html = useMemo(() => (festival ? (festival.card ? bannerHtml({
    observance: festival.card, options: form.options, title: form.title, description: form.description,
    image: form.imageUrl ? { url: form.imageUrl, alt: form.imageAlt } : null,
    cta: form.ctaLabel && form.ctaUrl ? { label: form.ctaLabel, url: form.ctaUrl } : null,
  }, { headingLevel: 3 }) : '') : bannerHtml({
    title: form.title || 'Banner title',
    description: form.description,
    image: form.imageUrl ? { url: form.imageUrl, alt: form.imageAlt } : null,
    youtubeId: videoId,
    cta: form.ctaLabel && form.ctaUrl ? { label: form.ctaLabel, url: form.ctaUrl } : null,
  }, { headingLevel: 3 })), [form, videoId, festival]);
  useEffect(() => wireBannerPlayers(ref.current), [html]);
  if (festival && !festival.card) return <p className="sk-card-meta">This festival has no upcoming verified date, so the banner would not be shown. Add a verified date in Admin → Festivals.</p>;
  if (!festival && !form.imageUrl && !videoId) return <p className="sk-card-meta">Add an image or a YouTube video to see the preview.</p>;
  return <div ref={ref} className="sk-banner-preview" dangerouslySetInnerHTML={{ __html: html }} />;
}

function Editor({ banner }) {
  const navigate = useNavigate();
  const festivals = useFestivals();
  const [kind, setKind] = useState(banner && banner.observanceId ? 'festival' : 'custom');
  const [form, setForm] = useState(() => (banner ? {
    observanceId: banner.observanceId ? String(banner.observanceId) : '',
    options: { ...NO_OPTIONS, ...(banner.options || {}) },
    title: banner.title, description: banner.description, imageUrl: banner.imageUrl, imageAlt: banner.imageAlt,
    youtube: banner.youtubeId ? youTubeWatchUrl(banner.youtubeId) : '', ctaLabel: banner.ctaLabel, ctaUrl: banner.ctaUrl,
    startsAt: dateOnly(banner.startsAt), endsAt: dateOnly(banner.endsAt),
  } : EMPTY));
  const [st, setSt] = useState({ busy: false, error: null, fields: {} });
  const [uploading, setUploading] = useState(false);
  const [more, setMore] = useState(!!(banner && (banner.startsAt || banner.endsAt)));
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const setOpt = (k) => (e) => setForm({ ...form, options: { ...form.options, [k]: e.target.value } });
  const fe = st.fields;
  const festivalList = festivals.data || [];
  const festival = kind === 'festival' && form.observanceId ? festivalList.find((x) => String(x.id) === String(form.observanceId)) || null : null;
  const chooseFestival = (e) => {
    const f = festivalList.find((x) => String(x.id) === e.target.value);
    const autoTitle = !form.title || festivalList.some((x) => x.title === form.title);
    setForm({ ...form, observanceId: e.target.value, title: f && autoTitle ? f.title : form.title });
  };
  // A festival banner keeps no image/video/button of its own; a custom one is linked to no festival.
  const payload = () => (kind === 'festival'
    ? { ...form, observanceId: form.observanceId || null, youtube: '' }
    : { ...form, observanceId: null, options: NO_OPTIONS });

  async function save(publish) {
    setSt({ busy: true, error: null, fields: {} });
    try {
      if (kind === 'festival' && !form.observanceId) { setSt({ busy: false, error: null, fields: { observanceId: 'Choose the festival or important day' } }); return; }
      let saved = banner ? await adminService.updateBanner(banner.id, payload()) : await adminService.createBanner({ ...payload(), status: publish ? 'published' : 'draft' });
      if (banner && publish && saved.status !== 'published') saved = await adminService.setBannerStatus(saved.id, 'published');
      toast(publish ? (saved.state === 'scheduled' ? 'Saved — it will appear on the homepage on its start date' : 'Saved and published on the homepage') : banner && banner.status === 'published' ? 'Changes saved — the banner is still live' : 'Draft saved — not on the homepage yet');
      navigate('/admin/banners');
    } catch (err) {
      setSt({ busy: false, error: err, fields: err.fields || {} });
    }
  }

  return (
    <div className="sk-banner-editor">
      <form className="sk-card sk-form" onSubmit={(e) => { e.preventDefault(); save(false); }} noValidate>
        <FormError error={st.error} />
        <fieldset className="sk-fieldset">
          <legend>Kind of banner</legend>
          <div className="sk-choice-row">
            <label className="sk-choice"><input type="radio" name="kind" value="custom" checked={kind === 'custom'} onChange={() => setKind('custom')} /><span><strong>Custom</strong> — your own image or video, text and button</span></label>
            <label className="sk-choice"><input type="radio" name="kind" value="festival" checked={kind === 'festival'} onChange={() => setKind('festival')} /><span><strong>Festival / important day</strong> — a festival with its verified date and the Guru Sahib&apos;s artwork</span></label>
          </div>
          {kind === 'festival' ? (
            <>
              <Select label="Festival or important day" required value={form.observanceId} placeholder={festivals.loading ? 'Loading…' : 'Choose…'} onChange={chooseFestival} error={fe.observanceId}
                options={festivalList.map((x) => ({ value: String(x.id), label: x.card ? `${x.title} — ${festivalDateLabel(x.card.start, x.card.end)}` : `${x.title} — no upcoming verified date` }))} />
              <p className="sk-form-help">Only published festivals are listed, soonest first. The date, Nanakshahi date and picture come from the festival itself. Once its day has passed the banner hides itself — and you can unpublish or delete it any time.</p>
            </>
          ) : null}
        </fieldset>
        <fieldset className="sk-fieldset">
          <legend>Text</legend>
          <TextInput label="Title" required maxLength={120} value={form.title} onChange={set('title')} error={fe.title}
            help={kind === 'custom' ? 'Put *asterisks* around words to show them in gold, e.g. Discover the Timeless *Wisdom of Sikhism*.' : undefined} />
          {kind === 'custom' ? <TextArea label="Description (optional)" rows={3} maxLength={400} value={form.description} onChange={set('description')} error={fe.description} help="One or two short sentences." /> : null}
          {kind === 'festival' ? (
            <>
              <p className="sk-form-help" style={{ marginTop: 0 }}>The title is the big name on the banner (e.g. “Birthday of Guru Ram Das Ji” — the words up to “of” become the small line above it). Everything below is optional: leave a box empty to use the festival&apos;s own text, shown in grey.</p>
              <div className="sk-form-grid">
                <TextInput label="Top label (optional)" maxLength={60} value={form.options.eyebrow} onChange={setOpt('eyebrow')} placeholder={festival && festival.card ? (festival.card.status === 'today' ? "Today's observance" : `Coming up · in ${festival.card.daysUntil} days`) : "e.g. Today's observance"} help="The small gold line at the top." />
                <TextInput label="Small line above the name (optional)" maxLength={60} value={form.options.kicker} onChange={setOpt('kicker')} placeholder="e.g. Birthday of" />
                <TextInput label="Line under the name (optional)" maxLength={80} value={form.options.subtitle} onChange={setOpt('subtitle')} placeholder="e.g. Fourth Sikh Guru" />
                <TextInput label="Gurmukhi line (optional)" maxLength={60} value={form.options.gurmukhi} onChange={setOpt('gurmukhi')} placeholder="ਸਤਿਨਾਮ ਵਾਹਿਗੁਰੂ" lang="pa" />
              </div>
              <TextArea label="Description (optional)" rows={3} maxLength={400} value={form.description} onChange={set('description')} error={fe.description}
                placeholder={festival && festival.card ? festival.card.summary : 'One or two short sentences.'} help="Leave empty to use the festival's short description." />
            </>
          ) : null}
        </fieldset>
        {kind === 'festival' ? (<>
        <fieldset className="sk-fieldset">
          <legend>Picture (optional)</legend>
          <p className="sk-form-help" style={{ marginTop: 0 }}>Without a picture the banner shows the Guru Sahib&apos;s historical painting with Sri Harmandir Sahib. Upload only a picture you have the right to use.</p>
          <ImagePicker value={form.imageUrl ? [form.imageUrl] : []} max={1} purpose="banner" label={form.imageUrl ? 'Replace picture' : 'Upload a picture'}
            onBusy={setUploading} onChange={(urls) => setForm({ ...form, imageUrl: urls[urls.length - 1] || '' })} />
          {fe.imageUrl ? <p className="sk-form-error" role="alert">{fe.imageUrl}</p> : null}
          {form.imageUrl ? (
            <>
              <TextInput label="Describe the picture" required value={form.imageAlt} onChange={set('imageAlt')} error={fe.imageAlt} help="What it shows, for people using screen readers." />
              <button type="button" className="sk-link-btn" style={{ alignSelf: 'flex-start' }} onClick={() => setForm({ ...form, imageUrl: '', imageAlt: '' })}>Remove picture — use the painting again</button>
            </>
          ) : null}
        </fieldset>
        <fieldset className="sk-fieldset">
          <legend>Button (optional)</legend>
          <p className="sk-form-help" style={{ marginTop: 0 }}>Leave empty for “Learn about Sri Guru …”, which opens the Guru Sahib&apos;s page.</p>
          <div className="sk-form-grid">
            <TextInput label="Button text" maxLength={40} value={form.ctaLabel} onChange={set('ctaLabel')} error={fe.ctaLabel} placeholder="e.g. Learn about Guru Ram Das Ji" />
            <TextInput label="Button link" value={form.ctaUrl} onChange={set('ctaUrl')} error={fe.ctaUrl} placeholder="/gurus/guru-ram-das-ji or https://…" />
          </div>
        </fieldset>
        </>) : null}
        {kind === 'custom' ? (<>
        <fieldset className="sk-fieldset">
          <legend>Image and video</legend>
          <p className="sk-form-help" style={{ marginTop: 0 }}>Add an image, a YouTube video, or both. With both, the image is the cover shown before the video plays.</p>
          <div className="sk-form-field">
            <span className="sk-form-label">Image (optional)</span>
            <ImagePicker value={form.imageUrl ? [form.imageUrl] : []} max={1} purpose="banner" label={form.imageUrl ? 'Replace image' : 'Upload an image'}
              onBusy={setUploading} onChange={(urls) => setForm({ ...form, imageUrl: urls[urls.length - 1] || '' })} />
            <p className="sk-form-help">A wide image works best (16:9). It is resized and compressed automatically.</p>
            {fe.imageUrl ? <p className="sk-form-error" role="alert">{fe.imageUrl}</p> : null}
          </div>
          {form.imageUrl ? <TextInput label="Describe the image" required value={form.imageAlt} onChange={set('imageAlt')} error={fe.imageAlt} help="What the image shows, for people using screen readers." /> : null}
          <TextInput label="YouTube video link (optional)" type="url" inputMode="url" value={form.youtube} onChange={set('youtube')} error={fe.youtube}
            help={form.youtube && !getYouTubeVideoId(form.youtube) ? 'This doesn’t look like a YouTube video link yet.' : 'The video plays only when a visitor presses play — never automatically.'} />
        </fieldset>
        <fieldset className="sk-fieldset">
          <legend>Button (optional)</legend>
          <div className="sk-form-grid">
            <TextInput label="Button text" maxLength={40} value={form.ctaLabel} onChange={set('ctaLabel')} error={fe.ctaLabel} placeholder="e.g. Read more" />
            <TextInput label="Button link" value={form.ctaUrl} onChange={set('ctaUrl')} error={fe.ctaUrl} placeholder="/festivals or https://…" />
          </div>
        </fieldset>
        </>) : null}
        <div>
          <button type="button" className="sk-link-btn" aria-expanded={more} onClick={() => setMore((v) => !v)}>{more ? 'Hide schedule' : 'Schedule (optional): show only between two dates'}</button>
          {more ? (
            <div className="sk-form-grid mt-3">
              <TextInput label="Show from" type="date" value={form.startsAt} onChange={set('startsAt')} error={fe.startsAt} help="Leave empty to show as soon as it is published." />
              <TextInput label="Show until" type="date" value={form.endsAt} onChange={set('endsAt')} error={fe.endsAt} help="Leave empty to keep showing it." />
            </div>
          ) : null}
        </div>
        <div className="sk-admin-actions">
          <Link className="sk-btn" to="/admin/banners">Cancel</Link>
          <span className="sk-admin-actions-gap" />
          <button type="submit" className="sk-btn" disabled={st.busy || uploading}>{banner && banner.status === 'published' ? 'Save changes' : 'Save draft'}</button>
          {!banner || banner.status !== 'published' ? <button type="button" className="sk-btn sk-btn-gold" disabled={st.busy || uploading} onClick={() => save(true)}>{st.busy ? 'Saving…' : 'Save & publish'}</button> : null}
        </div>
      </form>
      <aside className="sk-card sk-banner-preview-card" aria-labelledby="preview-h">
        <h3 className="sk-card-title" id="preview-h">Preview</h3>
        <p className="sk-card-meta">How it will look on the homepage{banner ? <> · now <Pill value={banner.state} /></> : null}</p>
        <div className="mt-3">{kind === 'festival' && !festival ? <p className="sk-card-meta">Choose a festival to see the preview.</p> : <Preview form={form} festival={festival} />}</div>
      </aside>
    </div>
  );
}

export default function BannerEditor() {
  const { id } = useParams();
  usePageMeta(id ? 'Edit banner — Sikhify Admin' : 'New banner — Sikhify Admin', undefined, { noindex: true });
  const state = useAsync(() => (id ? adminService.banner(id) : Promise.resolve(null)), [id]);
  return (
    <>
      <AdminHeader title={id ? 'Edit banner' : 'New banner'} sub="Shown near the top of the homepage once published." actions={<Link className="sk-btn" to="/admin/banners">All banners</Link>} />
      <AsyncView state={state}>{(b) => <Editor key={id || 'new'} banner={b} />}</AsyncView>
    </>
  );
}
