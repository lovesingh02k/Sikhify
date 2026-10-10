import { useEffect, useRef } from 'react';
import Icon from './Icon.jsx';

/**
 * Accessible modal built on the native <dialog> element (focus containment,
 * Escape to close, inert background) with Sikhify's .sk-dialog styling.
 */
export default function Dialog({ open, onClose, title, children, wide = false, labelledBy }) {
  const ref = useRef(null);
  const returnFocus = useRef(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      returnFocus.current = document.activeElement;
      d.showModal();
    } else if (!open && d.open) d.close();
  }, [open]);

  useEffect(() => {
    const d = ref.current;
    if (!d) return undefined;
    const onCancel = (e) => { e.preventDefault(); onClose?.(); };
    const onCloseEvt = () => {
      const el = returnFocus.current;
      if (el && document.contains(el)) el.focus({ preventScroll: true });
    };
    d.addEventListener('cancel', onCancel);
    d.addEventListener('close', onCloseEvt);
    return () => { d.removeEventListener('cancel', onCancel); d.removeEventListener('close', onCloseEvt); };
  }, [onClose]);

  const titleId = labelledBy || 'dlg-' + String(title || '').replace(/\W+/g, '-').toLowerCase();
  return (
    <dialog
      ref={ref}
      className="sk-dialog"
      style={wide ? { width: 'min(980px, calc(100vw - 2rem))' } : undefined}
      aria-labelledby={titleId}
      data-motion="off"
      onClick={(e) => { if (e.target === ref.current) onClose?.(); }}
    >
      {open ? (
        <>
          <div className="sk-dialog-head">
            <h2 id={titleId} className="sk-dialog-title">{title}</h2>
            <button type="button" className="sk-icon-btn" onClick={onClose} aria-label="Close"><Icon name="close" /></button>
          </div>
          <div className="sk-dialog-body">{children}</div>
        </>
      ) : null}
    </dialog>
  );
}

/** Yes/no confirmation for destructive actions. */
export function ConfirmDialog({ open, title, message, confirmLabel = 'Confirm', danger = false, busy = false, onConfirm, onCancel }) {
  return (
    <Dialog open={open} onClose={onCancel} title={title}>
      <p>{message}</p>
      <div className="flex flex-wrap justify-end gap-2 mt-6">
        <button type="button" className="sk-btn" onClick={onCancel} disabled={busy}>Cancel</button>
        <button type="button" className={`sk-btn ${danger ? 'sk-btn-danger' : 'sk-btn-gold'}`} onClick={onConfirm} disabled={busy}>
          {busy ? 'Working…' : confirmLabel}
        </button>
      </div>
    </Dialog>
  );
}
