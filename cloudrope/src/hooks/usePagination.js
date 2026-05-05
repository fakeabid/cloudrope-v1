import { useState, useMemo, useEffect } from 'react';

export function usePagination(items, pageSize = 10) {
  const [page, setPage] = useState(1);

  // Reset to page 1 whenever the item list changes (e.g. search filter applied)
  useEffect(() => {
    setPage(1);
  }, [items.length]);

  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));

  // Clamp current page if items shrink (e.g. after a delete on the last page)
  const safePage = Math.min(page, totalPages);

  const paged = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, safePage, pageSize]);

  return {
    page: safePage,
    setPage,
    totalPages,
    paged,
    totalItems: items.length,
    pageSize,
    from: items.length === 0 ? 0 : (safePage - 1) * pageSize + 1,
    to: Math.min(safePage * pageSize, items.length),
  };
}
