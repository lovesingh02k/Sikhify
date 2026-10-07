import { useState } from 'react';
import Dialog from '../ui/Dialog.jsx';
import { Select, TextArea, FormError } from '../ui/Form.jsx';
import { reportService } from '../../services/community/index.js';
import { REPORT_REASONS } from '../../../../shared/community.js';
import { toast } from '../../utils/format.js';

/** Report a post, comment, member or group to the moderators. */
export default function ReportDialog({ open, onClose, targetType, targetId, label }) {
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [state, setState] = useState({ busy: false, error: null, fields: {} });

  async function submit(e) {
    e.preventDefault();
    setState({ busy: true, error: null, fields: {} });
    try {
      const res = await reportService.create(targetType, targetId, reason, details);
      toast(res.message || 'Report sent');
      setReason('');
      setDetails('');
      setState({ busy: false, error: null, fields: {} });
      onClose();
    } catch (err) {
      setState({ busy: false, error: err, fields: err.fields || {} });
    }
  }

  return (
    <Dialog open={open} onClose={onClose} title={`Report ${label || targetType}`}>
      <form className="sk-form" onSubmit={submit} noValidate>
        <p>Reports are private. A moderator will review this {targetType} against the community guidelines.</p>
        <FormError error={state.error && !state.error.fields ? state.error : null} />
        <Select label="Reason" required value={reason} placeholder="Choose a reason…" options={REPORT_REASONS} onChange={(e) => setReason(e.target.value)} error={state.fields.reason} />
        <TextArea label="Details (optional)" rows={3} maxLength={1000} value={details} onChange={(e) => setDetails(e.target.value)} />
        <div className="flex justify-end gap-2">
          <button type="button" className="sk-btn" onClick={onClose}>Cancel</button>
          <button type="submit" className="sk-btn sk-btn-gold" disabled={state.busy || !reason}>{state.busy ? 'Sending…' : 'Send report'}</button>
        </div>
      </form>
    </Dialog>
  );
}
