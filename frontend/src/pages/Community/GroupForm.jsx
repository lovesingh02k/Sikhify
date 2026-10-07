/* Create a group, or edit one (group admins). Deleting a group is here too, behind a confirmation. */
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import CommunityLayout from '../../components/community/CommunityLayout.jsx';
import ImagePicker from '../../components/community/ImagePicker.jsx';
import { TextInput, TextArea, Select, FormError } from '../../components/ui/Form.jsx';
import { ConfirmDialog } from '../../components/ui/Dialog.jsx';
import { Loading, ErrorState } from '../../components/ui/States.jsx';
import { useReactPage } from '../../hooks/useReactPage.js';
import { groupService } from '../../services/community/index.js';
import { GROUP_CATEGORIES, LIMITS } from '../../../../shared/community.js';
import { toast } from '../../utils/format.js';

const EMPTY = { name: '', description: '', about: '', category: '', privacy: 'public', location: '', coverUrl: '' };

export default function GroupForm({ edit = false }) {
  const { slug } = useParams();
  const navigate = useNavigate();
  useReactPage(edit ? 'Group settings — Sikhify.in' : 'Create a group — Sikhify.in', 'Start a Sikhify community group.', { noindex: true });
  const [form, setForm] = useState(EMPTY);
  const [group, setGroup] = useState(null);
  const [loadState, setLoadState] = useState({ loading: edit, error: null });
  const [fields, setFields] = useState({});
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(false);

  useEffect(() => {
    if (!edit) return;
    groupService.get(slug).then((g) => {
      setGroup(g);
      setForm({ name: g.name, description: g.description, about: g.about, category: g.category, privacy: g.privacy, location: g.location, coverUrl: g.coverUrl });
      setLoadState({ loading: false, error: null });
    }).catch((err) => setLoadState({ loading: false, error: err }));
  }, [edit, slug]);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setFields({});
    try {
      const g = edit ? await groupService.update(group.id, form) : await groupService.create(form);
      toast(edit ? 'Group updated' : 'Group created — you are its admin');
      navigate(`/community/groups/${g.slug}`);
    } catch (err) {
      setError(err);
      setFields(err.fields || {});
    } finally {
      setBusy(false);
    }
  }

  if (loadState.loading) return <CommunityLayout title="Group settings"><Loading rows={2} /></CommunityLayout>;
  if (loadState.error) return <CommunityLayout title="Group settings"><ErrorState error={loadState.error} /></CommunityLayout>;
  if (edit && group && !group.viewer.canManage) return <CommunityLayout title="Group settings"><ErrorState error={{ kind: 'forbidden', message: 'Only this group’s admins can change its settings.' }} /></CommunityLayout>;

  return (
    <CommunityLayout title={edit ? `${group.name} — settings` : 'Create a group'}
      crumbs={[{ label: 'Community', to: '/community' }, { label: 'Groups', to: '/community/groups' }, ...(edit ? [{ label: group.name, to: `/community/groups/${group.slug}` }] : []), { label: edit ? 'Settings' : 'New group' }]}
      sub={edit ? 'Only group admins can change these settings.' : 'You will be the group’s admin. You can make others admins or moderators later.'}>
      <form className="sk-card sk-form" onSubmit={submit} noValidate>
        <FormError error={error} />
        <div className="sk-form-grid">
          <TextInput className="sk-span-2" label="Group name" required maxLength={LIMITS.groupName} value={form.name} onChange={set('name')} error={fields.name} />
          <TextArea className="sk-span-2" label="Short description" required rows={2} maxLength={LIMITS.groupDescription} value={form.description} onChange={set('description')} error={fields.description} help="Shown on group cards." />
          <Select label="Category" required value={form.category} placeholder="Choose…" options={GROUP_CATEGORIES} onChange={set('category')} error={fields.category} />
          <Select label="Privacy" required value={form.privacy} onChange={set('privacy')} error={fields.privacy}
            options={[{ value: 'public', label: 'Public — anyone can see posts and join' }, { value: 'private', label: 'Private — members only; admins approve requests' }]} />
          <TextInput label="Location (optional)" value={form.location} onChange={set('location')} help="e.g. Brampton, Ontario — for local Sangat groups." />
          <div className="sk-form-field">
            <span className="sk-form-label">Cover image (optional)</span>
            <ImagePicker value={form.coverUrl ? [form.coverUrl] : []} max={1} purpose="group-cover" label="Upload cover image" onChange={(urls) => setForm({ ...form, coverUrl: urls[0] || '' })} />
            {fields.coverUrl ? <p className="sk-form-error">{fields.coverUrl}</p> : null}
          </div>
          <TextArea className="sk-span-2" label="About (optional)" rows={5} maxLength={LIMITS.groupAbout} value={form.about} onChange={set('about')} help="What the group is for, guidelines, meeting times…" />
        </div>
        <div className="sk-form-actions">
          <button type="submit" className="sk-btn sk-btn-gold" disabled={busy}>{busy ? 'Saving…' : edit ? 'Save changes' : 'Create group'}</button>
          <button type="button" className="sk-btn" onClick={() => navigate(-1)}>Cancel</button>
          {edit && group.viewer.canDelete ? <button type="button" className="sk-btn sk-btn-danger" style={{ marginLeft: 'auto' }} onClick={() => setConfirm(true)}>Delete group</button> : null}
        </div>
      </form>
      {edit ? (
        <ConfirmDialog open={confirm} danger title={`Delete ${group.name}?`} confirmLabel="Delete group" busy={busy}
          message="The group, all of its posts and comments, and its member list will be deleted permanently."
          onCancel={() => setConfirm(false)}
          onConfirm={() => { setBusy(true); groupService.remove(group.id).then(() => { toast('Group deleted'); navigate('/community/groups'); }).catch((err) => { toast(err.message, 'error'); setBusy(false); setConfirm(false); }); }} />
      ) : null}
    </CommunityLayout>
  );
}
