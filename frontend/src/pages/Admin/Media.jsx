/* Media management: artists (Kirtaniye, Hazoori Ragis, Katha Vachaks, Dhadi…) and their YouTube videos. */
import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AdminHeader, Pill } from '../../components/admin/AdminKit.jsx';
import Dialog, { ConfirmDialog } from '../../components/ui/Dialog.jsx';
import Icon from '../../components/ui/Icon.jsx';
import { TextInput, TextArea, Select, FormError } from '../../components/ui/Form.jsx';
import { AsyncView, Empty } from '../../components/ui/States.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useAsync } from '../../hooks/useAsync.js';
import { usePageMeta } from '../../hooks/usePageMeta.js';
import { adminService } from '../../services/admin/adminService.js';
import { getYouTubeVideoId, youTubeThumbnail } from '../../../../shared/youtube.js';
import { toast } from '../../utils/format.js';

const STATUS_OPTIONS = [{ value: 'published', label: 'Published' }, { value: 'draft', label: 'Draft' }, { value: 'archived', label: 'Archived' }];
const linksText = (l) => (l || []).map((x) => (x.label && x.label !== x.url ? `${x.label} | ${x.url}` : x.url)).join('\n');

function ArtistForm({ artist, categories, onSaved, onCancel }) {
  const [f, setF] = useState(() => (artist ? {
    name: artist.name, sortName: artist.sortName, category: artist.category, location: artist.location || '', description: artist.description,
    keywords: artist.keywords.join(', '), style: artist.style || '', officialLinks: linksText(artist.officialLinks), references: linksText(artist.references), status: artist.status,
  } : { name: '', sortName: '', category: '', location: '', description: '', keywords: '', style: '', officialLinks: '', references: '', status: 'draft' }));
  const [s, setS] = useState({ busy: false, error: null, fields: {} });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  async function save(e) {
    e.preventDefault();
    setS({ busy: true, error: null, fields: {} });
    try {
      const out = artist ? await adminService.updateArtist(artist.id, f) : await adminService.createArtist(f);
      toast('Artist saved');
      onSaved(out);
    } catch (err) { setS({ busy: false, error: err, fields: err.fields || {} }); }
  }
  return (
    <form className="sk-form" onSubmit={save} noValidate>
      <FormError error={s.error} />
      <div className="sk-form-grid">
        <TextInput label="Name" required value={f.name} onChange={set('name')} error={s.fields.name} help="As commonly written, e.g. Bhai Harjinder Singh (Srinagar Wale)." />
        <TextInput label="Sort name" value={f.sortName} onChange={set('sortName')} help="Used for A–Z (titles like Bhai/Giani dropped). Filled automatically if empty." />
        <Select label="Category" required value={f.category} placeholder="Choose…" options={categories} onChange={set('category')} error={s.fields.category} />
        <TextInput label="Based in" value={f.location} onChange={set('location')} />
        <TextArea className="sk-span-2" label="Description" required rows={3} value={f.description} onChange={set('description')} error={s.fields.description} help="Short and factual." />
        <TextInput label="Style" value={f.style} onChange={set('style')} help="e.g. Puratan Reet, Raag-based Kirtan." />
        <TextInput label="Search keywords" value={f.keywords} onChange={set('keywords')} help="Comma-separated." />
        <TextArea label="Official links" rows={2} value={f.officialLinks} onChange={set('officialLinks')} error={s.fields.officialLinks} help="Label | https://… one per line." />
        <TextArea label="References" rows={2} value={f.references} onChange={set('references')} error={s.fields.references} help="Label | https://… one per line." />
        <Select label="Status" value={f.status} options={STATUS_OPTIONS} onChange={set('status')} help="Only published artists with published videos appear on the site." />
      </div>
      <div className="flex justify-end gap-2">
        <button type="button" className="sk-btn" onClick={onCancel}>Cancel</button>
        <button type="submit" className="sk-btn sk-btn-gold" disabled={s.busy}>{s.busy ? 'Saving…' : 'Save artist'}</button>
      </div>
    </form>
  );
}

function VideoForm({ artist, video, onSaved, onCancel }) {
  const [f, setF] = useState(video ? { url: `https://youtu.be/${video.id}`, title: video.title, channel: video.channel, description: video.description || '', status: video.status } : { url: '', title: '', channel: '', description: '', status: 'published' });
  const [s, setS] = useState({ busy: false, error: null, fields: {}, lookup: '' });
  const id = getYouTubeVideoId(f.url);
  const lookup = () => {
    setS({ ...s, busy: true, lookup: '' });
    adminService.lookupYouTube(f.url).then((r) => {
      if (r.embeddable) setF((x) => ({ ...x, title: x.title || r.title, channel: x.channel || r.channel }));
      setS((x) => ({ ...x, busy: false, lookup: r.embeddable ? `Found on YouTube: “${r.title}” by ${r.channel}` : r.message }));
    }).catch((err) => setS((x) => ({ ...x, busy: false, lookup: err.message })));
  };
  async function save(e) {
    e.preventDefault();
    setS({ ...s, busy: true, error: null, fields: {} });
    try {
      const out = video ? await adminService.updateVideo(video.id, { title: f.title, channel: f.channel, description: f.description, status: f.status }) : await adminService.addVideo(artist.id, f);
      toast('Video saved');
      onSaved(out);
    } catch (err) { setS({ ...s, busy: false, error: err, fields: err.fields || {} }); }
  }
  return (
    <form className="sk-form" onSubmit={save} noValidate>
      <FormError error={s.error} />
      <div className="flex items-end gap-2">
        <TextInput className="flex-1" label="YouTube link" required value={f.url} disabled={!!video} onChange={(e) => setF({ ...f, url: e.target.value })} error={s.fields.url || (f.url && !id ? 'Not a recognised YouTube link' : undefined)}
          help={video ? 'To change the video, delete it and add the new link.' : 'watch?v=…, youtu.be/…, embed/… or shorts/… links all work.'} />
        {!video ? <button type="button" className="sk-btn" disabled={!id || s.busy} onClick={lookup}>Look up</button> : null}
      </div>
      {s.lookup ? <p className="sk-form-help" role="status">{s.lookup}</p> : null}
      {id ? <img src={youTubeThumbnail(id, 'mqdefault')} alt="" width="240" height="135" style={{ borderRadius: 10 }} /> : null}
      <div className="sk-form-grid">
        <TextInput className="sk-span-2" label="Title" required value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} error={s.fields.title} help="The published title (lightly shortened if needed)." />
        <TextInput label="YouTube channel" value={f.channel} onChange={(e) => setF({ ...f, channel: e.target.value })} />
        <Select label="Status" value={f.status} options={STATUS_OPTIONS} onChange={(e) => setF({ ...f, status: e.target.value })} />
        <TextArea className="sk-span-2" label="Description (optional)" rows={3} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} help="Shown under the player. Don't paste YouTube descriptions you haven't checked." />
      </div>
      <div className="flex justify-end gap-2">
        <button type="button" className="sk-btn" onClick={onCancel}>Cancel</button>
        <button type="submit" className="sk-btn sk-btn-gold" disabled={s.busy || (!video && !id)}>{s.busy ? 'Saving…' : 'Save video'}</button>
      </div>
    </form>
  );
}

export default function Media() {
  usePageMeta('Media — Sikhify Admin', undefined, { noindex: true });
  const { can } = useAuth();
  const [params, setParams] = useSearchParams();
  const state = useAsync(() => adminService.media(), []);
  const [q, setQ] = useState('');
  const [dialog, setDialog] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [newCat, setNewCat] = useState('');
  const selectedId = params.get('artist');

  const artists = useMemo(() => (state.data ? state.data.artists.filter((a) => !q || `${a.name} ${a.category} ${a.location || ''}`.toLowerCase().includes(q.toLowerCase())) : []), [state.data, q]);
  const selected = state.data && state.data.artists.find((a) => a.id === selectedId);
  useEffect(() => { if (selected) document.getElementById('artist-detail')?.scrollIntoView({ block: 'start' }); }, [selectedId]); // eslint-disable-line react-hooks/exhaustive-deps

  const done = () => { setDialog(null); state.reload(); };
  const remove = () => {
    const p = confirm.kind === 'video' ? adminService.deleteVideo(confirm.item.id) : adminService.deleteArtist(confirm.item.id);
    p.then(() => { toast('Deleted'); setConfirm(null); if (confirm.kind === 'artist') setParams({}); state.reload(); }).catch((err) => toast(err.message, 'error'));
  };

  return (
    <>
      <AdminHeader title="Media" sub="Artists and their YouTube videos. Videos play inside Sikhify; only published artists with published videos are shown."
        actions={<><a className="sk-btn" href="/sikh-media" target="_blank" rel="noopener noreferrer">View Media ↗</a><button type="button" className="sk-btn sk-btn-gold" onClick={() => setDialog({ kind: 'artist' })}><Icon name="plus" size={16} />New artist</button></>} />
      <AsyncView state={state}>
        {(cat) => (
          <>
            <div className="sk-filters">
              <TextInput label="Find an artist" value={q} onChange={(e) => setQ(e.target.value)} />
              <form className="flex items-end gap-2" onSubmit={(e) => { e.preventDefault(); adminService.addCategory(newCat).then(() => { setNewCat(''); toast('Category added'); state.reload(); }).catch((err) => toast(err.message, 'error')); }}>
                <TextInput label="Add a category" value={newCat} onChange={(e) => setNewCat(e.target.value)} help={`Current: ${cat.categories.join(', ')}`} />
                <button type="submit" className="sk-btn" disabled={newCat.trim().length < 2}>Add</button>
              </form>
            </div>
            {selected ? (
              <section id="artist-detail" className="sk-card" aria-labelledby="artist-name">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="flex gap-2"><span className="sk-badge">{selected.category}</span><Pill value={selected.status} /></p>
                    <h3 className="sk-card-title mt-2" id="artist-name">{selected.name}</h3>
                    <p className="sk-card-text">{selected.description}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" className="sk-btn sk-btn-sm" onClick={() => setDialog({ kind: 'artist', item: selected })}><Icon name="edit" size={14} />Edit artist</button>
                    <button type="button" className="sk-btn sk-btn-sm sk-btn-gold" onClick={() => setDialog({ kind: 'video', artist: selected })}><Icon name="plus" size={14} />Add video</button>
                    {can('content.delete') ? <button type="button" className="sk-btn sk-btn-sm sk-btn-danger" onClick={() => setConfirm({ kind: 'artist', item: selected })}>Delete artist</button> : null}
                    <button type="button" className="sk-btn sk-btn-sm" onClick={() => setParams({})}>Close</button>
                  </div>
                </div>
                {selected.videos.length ? (
                  <div className="sk-table-wrap mt-4">
                    <table className="sk-table">
                      <thead><tr><th scope="col">Video</th><th scope="col">Channel</th><th scope="col">Status</th><th scope="col"><span className="sr-only">Actions</span></th></tr></thead>
                      <tbody>
                        {selected.videos.map((v) => (
                          <tr key={v.id}>
                            <td><div className="flex items-center gap-3"><img src={youTubeThumbnail(v.id, 'default')} alt="" width="80" height="60" style={{ borderRadius: 6 }} /><span>{v.title}<span className="sk-card-meta block">{v.id}</span></span></div></td>
                            <td>{v.channel}</td>
                            <td><Pill value={v.status} /></td>
                            <td><div className="flex flex-wrap gap-1">
                              {v.status === 'published' ? <Link className="sk-btn sk-btn-sm" to={`/media/${v.id}`} target="_blank">Play ↗</Link> : null}
                              <button type="button" className="sk-btn sk-btn-sm" onClick={() => setDialog({ kind: 'video', artist: selected, item: v })}>Edit</button>
                              <button type="button" className="sk-btn sk-btn-sm sk-btn-danger" onClick={() => setConfirm({ kind: 'video', item: v })}>Delete</button>
                            </div></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : <Empty icon="youtube" title="No videos yet" text="Add the artist's official or public YouTube videos." />}
              </section>
            ) : null}
            <div className="sk-table-wrap">
              <table className="sk-table">
                <thead><tr><th scope="col">Artist</th><th scope="col">Category</th><th scope="col">Videos</th><th scope="col">Status</th><th scope="col"><span className="sr-only">Actions</span></th></tr></thead>
                <tbody>
                  {artists.map((a) => (
                    <tr key={a.id} aria-current={a.id === selectedId ? 'true' : undefined}>
                      <td>{a.name}{a.location ? <span className="sk-card-meta block">{a.location}</span> : null}</td>
                      <td>{a.category}</td>
                      <td>{a.videos.filter((v) => v.status === 'published').length} published{a.videos.some((v) => v.status !== 'published') ? ` · ${a.videos.filter((v) => v.status !== 'published').length} other` : ''}</td>
                      <td><Pill value={a.status} /></td>
                      <td><button type="button" className="sk-btn sk-btn-sm" onClick={() => setParams({ artist: a.id })}>Manage</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!artists.length ? <Empty icon="search" title="No artists match" /> : null}
            <Dialog open={!!dialog} onClose={() => setDialog(null)} wide title={dialog ? (dialog.kind === 'artist' ? (dialog.item ? `Edit ${dialog.item.name}` : 'New artist') : (dialog.item ? 'Edit video' : `Add a video for ${dialog.artist.name}`)) : ''}>
              {dialog && dialog.kind === 'artist' ? <ArtistForm artist={dialog.item} categories={cat.categories} onCancel={() => setDialog(null)} onSaved={(a) => { done(); setParams({ artist: a.id }); }} /> : null}
              {dialog && dialog.kind === 'video' ? <VideoForm artist={dialog.artist} video={dialog.item} onCancel={() => setDialog(null)} onSaved={done} /> : null}
            </Dialog>
            <ConfirmDialog open={!!confirm} danger confirmLabel="Delete"
              title={confirm ? `Delete ${confirm.kind === 'video' ? 'this video' : confirm.item.name}?` : ''}
              message={confirm && confirm.kind === 'artist' ? 'The artist and all of their videos are removed from Sikhify. Prefer Archived if unsure.' : 'The video is removed from Sikhify (it stays on YouTube).'}
              onCancel={() => setConfirm(null)} onConfirm={remove} />
          </>
        )}
      </AsyncView>
    </>
  );
}
