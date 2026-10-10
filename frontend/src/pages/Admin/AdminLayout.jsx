/* ==========================================================================
   The Sikhify Admin Panel frame: navigation grouped by task and filtered by
   the signed-in role (the API enforces the same rules). Waiting work (pending
   submissions and reports) is counted live and shown beside its section.
   Phones and tablets get a "Menu" button that opens the same grouped list,
   instead of a long sideways-scrolling strip.
   ========================================================================== */
import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import Icon from '../../components/ui/Icon.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useReactPage } from '../../hooks/useReactPage.js';
import { adminService } from '../../services/admin/adminService.js';
import { NAV } from './adminNav.js';


const COUNTS_KEY = 'sikhify:admin-counts';
function readCounts() { try { return JSON.parse(sessionStorage.getItem(COUNTS_KEY)) || {}; } catch { return {}; } }
function writeCounts(c) { try { sessionStorage.setItem(COUNTS_KEY, JSON.stringify(c)); } catch { /* storage unavailable */ } }

export default function AdminLayout() {
  useReactPage('Admin — Sikhify', 'Sikhify administration.', { noindex: true, motion: false });
  const { can } = useAuth();
  const { pathname } = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  // Waiting work, refreshed whenever the section changes (one small request). The last known
  // counts stay on screen while it refreshes — and are remembered for this tab, so a badge
  // never blinks out when switching pages or reloading; only a real change updates it.
  const [counts, setCounts] = useState(readCounts);
  const section = pathname.split('/')[2] || '';
  useEffect(() => {
    let live = true;
    adminService.dashboard().then((d) => {
      if (!live) return;
      const next = {
        submissions: (d.counts.pendingSubmissions || 0) + (d.counts.pendingGurdwaraSubmissions || 0),
        reports: d.counts.pendingReports || 0,
      };
      setCounts((prev) => (prev.submissions === next.submissions && prev.reports === next.reports ? prev : next));
      writeCounts(next);
    }).catch(() => { /* keep the last known counts */ });
    return () => { live = false; };
  }, [section]);
  useEffect(() => { setMenuOpen(false); }, [pathname]);
  // Admin mode (admin top bar, no footer) is set from the address in Header.jsx — not here, so it
  // never switches off for a moment while the next admin section's code is loading.

  const groups = NAV.map(([group, items]) => [group, items.filter(([, , , cap]) => can(cap))]).filter(([, items]) => items.length);
  const current = groups.flatMap(([, items]) => items).filter(([to, , , , end]) => (end ? pathname === to : pathname === to || pathname.startsWith(to + '/')))
    .sort((a, b) => b[0].length - a[0].length)[0];

  return (
    <main id="main-content" className="sk-admin">
      <div className="sk-container sk-admin-body" data-motion="off">
        <div className="sk-app">
          <div className="sk-sidenav-wrap">
            <button type="button" className="sk-sidenav-toggle" aria-expanded={menuOpen} aria-controls="admin-nav" onClick={() => setMenuOpen((v) => !v)}>
              <Icon name={current ? current[2] : 'dashboard'} size={18} />
              <span className="min-w-0 truncate"><span className="sr-only">Admin section: </span>{current ? current[1] : 'Admin'}</span>
              <span className="sk-sidenav-toggle-label">{menuOpen ? 'Close' : 'Menu'}</span>
            </button>
            <nav id="admin-nav" className={`sk-sidenav${menuOpen ? ' is-open' : ''}`} aria-label="Admin">
              {groups.map(([group, items]) => (
                <div key={group} className="sk-sidenav-group">
                  <p className="sk-sidenav-label">{group}</p>
                  {items.map(([to, label, icon, , end, countKey]) => (
                    <NavLink key={to} to={to} end={!!end}>
                      <Icon name={icon} size={18} /><span className="min-w-0 flex-1">{label}</span>
                      {countKey && counts[countKey] ? <span className="sk-nav-count" aria-label={`${counts[countKey]} waiting`}>{counts[countKey]}</span> : null}
                    </NavLink>
                  ))}
                </div>
              ))}
              <p className="sk-sidenav-foot" aria-hidden="true"><span className="khanda-mark" />Serve · Share · Spread</p>
            </nav>
          </div>
          <div className="min-w-0 sk-stack"><Outlet /></div>
        </div>
      </div>
    </main>
  );
}
