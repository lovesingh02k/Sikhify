/* ==========================================================================
   /admin/blog/new and /admin/blog/:id — write a blog post.
   A plain writing screen instead of the generic directory form: title, cover
   image, the article (with "Insert image" and "Heading" buttons and a live
   preview), and a side panel for category, date, author and tags. Saves as a
   `blog` entry through the same admin entries API as every directory record.
   Blog posts are Sikhify's own articles, so the source defaults to "Sikhify".
   ========================================================================== */
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AdminHeader, Pill } from '../../components/admin/AdminKit.jsx';
import ImagePicker from '../../components/community/ImagePicker.jsx';
import ArticleBody from '../../components/directory/ArticleBody.jsx';
import { ConfirmDialog } from '../../components/ui/Dialog.jsx';
import Icon from '../../components/ui/Icon.jsx';
import { Select, TextInput, TextArea, FormError } from '../../components/ui/Form.jsx';
import { Loading, ErrorState } from '../../components/ui/States.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { usePageMeta } from '../../hooks/usePageMeta.js';
import { adminService } from '../../services/admin/adminService.js';
import { uploadService } from '../../services/community/index.js';
import { CONTENT_TYPES, UPLOAD_PATH_RE } from '../../../../shared/contentTypes.js';
import { formatDateTime, toast } from '../../utils/format.js';

const BLOG = CONTENT_TYPES.blog;
const CATEGORIES = BLOG.fields.find((f) => f.name === 'category').options;
const today = () => new Date().toISOString().slice(0, 10);
const wordsIn = (text) => (String(text || '').replace(/!\[[^\]]*\]\([^)]*\)/g, ' ').match(/\S+/g) || []).length;
const readingMinutes = (text) => Math.max(1, Math.round(wordsIn(text) / 200));
const linksToText = (refs) => (refs || []).map((r) => (r.label && r.label !== r.url ? `${r.label} | ${r.url}` : r.url)).join('\n');

const EMPTY = {
  title: '', summary: '', body: '', image_url: '', image_credit: '',
  category: CATEGORIES[0], published_date: today(), author: '', reading_time: '', tags: '', videos: '',
  source: 'Sikhify', references: '',
};

export default function BlogEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, can } = useAuth();
  const [entry, setEntry] = useState(null);
  const [form, setForm] = useState(() => ({ ...EMPTY, author: (user && user.name) || '' }));
  const [load, setLoad] = useState({ loading: !!id, error: null });
  const [state, setState] = useState({ busy: false, error: null, fields: {} });
  const [tab, setTab] = useState('write');
  const [uploading, setUploading] = useState(false);
  const [coverBusy, setCoverBusy] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const bodyRef = useRef(null);
  const fileRef = useRef(null);
  usePageMeta(`${id ? 'Edit' : 'New'} blog post — Sikhify Admin`, undefined, { noindex: true });
  // The signed-in name can arrive after the first render: fill an empty author on a new post then.
  useEffect(() => {
    if (!id && user && user.name) setForm((f) => (f.author ? f : { ...f, author: user.name }));
  }, [id, user]);

  useEffect(() => {
    if (!id) return;
    adminService.entry(id).then((e) => {
      if (e.type !== 'blog') { navigate(`/admin/content/${e.id}`, { replace: true }); return; }
      const f = e.fields || {};
      setEntry(e);
      setForm({
        title: e.title, summary: e.summary || '', body: e.body || '', image_url: e.imageUrl || '', image_credit: f.image_credit || '',
        category: f.category || CATEGORIES[0], published_date: f.published_date || today(), author: f.author || '',
        reading_time: f.reading_time ? String(f.reading_time) : '', tags: (f.tags || []).join(', '),
        videos: (f.videos || []).map((v) => `https://youtu.be/${v}`).join('\n'),
        source: e.verification.source || '', references: linksToText(e.verification.references),
      });
      setLoad({ loading: false, error: null });
    }).catch((error) => setLoad({ loading: false, error }));
  }, [id, navigate]);

  const set = (name) => (e) => setForm((f) => ({ ...f, [name]: e.target.value }));
  const fe = state.fields;

  /** Puts `text` at the cursor in the article box and selects `select` inside it (so it can be typed over). */
  // Where to put the cursor once an insert has re-rendered the article box.
  const pendingSelection = useRef(null);
  useEffect(() => {
    const sel = pendingSelection.current;
    const el = bodyRef.current;
    if (!sel || !el) return;
    pendingSelection.current = null;
    el.focus();
    el.setSelectionRange(sel[0], sel[1]);
  }, [form.body, tab]);

  /**
   * Puts `text` at the cursor in the article box (on its own lines) and selects `select` inside it,
   * so it can be typed over. Works on the latest text, so typing during an upload is kept.
   */
  function insertAtCursor(text, select) {
    const el = bodyRef.current;
    const caret = el ? [el.selectionStart, el.selectionEnd] : null;
    setForm((f) => {
      const body = f.body;
      const start = caret ? Math.min(caret[0], body.length) : body.length;
      const end = caret ? Math.min(caret[1], body.length) : body.length;
      const before = body.slice(0, start);
      const lead = before && !before.endsWith('\n\n') ? (before.endsWith('\n') ? '\n' : '\n\n') : '';
      const chunk = lead + text + '\n\n';
      const at = select ? text.indexOf(select) : -1;
      pendingSelection.current = at >= 0
        ? [start + lead.length + at, start + lead.length + at + select.length]
        : [start + chunk.length, start + chunk.length];
      return { ...f, body: before + chunk + body.slice(end) };
    });
    setTab('write');
  }

  async function insertImages(e) {
    const files = [...e.target.files];
    e.target.value = '';
    if (!files.length) return;
    setUploading(true);
    const urls = [];
    for (const file of files) {
      try { urls.push(await uploadService.image(file, 'blog')); } catch (err) { toast(err.message || 'Upload failed', 'error'); }
    }
    // All images go in together, each on its own line, so none is lost.
    if (urls.length) {
      insertAtCursor(urls.map((url) => `![Image caption](${url})`).join('\n\n'), 'Image caption');
      toast(urls.length > 1 ? `${urls.length} images added — type their captions` : 'Image added — type its caption');
    }
    setUploading(false);
  }

  async function save(publishStatus) {
    setState({ busy: true, error: null, fields: {} });
    try {
      const payload = {
        type: 'blog',
        title: form.title, summary: form.summary, body: form.body, image_url: form.image_url, image_credit: form.image_credit,
        category: form.category, published_date: form.published_date, author: form.author,
        reading_time: form.reading_time || (form.body.trim() ? String(readingMinutes(form.body)) : ''),
        tags: form.tags.split(/[,\n]/).map((s) => s.trim()).filter(Boolean).join('\n'),
        videos: form.videos,
        source: form.source.trim() || 'Sikhify', references: form.references,
        publishStatus, verificationStatus: 'verified',
      };
      const saved = id ? await adminService.updateEntry(id, payload) : await adminService.createEntry(payload);
      setEntry(saved);
      setState({ busy: false, error: null, fields: {} });
      toast(publishStatus === 'published' ? 'Published' : publishStatus === 'archived' ? 'Unpublished' : 'Draft saved');
      if (!id) navigate(`/admin/blog/${saved.id}`, { replace: true });
    } catch (err) {
      setState({ busy: false, error: err, fields: err.fields || {} });
      toast(err.message || 'Could not save', 'error');
    }
  }

  if (load.loading) return <Loading rows={2} />;
  if (load.error) return <ErrorState error={load.error} />;
  const published = entry && entry.publishStatus === 'published';
  const words = wordsIn(form.body);

  return (
    <>
      <AdminHeader title={entry ? entry.title : 'New blog post'}
        sub={entry ? <>Blog post · <Pill value={entry.publishStatus} /> · updated {formatDateTime(entry.verification.updatedAt)}{entry.updatedBy ? ` by ${entry.updatedBy}` : ''}</> : 'Write the article, add a cover image, then save a draft or publish it.'}
        actions={<>
          {entry ? <Link className="sk-btn" to={entry.url} target="_blank"><Icon name="eye" size={15} />{published ? 'View post' : 'Preview'} ↗</Link> : null}
          <Link className="sk-btn" to="/admin/blog">All posts</Link>
        </>} />

      <form className="sk-blog-editor" onSubmit={(e) => { e.preventDefault(); if (!uploading && !coverBusy) save(published ? 'published' : 'draft'); }} noValidate>
        <div className="sk-blog-main sk-stack">
          <FormError error={state.error} />
          <section className="sk-card sk-step">
            <TextInput label="Title" required value={form.title} onChange={set('title')} error={fe.title} maxLength={200} placeholder="e.g. What Vaisakhi means to Sikhs" />
            <TextArea className="mt-4" label="Short summary" rows={2} value={form.summary} onChange={set('summary')} error={fe.summary} maxLength={600}
              help="One or two sentences. Shown on the blog list and under the title." />
          </section>

          <section className="sk-card sk-step" aria-labelledby="cover-h">
            <header className="sk-step-head"><Icon name="image" size={18} /><div><h3 className="sk-step-title" id="cover-h">Cover image</h3><p className="sk-step-hint">Shown at the top of the post and on its card. Wide images (landscape) look best.</p></div></header>
            <ImagePicker value={UPLOAD_PATH_RE.test(form.image_url) ? [form.image_url] : []} max={1} purpose="blog" label="Upload cover image" onBusy={setCoverBusy}
              onChange={(urls) => setForm((f) => ({ ...f, image_url: urls[0] || '' }))} />
            <details className="sk-step-more mt-3" open={!!(form.image_url && !UPLOAD_PATH_RE.test(form.image_url)) || undefined}>
              <summary>Use an image link instead</summary>
              <TextInput className="mt-3" label="Image link" type="url" value={UPLOAD_PATH_RE.test(form.image_url) ? '' : form.image_url} onChange={set('image_url')} error={fe.image_url} placeholder="https://…" />
            </details>
            <TextInput className="mt-3" label="Image credit (optional)" value={form.image_credit} onChange={set('image_credit')} error={fe.image_credit} maxLength={300}
              help="Who took or made the image, if it isn't your own." />
          </section>

          <section className="sk-card sk-step" aria-labelledby="article-h">
            <header className="sk-step-head"><Icon name="edit" size={18} /><div><h3 className="sk-step-title" id="article-h">Article <span aria-hidden="true">*</span></h3><p className="sk-step-hint">Leave an empty line between paragraphs. Use the buttons to add headings and images anywhere in the text.</p></div></header>
            <div className="sk-blog-toolbar" role="toolbar" aria-label="Article tools">
              <div className="sk-blog-tabs" role="tablist">
                <button type="button" role="tab" aria-selected={tab === 'write'} onClick={() => setTab('write')}><Icon name="edit" size={14} />Write</button>
                <button type="button" role="tab" aria-selected={tab === 'preview'} onClick={() => setTab('preview')}><Icon name="eye" size={14} />Preview</button>
              </div>
              <div className="sk-blog-tools">
                <button type="button" className="sk-btn sk-btn-sm" onClick={() => insertAtCursor('## Section heading', 'Section heading')}><b aria-hidden="true">H</b>Heading</button>
                <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" multiple className="sr-only" onChange={insertImages} tabIndex={-1} />
                <button type="button" className="sk-btn sk-btn-sm sk-btn-gold" disabled={uploading} onClick={() => fileRef.current?.click()}>
                  {uploading ? <span className="sk-spinner" aria-hidden="true" /> : <Icon name="image" size={14} />}{uploading ? 'Uploading…' : 'Insert image'}
                </button>
              </div>
            </div>
            {tab === 'write' ? (
              <TextArea label="Article text" className="sk-blog-body" rows={18} value={form.body} onChange={set('body')} error={fe.body} maxLength={20000}
                ref={bodyRef} placeholder={'Start writing here…\n\n## A heading looks like this\n\nImages you insert appear as a line like ![caption](/uploads/…) — change the caption text, keep the rest.'} />
            ) : (
              <div className="sk-blog-preview" aria-live="polite">
                {form.title ? <h2 className="sk-section-title">{form.title}</h2> : null}
                {form.body.trim() ? <ArticleBody text={form.body} /> : <p className="sk-muted">Nothing to preview yet — write something first.</p>}
              </div>
            )}
            <p className="sk-card-meta">{words} words · about {words ? readingMinutes(form.body) : 0} min read · {form.body.length.toLocaleString('en-IN')} / 20,000 characters</p>
          </section>
        </div>

        <aside className="sk-blog-side sk-stack">
          <section className="sk-card sk-step sk-blog-publish">
            <h3 className="sk-step-title">{published ? 'This post is live' : entry ? 'Draft' : 'Not saved yet'}</h3>
            <p className="sk-step-hint">{uploading || coverBusy ? 'Wait for the image upload to finish…' : published ? 'Changes go live when you click Update.' : 'Only staff can see drafts. Publish when it is ready.'}</p>
            <div className="sk-stack mt-3" style={{ gap: '0.5rem' }}>
              {published ? (
                <>
                  <button type="button" className="sk-btn sk-btn-gold w-full" disabled={state.busy || uploading || coverBusy} onClick={() => save('published')}>{state.busy ? 'Saving…' : 'Update post'}</button>
                  <button type="button" className="sk-btn w-full" disabled={state.busy || uploading || coverBusy} onClick={() => save('draft')}>Unpublish (back to draft)</button>
                </>
              ) : (
                <>
                  <button type="button" className="sk-btn sk-btn-gold w-full" disabled={state.busy || uploading || coverBusy} onClick={() => save('published')}>{state.busy ? 'Saving…' : 'Publish'}</button>
                  <button type="button" className="sk-btn w-full" disabled={state.busy || uploading || coverBusy} onClick={() => save('draft')}>Save draft</button>
                </>
              )}
            </div>
          </section>

          <section className="sk-card sk-step sk-stack" aria-label="Post details" style={{ gap: '0.9rem' }}>
            <Select label="Category" required value={form.category} options={CATEGORIES} onChange={set('category')} error={fe.category} />
            <TextInput label="Publish date" required type="date" value={form.published_date} onChange={set('published_date')} error={fe.published_date} />
            <TextInput label="Author" required value={form.author} onChange={set('author')} error={fe.author} maxLength={200} />
            <TextInput label="Tags" value={form.tags} onChange={set('tags')} error={fe.tags} placeholder="Vaisakhi, Khalsa, history" help="Separate tags with commas." />
            <TextInput label="Reading time (minutes)" type="number" min="1" value={form.reading_time} onChange={set('reading_time')} error={fe.reading_time}
              placeholder={words ? String(readingMinutes(form.body)) : 'Automatic'} help="Leave empty to work it out from the length." />
          </section>

          <details className="sk-card sk-step sk-step-more">
            <summary>More options — videos &amp; sources</summary>
            <div className="sk-stack mt-3" style={{ gap: '0.9rem' }}>
              <TextArea label="YouTube videos" rows={3} value={form.videos} onChange={set('videos')} error={fe.videos} help="One YouTube link per line. They play below the article." />
              <TextInput label="Source" value={form.source} onChange={set('source')} error={fe.source} help="Who the article is from. Defaults to Sikhify." />
              <TextArea label="References" rows={3} value={form.references} onChange={set('references')} error={fe.references} help="Books or sites the article cites. One per line: Label | https://…" />
            </div>
          </details>

          {entry && can('content.delete') ? (
            <button type="button" className="sk-btn sk-btn-danger sk-btn-sm" onClick={() => setConfirm(true)}><Icon name="trash" size={14} />Delete post</button>
          ) : null}
        </aside>
      </form>

      <ConfirmDialog open={confirm} danger title="Delete this blog post permanently?" confirmLabel="Delete" message="Prefer “Unpublish” if you might want it again. Deleting cannot be undone."
        onCancel={() => setConfirm(false)} onConfirm={() => adminService.deleteEntry(id).then(() => { toast('Deleted'); navigate('/admin/blog'); }).catch((err) => toast(err.message, 'error'))} />
    </>
  );
}
