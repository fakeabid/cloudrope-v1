import { useState, useEffect, useMemo } from 'react';

export function useSearch(items, fields = ['original_name']) {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query.trim()), 200);
    return () => clearTimeout(t);
  }, [query]);

  const filtered = useMemo(() => {
    if (!debouncedQuery) return items;
    const q = debouncedQuery.toLowerCase();
    return items.filter((item) =>
      fields.some((field) => item[field]?.toLowerCase().includes(q))
    );
  }, [items, debouncedQuery, fields]);

  return { query, setQuery, filtered, hasQuery: debouncedQuery.length > 0 };
}
