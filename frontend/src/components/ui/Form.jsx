/* Sikhify — accessible form controls: every field has a label, help text and an error wired with aria-describedby. */
import { useId } from 'react';

export function Field({ label, error, help, required, children, className = '' }) {
  const id = useId();
  const helpId = help ? id + '-help' : undefined;
  const errId = error ? id + '-err' : undefined;
  const describedBy = [helpId, errId].filter(Boolean).join(' ') || undefined;
  return (
    <div className={`sk-form-field ${className}`.trim()}>
      <label className="sk-form-label" htmlFor={id}>
        {label}{required ? <span className="sk-form-req" aria-hidden="true"> *</span> : null}
      </label>
      {children({ id, 'aria-describedby': describedBy, 'aria-invalid': error ? 'true' : undefined, required })}
      {help ? <p className="sk-form-help" id={helpId}>{help}</p> : null}
      {error ? <p className="sk-form-error" id={errId} role="alert">{error}</p> : null}
    </div>
  );
}

export function TextInput({ label, error, help, required, className, ...props }) {
  return (
    <Field label={label} error={error} help={help} required={required} className={className}>
      {(a) => <input className="sk-form-input" {...a} {...props} />}
    </Field>
  );
}

export function TextArea({ label, error, help, required, className, rows = 4, ...props }) {
  return (
    <Field label={label} error={error} help={help} required={required} className={className}>
      {(a) => <textarea className="sk-form-input sk-form-textarea" rows={rows} {...a} {...props} />}
    </Field>
  );
}

export function Select({ label, error, help, required, className, options, placeholder, ...props }) {
  return (
    <Field label={label} error={error} help={help} required={required} className={className}>
      {(a) => (
        <select className="sk-form-input sk-form-select" {...a} {...props}>
          {placeholder !== undefined ? <option value="">{placeholder}</option> : null}
          {options.map((o) => {
            const v = typeof o === 'string' ? o : o.value;
            const l = typeof o === 'string' ? o : o.label;
            return <option key={v} value={v}>{l}</option>;
          })}
        </select>
      )}
    </Field>
  );
}

export function Checkbox({ label, help, checked, onChange, ...props }) {
  const id = useId();
  return (
    <div className="sk-form-check">
      <input id={id} type="checkbox" checked={!!checked} onChange={(e) => onChange(e.target.checked)} aria-describedby={help ? id + '-help' : undefined} {...props} />
      <div>
        <label htmlFor={id} className="sk-form-label" style={{ marginBottom: 0 }}>{label}</label>
        {help ? <p className="sk-form-help" id={id + '-help'}>{help}</p> : null}
      </div>
    </div>
  );
}

/** Banner for a failed submit (top-level message from the API). */
export function FormError({ error }) {
  if (!error) return null;
  return <div className="sk-form-banner" role="alert">{error.message || String(error)}</div>;
}
