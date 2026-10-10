/* ==========================================================================
   Sikhify — NotificationPopup
   When the unread count shows something new, the newest unread notification
   pops up in the corner for a few seconds (e.g. "New submission … · S-ABC123"
   for staff), with a "View" link. Each notification pops up once per browser
   tab session — reloading or changing page does not repeat it. Announced
   politely to screen readers; Escape or × closes it; hovering keeps it open.
   ========================================================================== */
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { notificationService } from '../../services/community/index.js';
import Icon from '../ui/Icon.jsx';
import SiteLink from '../common/SiteLink.jsx';

const SEEN_KEY = 'sikhify:notif-popup-seen';
const SHOW_MS = 9000;
const readSeen = () => { try { return Number(sessionStorage.getItem(SEEN_KEY)) || 0; } catch { return 0; } };
const writeSeen = (id) => { try { sessionStorage.setItem(SEEN_KEY, String(id)); } catch { /* storage unavailable */ } };
const ICON = { submission_received: 'inbox', comment: 'message', reply: 'message', reaction: 'heart', report_resolved: 'flag', submission_reviewed: 'upload' };

export default function NotificationPopup({ user, unread }) {
  const [item, setItem] = useState(null);
  const hold = useRef(false);
  const timer = useRef(null);

  // Something unread that this tab hasn't popped up yet → fetch the newest one.
  useEffect(() => {
    if (!user || !unread) return;
    let live = true;
    notificationService.list({ unread: 1, limit: 1 }).then((d) => {
      const n = d.items && d.items[0];
      if (!live || !n || n.id <= readSeen()) return;
      writeSeen(n.id);
      setItem(n);
    }).catch(() => {});
    return () => { live = false; };
  }, [user, unread]);

  // Auto-hide (paused while hovered or focused).
  useEffect(() => {
    if (!item) return undefined;
    const tick = () => { timer.current = setTimeout(() => { if (hold.current) tick(); else setItem(null); }, SHOW_MS); };
    tick();
    const onKey = (e) => { if (e.key === 'Escape') setItem(null); };
    document.addEventListener('keydown', onKey);
    return () => { clearTimeout(timer.current); document.removeEventListener('keydown', onKey); };
  }, [item]);

  if (!item) return null;
  const close = () => setItem(null);
  // Rendered on <body>: inside the header it would move with the header (which slides away on scroll).
  return createPortal((
    <div className="sk-notif-pop" role="status" aria-live="polite"
      onMouseEnter={() => { hold.current = true; }} onMouseLeave={() => { hold.current = false; }}
      onFocus={() => { hold.current = true; }} onBlur={() => { hold.current = false; }}>
      <span className="sk-notif-pop-icon" aria-hidden="true"><Icon name={ICON[item.type] || 'bell'} size={18} /></span>
      <div className="sk-notif-pop-body">
        <p className="sk-notif-pop-title">{item.type === 'submission_received' ? 'New submission' : 'New notification'}</p>
        <p className="sk-notif-pop-text">{item.type === 'submission_received' ? item.message.replace(/^New submission:\s*/, '') : item.message}</p>
        <div className="sk-notif-pop-actions">
          {item.link ? <SiteLink className="sk-notif-pop-view" to={item.link} onClick={close}>View <span aria-hidden="true">→</span></SiteLink> : null}
          <SiteLink className="sk-notif-pop-all" to="/community/notifications" onClick={close}>All notifications</SiteLink>
        </div>
      </div>
      <button type="button" className="sk-notif-pop-close" aria-label="Close notification" onClick={close}>×</button>
    </div>
  ), document.body);
}
