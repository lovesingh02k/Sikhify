export default function Pagination({ page, pages, onPage }) {
  if (!pages || pages <= 1) return null;
  return (
    <nav className="flex items-center justify-center gap-2 mt-6" aria-label="Pagination">
      <button type="button" className="sk-btn sk-btn-sm" disabled={page <= 1} onClick={() => onPage(page - 1)}>Previous</button>
      <span className="sk-card-meta" style={{ marginTop: 0 }} aria-current="page">Page {page} of {pages}</span>
      <button type="button" className="sk-btn sk-btn-sm" disabled={page >= pages} onClick={() => onPage(page + 1)}>Next</button>
    </nav>
  );
}
