/* Renders form fields for a content type from shared/contentTypes.js (admin editor + submission form). */
import { useState } from 'react';
import { TextInput, TextArea, Select, Checkbox } from '../ui/Form.jsx';
import { useAsync } from '../../hooks/useAsync.js';
import { entryService } from '../../services/content/contentService.js';
import { fieldsFor } from '../../../../shared/contentTypes.js';

const INPUT_TYPE = { url: 'url', email: 'email', tel: 'tel', date: 'date', time: 'time', number: 'number', text: 'text' };
const LIST_HELP = { list: 'One per line.', youtube: 'One YouTube link per line.', links: 'One per line: Label | https://…' };

/** Values for list fields are edited as newline-separated text. */
export function toFormValues(type, fields = {}, common = {}) {
  const out = {};
  for (const f of fieldsFor(type)) {
    const v = f.name in common ? common[f.name] : fields[f.name];
    if (f.kind === 'quiz') out[f.name] = Array.isArray(v) ? v : [];
    else if (Array.isArray(v)) out[f.name] = f.kind === 'youtube' ? v.map((id) => `https://youtu.be/${id}`).join('\n') : v.join('\n');
    else if (f.kind === 'boolean') out[f.name] = !!v;
    else out[f.name] = v ?? '';
  }
  return out;
}

const NEW = '__new__';

/**
 * A dropdown that also takes new values (e.g. a download's category). It lists the usual options plus
 * every category already used on the site; "+ New category…" swaps it for a text box to type a new one.
 */
function CustomSelect({ type, field: f, common, className, onChange }) {
  const used = useAsync(() => entryService.facets(type).then((d) => (d.categories || []).map((c) => c.value)).catch(() => []), [type]);
  const value = common.value;
  const options = [...new Set([...f.options, ...(used.data || []), ...(value ? [value] : [])])];
  const [typing, setTyping] = useState(false);
  const word = f.label.toLowerCase();
  if (typing) {
    return (
      <div className={className}>
        <TextInput {...common} autoFocus maxLength={80} placeholder={`Type the new ${word}`} help={`Saved with this item; it then appears in the ${word} list.`}
          onChange={(e) => onChange(e.target.value)} />
        <button type="button" className="sk-link-btn mt-2" onClick={() => { setTyping(false); if (!options.includes(value)) onChange(''); }}>← Choose from the list instead</button>
      </div>
    );
  }
  return (
    <Select {...common} className={className} placeholder="Choose…" help={f.help}
      options={[...options.map((o) => ({ value: o, label: o })), { value: NEW, label: `+ New ${word}…` }]}
      onChange={(e) => { if (e.target.value === NEW) { setTyping(true); onChange(''); } else onChange(e.target.value); }} />
  );
}

/**
 * `foldOptional`: required fields first; the optional ones go in a "More details"
 * fold that opens by itself when one of them already has a value or an error.
 */
export default function SchemaFields({ type, values, onChange, errors = {}, skip = [], foldOptional = false }) {
  const set = (name) => (e) => onChange({ ...values, [name]: e && e.target ? e.target.value : e });
  const field = (f) => {
    // Required fields carry the * marker; everything else says so in plain words (not needed inside the fold).
    const label = f.required || foldOptional ? f.label : `${f.label} (optional)`;
    const common = { label, required: f.required, error: errors[f.name], value: values[f.name] ?? '' };
    const wide = f.kind === 'textarea' || f.kind === 'list' || f.kind === 'youtube' || f.kind === 'links' || f.name === 'title';
    const cls = wide ? 'sk-span-2' : '';
    if (f.kind === 'select' && f.custom) {
      return <CustomSelect key={f.name} type={type} field={f} common={common} className={cls} onChange={(v) => onChange({ ...values, [f.name]: v })} />;
    }
    if (f.kind === 'select') return <Select key={f.name} {...common} className={cls} options={f.options} placeholder="Choose…" help={f.help} onChange={set(f.name)} />;
    if (f.kind === 'boolean') return <Checkbox key={f.name} label={f.label} help={f.help} checked={!!values[f.name]} onChange={set(f.name)} />;
    if (f.kind === 'textarea' || f.kind === 'list' || f.kind === 'youtube' || f.kind === 'links') {
      return <TextArea key={f.name} {...common} className={cls} rows={f.rows || (f.kind === 'textarea' ? 4 : 3)} maxLength={f.max} help={[f.help, LIST_HELP[f.kind]].filter(Boolean).join(' ')} onChange={set(f.name)} />;
    }
    return <TextInput key={f.name} {...common} className={cls} type={INPUT_TYPE[f.kind] || 'text'} maxLength={f.max} help={f.help} onChange={set(f.name)} />;
  };
  // Fields filled by upload buttons (photos, video files) are not typed in, so they are not shown here.
  const all = fieldsFor(type).filter((f) => !skip.includes(f.name) && typeof f.upload !== 'string' && f.kind !== 'quiz');
  if (!foldOptional) return <div className="sk-form-grid">{all.map(field)}</div>;
  const req = all.filter((f) => f.required);
  const opt = all.filter((f) => !f.required);
  const filled = opt.some((f) => errors[f.name] || (values[f.name] !== undefined && values[f.name] !== '' && values[f.name] !== false));
  return (
    <>
      <div className="sk-form-grid">{req.map(field)}</div>
      {opt.length ? (
        <details className="sk-step-more sk-fold-optional" open={filled || undefined}>
          <summary>More details — {opt.length} optional field{opt.length === 1 ? '' : 's'}</summary>
          <div className="sk-form-grid mt-3">{opt.map(field)}</div>
        </details>
      ) : null}
    </>
  );
}
