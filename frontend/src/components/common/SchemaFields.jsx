/* Renders form fields for a content type from shared/contentTypes.js (admin editor + submission form). */
import { TextInput, TextArea, Select, Checkbox } from '../ui/Form.jsx';
import { fieldsFor } from '../../../../shared/contentTypes.js';

const INPUT_TYPE = { url: 'url', email: 'email', tel: 'tel', date: 'date', time: 'time', number: 'number', text: 'text' };
const LIST_HELP = { list: 'One per line.', youtube: 'One YouTube link per line.', links: 'One per line: Label | https://…' };

/** Values for list fields are edited as newline-separated text. */
export function toFormValues(type, fields = {}, common = {}) {
  const out = {};
  for (const f of fieldsFor(type)) {
    const v = f.name in common ? common[f.name] : fields[f.name];
    if (Array.isArray(v)) out[f.name] = f.kind === 'youtube' ? v.map((id) => `https://youtu.be/${id}`).join('\n') : v.join('\n');
    else if (f.kind === 'boolean') out[f.name] = !!v;
    else out[f.name] = v ?? '';
  }
  return out;
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
    if (f.kind === 'select') return <Select key={f.name} {...common} className={cls} options={f.options} placeholder="Choose…" help={f.help} onChange={set(f.name)} />;
    if (f.kind === 'boolean') return <Checkbox key={f.name} label={f.label} help={f.help} checked={!!values[f.name]} onChange={set(f.name)} />;
    if (f.kind === 'textarea' || f.kind === 'list' || f.kind === 'youtube' || f.kind === 'links') {
      return <TextArea key={f.name} {...common} className={cls} rows={f.rows || (f.kind === 'textarea' ? 4 : 3)} maxLength={f.max} help={[f.help, LIST_HELP[f.kind]].filter(Boolean).join(' ')} onChange={set(f.name)} />;
    }
    return <TextInput key={f.name} {...common} className={cls} type={INPUT_TYPE[f.kind] || 'text'} maxLength={f.max} help={f.help} onChange={set(f.name)} />;
  };
  const all = fieldsFor(type).filter((f) => !skip.includes(f.name));
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
