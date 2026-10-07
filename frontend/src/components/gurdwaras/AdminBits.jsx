/* Admin building blocks for the Gurdwara Directory: the record form, the coordinate picker and the duplicate comparison list. */
import { Link } from 'react-router-dom';
import { TextInput, TextArea, Select } from '../ui/Form.jsx';
import MapView from '../map/MapView.jsx';
import { StatusBadge } from './GurdwaraBits.jsx';
import { FACILITIES, SERVICES, STATUSES, SOURCE_TYPES } from '../../../../shared/gurdwaras.js';

export const EMPTY_RECORD = {
  name: '', officialName: '', alsoKnownAs: '', country: '', state: '', city: '', district: '', address: '', postalCode: '',
  latitude: '', longitude: '', phone: '', email: '', website: '', description: '', programs: '', openingHours: '',
  establishedYear: '', managementOrganization: '', status: 'active', facilities: [], services: [],
};

/** Detail (API shape) → form values. */
export function toRecord(g) {
  return {
    ...EMPTY_RECORD,
    name: g.name || '', officialName: g.officialName || '', alsoKnownAs: g.alsoKnownAs || '',
    country: g.country ? g.country.code || g.country.name : '', state: g.state ? g.state.name : '', city: g.city ? g.city.name : '', district: g.district || '',
    address: g.address || '', postalCode: g.postalCode || '',
    latitude: g.latitude ?? '', longitude: g.longitude ?? '',
    phone: g.phone || '', email: g.email || '', website: g.website || '',
    description: g.description || '', programs: g.programs || '', openingHours: g.openingHours || '',
    establishedYear: g.establishedYear ?? '', managementOrganization: g.managementOrganization || '',
    status: g.status || 'active', facilities: g.facilities || [], services: g.services || [],
  };
}

function Toggles({ legend, items, value, onChange }) {
  return (
    <fieldset className="sk-gfilter-group sk-span-2">
      <legend className="sk-form-label">{legend}</legend>
      <div className="flex flex-wrap gap-x-5 gap-y-1">
        {items.map((it) => (
          <label key={it.key} className="sk-gcheck">
            <input type="checkbox" checked={value.includes(it.key)} onChange={() => onChange(value.includes(it.key) ? value.filter((x) => x !== it.key) : [...value, it.key])} />
            <span>{it.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

/** Every editable field of a Gurdwara record. `compact` hides the long-form fields (submission review). */
export function RecordFields({ value, onChange, errors = {}, countries = [], compact = false, showStatus = true }) {
  const on = (k) => (e) => onChange({ ...value, [k]: e.target.value });
  const lat = Number(value.latitude), lng = Number(value.longitude);
  const hasPoint = value.latitude !== '' && value.longitude !== '' && Number.isFinite(lat) && Number.isFinite(lng);
  const countryOptions = countries.map((c) => ({ value: c.code || c.name, label: c.name }));
  if (value.country && !countryOptions.some((o) => o.value === value.country)) countryOptions.unshift({ value: value.country, label: value.country });
  return (
    <div className="sk-form-grid">
      <TextInput className="sk-span-2" label="Display name" required value={value.name} onChange={on('name')} error={errors.name} maxLength={200} />
      {!compact ? (
        <>
          <TextInput label="Official name" value={value.officialName} onChange={on('officialName')} maxLength={300} />
          <TextInput label="Also known as" value={value.alsoKnownAs} onChange={on('alsoKnownAs')} maxLength={300} help="Other names people search for, comma-separated." />
        </>
      ) : null}
      <Select label="Country" required value={value.country} onChange={on('country')} error={errors.country} placeholder="Choose…" options={countryOptions} />
      <TextInput label="State / Province / Region" required value={value.state} onChange={on('state')} error={errors.state} maxLength={100} />
      <TextInput label="City / Town" required value={value.city} onChange={on('city')} error={errors.city} maxLength={100} />
      <TextInput label="District" value={value.district} onChange={on('district')} maxLength={100} help="If different from the city (optional)." />
      <TextInput label="Postal code" value={value.postalCode} onChange={on('postalCode')} maxLength={30} />
      <TextInput className="sk-span-2" label="Street address" value={value.address} onChange={on('address')} error={errors.address} maxLength={500} />
      <TextInput label="Phone" type="tel" value={value.phone} onChange={on('phone')} maxLength={60} />
      <TextInput label="Email" type="email" value={value.email} onChange={on('email')} error={errors.email} maxLength={200} />
      <TextInput className="sk-span-2" label="Website" type="url" placeholder="https://" value={value.website} onChange={on('website')} error={errors.website} maxLength={300} />
      <div className="sk-span-2">
        <div className="sk-form-grid">
          <TextInput label="Latitude" inputMode="decimal" value={value.latitude} onChange={on('latitude')} error={errors.coordinates} placeholder="e.g. 31.62" />
          <TextInput label="Longitude" inputMode="decimal" value={value.longitude} onChange={on('longitude')} placeholder="e.g. 74.88" />
        </div>
        <p className="sk-form-help">Click the map to place the pin, or type coordinates from a reliable source. Leave both empty if unknown.</p>
        <div className="mt-2">
          <MapView points={hasPoint ? [{ id: 'pin', lat, lng, title: value.name || 'Gurdwara' }] : []} selectedId="pin" zoom={hasPoint ? 16 : 2} height={240}
            onPick={({ lat: la, lng: lo }) => onChange({ ...value, latitude: Math.round(la * 1e6) / 1e6, longitude: Math.round(lo * 1e6) / 1e6 })}
            label="Coordinate picker: click to place the Gurdwara" />
        </div>
      </div>
      {showStatus ? (
        <Select label="Status" value={value.status} onChange={on('status')} options={Object.entries(STATUSES).map(([k, s]) => ({ value: k, label: s.label }))} />
      ) : null}
      {!compact ? (
        <>
          <TextInput label="Established (year)" inputMode="numeric" value={value.establishedYear} onChange={on('establishedYear')} error={errors.established_year} />
          <TextInput className="sk-span-2" label="Management / committee" value={value.managementOrganization} onChange={on('managementOrganization')} maxLength={300} />
        </>
      ) : null}
      <Toggles legend="Facilities" items={FACILITIES} value={value.facilities} onChange={(v) => onChange({ ...value, facilities: v })} />
      <Toggles legend="Services" items={SERVICES} value={value.services} onChange={(v) => onChange({ ...value, services: v })} />
      <TextArea className="sk-span-2" label="About" rows={compact ? 3 : 6} value={value.description} onChange={on('description')} maxLength={10000} help="Facts from the sources only." />
      {!compact ? (
        <>
          <TextArea className="sk-span-2" label="Programs" rows={3} value={value.programs} onChange={on('programs')} maxLength={3000} help="Regular programs, e.g. “Daily Nitnem 5 am; Sunday Diwan 10 am–1 pm”." />
          <TextArea className="sk-span-2" label="Opening hours" rows={2} value={value.openingHours} onChange={on('openingHours')} maxLength={1000} />
        </>
      ) : null}
    </div>
  );
}

/** A source the reviewer checked (name, link, type). */
export function SourceFields({ value, onChange, errors = {} }) {
  const on = (k) => (e) => onChange({ ...value, [k]: e.target.value });
  return (
    <div className="sk-form-grid">
      <TextInput label="Source name" value={value.name} onChange={on('name')} error={errors.sourceName || errors.source} maxLength={300} placeholder="e.g. Official Gurdwara website" />
      <Select label="Source type" value={value.type} onChange={on('type')} options={Object.entries(SOURCE_TYPES).map(([k, l]) => ({ value: k, label: l }))} />
      <TextInput className="sk-span-2" label="Source link" type="url" placeholder="https://" value={value.url} onChange={on('url')} error={errors.sourceUrl} maxLength={500} />
      <TextInput className="sk-span-2" label="Notes" value={value.notes || ''} onChange={on('notes')} maxLength={1000} help="What you checked, e.g. “Address and phone confirmed on the committee's website”." />
    </div>
  );
}

/** "Possible Existing Gurdwara" — side-by-side facts so the admin can compare. */
export function DuplicateList({ items, candidate, onMerge, mergeLabel = 'Same Gurdwara — merge into this' }) {
  if (!items || !items.length) return null;
  return (
    <section className="sk-gdupes" aria-label="Possible existing Gurdwara">
      <p className="sk-gdupes-title">Possible Existing Gurdwara</p>
      <ul className="flex flex-col gap-3">
        {items.map((d) => (
          <li key={d.id} className="sk-gdupe">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="sk-card-title" style={{ fontSize: '0.95rem' }}><Link to={`/admin/gurdwaras/${d.id}`} target="_blank">{d.name}</Link></p>
                <StatusBadge status={d.status || 'active'} verification={d.verification} />
              </div>
              {typeof d.score === 'number' ? <span className="sk-gdupe-score">{Math.round(d.score * 100)}% match</span> : null}
            </div>
            <p className="sk-card-meta">{(d.reasons || []).join(' · ')}{d.archived ? ' · archived' : ''}</p>
            <table className="sk-gcompare">
              <thead><tr><th scope="col"><span className="sr-only">Field</span></th><th scope="col">Existing</th>{candidate ? <th scope="col">This one</th> : null}</tr></thead>
              <tbody>
                {[['City', d.city, candidate && candidate.city], ['Address', d.address, candidate && candidate.address], ['Phone', d.phone, candidate && candidate.phone], ['Website', d.website, candidate && candidate.website]].map(([k, a, b]) => (
                  <tr key={k}><th scope="row">{k}</th><td>{a || '—'}</td>{candidate ? <td>{b || '—'}</td> : null}</tr>
                ))}
              </tbody>
            </table>
            {onMerge ? <button type="button" className="sk-btn sk-btn-sm mt-2" onClick={() => onMerge(d)}>{mergeLabel}</button> : null}
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Form values → API body (numbers where numbers are expected). */
export function recordBody(v) {
  return {
    ...v,
    latitude: v.latitude === '' ? null : v.latitude, longitude: v.longitude === '' ? null : v.longitude,
    establishedYear: v.establishedYear === '' ? null : v.establishedYear,
  };
}
