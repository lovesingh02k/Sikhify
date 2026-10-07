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

export default function SchemaFields({ type, values, onChange, errors = {}, skip = [] }) {
  const set = (name) => (e) => onChange({ ...values, [name]: e && e.target ? e.target.value : e });
  return (
    <div className="sk-form-grid">
      {fieldsFor(type).filter((f) => !skip.includes(f.name)).map((f) => {
        const common = { key: f.name, label: f.label, required: f.required, error: errors[f.name], value: values[f.name] ?? '' };
        const wide = f.kind === 'textarea' || f.kind === 'list' || f.kind === 'youtube' || f.kind === 'links' || f.name === 'title';
        const cls = wide ? 'sk-span-2' : '';
        if (f.kind === 'select') return <Select {...common} className={cls} options={f.options} placeholder="Choose…" help={f.help} onChange={set(f.name)} />;
        if (f.kind === 'boolean') return <Checkbox key={f.name} label={f.label} help={f.help} checked={!!values[f.name]} onChange={set(f.name)} />;
        if (f.kind === 'textarea' || f.kind === 'list' || f.kind === 'youtube' || f.kind === 'links') {
          return <TextArea {...common} className={cls} rows={f.rows || (f.kind === 'textarea' ? 4 : 3)} maxLength={f.max} help={[f.help, LIST_HELP[f.kind]].filter(Boolean).join(' ')} onChange={set(f.name)} />;
        }
        return <TextInput {...common} className={cls} type={INPUT_TYPE[f.kind] || 'text'} maxLength={f.max} help={f.help} onChange={set(f.name)} />;
      })}
    </div>
  );
}
