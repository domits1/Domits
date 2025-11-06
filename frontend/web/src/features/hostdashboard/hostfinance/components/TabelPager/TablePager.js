export function TablePager ({ page, setPage, totalPages }) {
  if (totalPages <= 1) return null;
  return (
    <div className="table-pager">
      <button className="pager-btn" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
        Previous
      </button>
      <span className="pager-info">
        Page {page} of {totalPages}
      </span>
      <button className="pager-btn" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>
        Next
      </button>
    </div>
  );
};
