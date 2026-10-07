/* A large search field with a clear button (Escape also clears). The parent owns the value. */
import Icon from '../ui/Icon.jsx';
import './directory.css';

export default function DirectorySearch({ id, label, value, onChange, placeholder, onSubmit }) {
  return (
    <form className="sk-dsearch" role="search" onSubmit={(e) => { e.preventDefault(); onSubmit && onSubmit(value); }}>
      <Icon name="search" size={19} />
      <label className="sr-only" htmlFor={id}>{label}</label>
      <input id={id} type="search" autoComplete="off" maxLength={100} placeholder={placeholder} value={value}
        onChange={(e) => onChange(e.target.value)} onKeyDown={(e) => { if (e.key === 'Escape' && value) { e.preventDefault(); onChange(''); } }} />
      {value ? (
        <button type="button" className="sk-icon-btn sk-dsearch-clear" onClick={() => onChange('')} aria-label="Clear search">
          <Icon name="close" size={16} />
        </button>
      ) : null}
    </form>
  );
}
