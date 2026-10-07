/* ==========================================================================
   Directory filters. Every control changes the URL; the server does the
   filtering (no records are filtered in the browser). Location lists come
   from the database: only countries / states / cities that have Gurdwaras.
   ========================================================================== */
import { useId } from 'react';
import { useAsync } from '../../hooks/useAsync.js';
import { gurdwaraService } from '../../services/gurdwaras/gurdwaraService.js';
import { FACILITIES, SERVICES, STATUS_FILTERS } from '../../../../shared/gurdwaras.js';

function SelectRow({ label, value, options, onChange, allLabel, disabled }) {
  const id = useId();
  return (
    <div className="sk-gfilter-field">
      <label className="sk-gfilter-label" htmlFor={id}>{label}</label>
      <select id={id} className="sk-form-input sk-form-select" value={value || ''} disabled={disabled} onChange={(e) => onChange(e.target.value)}>
        <option value="">{allLabel}</option>
        {options.map((o) => <option key={o.slug} value={o.slug}>{o.name}{typeof o.count === 'number' ? ` (${o.count})` : ''}</option>)}
      </select>
    </div>
  );
}

/** Country → State/Province → City selects. `place` holds the names for slugs that have no listings yet. */
export function LocationSelects({ country, state, city, place, onPlace }) {
  const loc = useAsync(() => gurdwaraService.locations(country, state), [country, state]);
  const withCurrent = (list, slug, named) => {
    const items = list || [];
    return slug && named && !items.some((x) => x.slug === slug) ? [{ slug, name: named.name }, ...items] : items;
  };
  const d = loc.data || {};
  return (
    <>
      <SelectRow label="Country" value={country} allLabel="All countries" options={withCurrent(d.countries, country, place && place.country)}
        onChange={(v) => onPlace({ country: v || '', state: '', city: '' })} />
      <SelectRow label="State / Province" value={state} allLabel={country ? 'All states / provinces' : 'Choose a country first'} disabled={!country}
        options={withCurrent(d.states, state, place && place.state)} onChange={(v) => onPlace({ country, state: v || '', city: '' })} />
      <SelectRow label="City" value={city} allLabel={state ? 'All cities' : 'Choose a state first'} disabled={!state}
        options={withCurrent(d.cities, city, place && place.city)} onChange={(v) => onPlace({ country, state, city: v || '' })} />
      {loc.error ? <p className="sk-form-error">Locations couldn&apos;t be loaded.</p> : null}
    </>
  );
}

function CheckGroup({ legend, items, selected, onToggle }) {
  return (
    <fieldset className="sk-gfilter-group">
      <legend className="sk-gfilter-label">{legend}</legend>
      {items.map((it) => (
        <label key={it.key} className="sk-gcheck">
          <input type="checkbox" checked={selected.includes(it.key)} onChange={() => onToggle(it.key)} />
          <span>{it.label}</span>
        </label>
      ))}
    </fieldset>
  );
}

export default function FilterPanel({ filters, place, onPlace, onChange, onClear, activeCount }) {
  const toggle = (key, value) => {
    const list = filters[key];
    onChange({ [key]: list.includes(value) ? list.filter((x) => x !== value) : [...list, value] });
  };
  return (
    <div className="sk-gfilters">
      <div className="flex items-center justify-between gap-2">
        <h2 className="sk-gfilters-title">Filters</h2>
        <button type="button" className="sk-link-btn" onClick={onClear} disabled={!activeCount}>Clear All</button>
      </div>
      <LocationSelects country={filters.country} state={filters.state} city={filters.city} place={place} onPlace={onPlace} />
      <CheckGroup legend="Status" items={STATUS_FILTERS} selected={filters.status} onToggle={(k) => toggle('status', k)} />
      <CheckGroup legend="Facilities" items={FACILITIES} selected={filters.facilities} onToggle={(k) => toggle('facilities', k)} />
      <CheckGroup legend="Services" items={SERVICES} selected={filters.services} onToggle={(k) => toggle('services', k)} />
    </div>
  );
}
