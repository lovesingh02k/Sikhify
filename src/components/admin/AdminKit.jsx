/* Building blocks for the admin panel: stat tiles, charts, status pills, filters, page headers. */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { formatDate } from '../../utils/format.js';

export function AdminHeader({ title, sub, actions }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h2 className="sk-section-title">{title}</h2>
        {sub ? <p className="sk-section-sub">{sub}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}

/** A single real number. `to` makes the tile a link to where it can be acted on. */
export function StatTile({ label, value, note, to }) {
  const body = (
    <>
      <p className="sk-stat-label">{label}</p>
      <p className="sk-stat-value">{value === null || value === undefined ? '—' : Number(value).toLocaleString('en-IN')}</p>
      {note ? <p className="sk-stat-note">{note}</p> : null}
    </>
  );
  return to ? <Link className="sk-stat" to={to}>{body}</Link> : <div className="sk-stat">{body}</div>;
}

export function Pill({ value, label }) {
  return <span className={`sk-pill sk-pill-${value}`}>{label || String(value).replace(/_/g, ' ')}</span>;
}

/**
 * Daily bar chart for one series (the title names it, so no legend). Each bar
 * shows its date and value on hover/focus; a table view lists every value.
 */
export function BarChart({ title, series, unit = '' }) {
  const [active, setActive] = useState(null);
  const max = Math.max(1, ...series.map((d) => d.value));
  const total = series.reduce((s, d) => s + d.value, 0);
  const tip = active !== null ? series[active] : null;
  return (
    <figure className="sk-card" style={{ margin: 0 }}>
      <figcaption className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="sk-card-title">{title}</span>
        <span className="sk-card-meta" style={{ marginTop: 0 }}>{total.toLocaleString('en-IN')}{unit} in {series.length} days</span>
      </figcaption>
      <div className="sk-chart mt-3">
        {tip ? (
          <span className="sk-chart-tip" style={{ left: `${((active + 0.5) / series.length) * 100}%` }}>
            {formatDate(tip.date, { weekday: 'short' })}: <strong>{tip.value}</strong>
          </span>
        ) : null}
        <div className="sk-bars" onMouseLeave={() => setActive(null)}>
          {series.map((d, i) => (
            <button key={d.date} type="button" aria-label={`${formatDate(d.date)}: ${d.value}`}
              onMouseEnter={() => setActive(i)} onFocus={() => setActive(i)} onBlur={() => setActive(null)}>
              <span style={{ height: d.value ? `${Math.max(3, (d.value / max) * 100)}%` : 0 }} />
            </button>
          ))}
        </div>
        <div className="sk-bars-axis" aria-hidden="true">
          <span>{formatDate(series[0].date)}</span>
          <span>max {max}</span>
          <span>{formatDate(series[series.length - 1].date)}</span>
        </div>
      </div>
      <details className="mt-3">
        <summary className="sk-link-btn">Table view</summary>
        <div className="sk-table-wrap mt-2" style={{ maxHeight: 240, overflowY: 'auto' }}>
          <table className="sk-table">
            <thead><tr><th scope="col">Date</th><th scope="col">{title}</th></tr></thead>
            <tbody>{series.map((d) => <tr key={d.date}><td>{formatDate(d.date)}</td><td>{d.value}</td></tr>)}</tbody>
          </table>
        </div>
      </details>
    </figure>
  );
}

/** Ranked horizontal bars with the value always printed (labels, not color, carry the data). */
export function HBarList({ title, rows, empty = 'No data yet.', format = (s) => s }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <section className="sk-card" aria-label={title}>
      <h3 className="sk-card-title">{title}</h3>
      {rows.length ? (
        <ul className="mt-3">
          {rows.map((r) => (
            <li key={r.label} className="sk-hbar">
              <span className="truncate" title={format(r.label)}>{format(r.label)}</span>
              <span className="sk-hbar-track" aria-hidden="true"><span style={{ width: `${(r.value / max) * 100}%` }} /></span>
              <span className="sk-hbar-value">{r.value}</span>
            </li>
          ))}
        </ul>
      ) : <p className="sk-card-meta">{empty}</p>}
    </section>
  );
}

export function FilterBar({ children }) {
  return <div className="sk-filters" role="search">{children}</div>;
}
