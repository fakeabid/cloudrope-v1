import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function Pagination({ page, totalPages, setPage, from, to, totalItems }) {
  if (totalPages <= 1 && totalItems <= 10) return null;

  const pages = buildPageList(page, totalPages);

  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-border">
      {/* Count */}
      <p className="text-text-muted text-xs">
        {totalItems === 0
          ? 'No results'
          : `${from}–${to} of ${totalItems}`}
      </p>

      {/* Controls */}
      {totalPages > 1 && (
        <div className="flex items-center gap-1">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="p-1.5 rounded-md text-text-muted hover:text-text-primary hover:bg-elevated disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            aria-label="Previous page"
          >
            <ChevronLeft size={14} />
          </button>

          {pages.map((p, i) =>
            p === '…' ? (
              <span key={`ellipsis-${i}`} className="px-1.5 text-text-muted text-xs select-none">
                …
              </span>
            ) : (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={`min-w-[28px] h-7 rounded-md text-xs font-medium transition-colors ${
                  p === page
                    ? 'bg-accent text-white'
                    : 'text-text-muted hover:text-text-primary hover:bg-elevated'
                }`}
              >
                {p}
              </button>
            )
          )}

          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="p-1.5 rounded-md text-text-muted hover:text-text-primary hover:bg-elevated disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            aria-label="Next page"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      )}
    </div>
  );
}

// Build a smart page list: [1, 2, 3, …, 8, 9, 10] or [1, …, 4, 5, 6, …, 10]
function buildPageList(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  const pages = new Set([1, total, current, current - 1, current + 1]);
  const sorted = [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);

  const result = [];
  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && sorted[i] - sorted[i - 1] > 1) result.push('…');
    result.push(sorted[i]);
  }
  return result;
}
