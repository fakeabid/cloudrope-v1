import { useState, useMemo } from 'react';

/**
 * @param {Array}  items
 * @param {Array}  sortOptions  — [{ value, label, fn: (a,b)=>int }]
 * @param {Array}  filterOptions — [{ value, label, test: (item)=>bool }] (optional)
 * @param {string} defaultSort  — value of the default sort option
 */
export function useSortFilter(items, sortOptions, filterOptions = [], defaultSort = null) {
  const [sortKey,   setSortKey]   = useState(defaultSort ?? sortOptions[0]?.value);
  const [filterKey, setFilterKey] = useState('all');

  const processed = useMemo(() => {
    let result = [...items];

    // Apply filter
    if (filterKey !== 'all') {
      const fc = filterOptions.find((f) => f.value === filterKey);
      if (fc) result = result.filter(fc.test);
    }

    // Apply sort
    const sc = sortOptions.find((s) => s.value === sortKey);
    if (sc) result.sort(sc.fn);

    return result;
  }, [items, sortKey, filterKey, sortOptions, filterOptions]);

  return { sortKey, setSortKey, filterKey, setFilterKey, processed };
}

// ── Pre-built sort option sets ─────────────────────────────────────────────────

export const FILE_SORT_OPTIONS = [
  { value: 'date_desc', label: 'Newest first',    fn: (a, b) => new Date(b.uploaded_at) - new Date(a.uploaded_at) },
  { value: 'date_asc',  label: 'Oldest first',    fn: (a, b) => new Date(a.uploaded_at) - new Date(b.uploaded_at) },
  { value: 'name_asc',  label: 'Name A → Z',      fn: (a, b) => a.original_name?.localeCompare(b.original_name) },
  { value: 'name_desc', label: 'Name Z → A',      fn: (a, b) => b.original_name?.localeCompare(a.original_name) },
  { value: 'size_desc', label: 'Largest first',   fn: (a, b) => b.size - a.size },
  { value: 'size_asc',  label: 'Smallest first',  fn: (a, b) => a.size - b.size },
  { value: 'type',      label: 'Type',             fn: (a, b) => (a.mime_type || '').localeCompare(b.mime_type || '') },
];

export const FILE_FILTER_OPTIONS = [
  { value: 'all',   label: 'All' },
  { value: 'image', label: 'Images',  test: (f) => f.mime_type?.startsWith('image/') },
  { value: 'pdf',   label: 'PDF',     test: (f) => f.mime_type === 'application/pdf' },
  { value: 'text',  label: 'Text',    test: (f) => f.mime_type === 'text/plain' },
  { value: 'archive', label: 'Archive', test: (f) => f.mime_type === 'application/zip' },
];

export const TRASH_SORT_OPTIONS = [
  { value: 'date_desc', label: 'Recently deleted', fn: (a, b) => new Date(b.deleted_at) - new Date(a.deleted_at) },
  { value: 'date_asc',  label: 'Oldest deleted',   fn: (a, b) => new Date(a.deleted_at) - new Date(b.deleted_at) },
  { value: 'name_asc',  label: 'Name A → Z',       fn: (a, b) => a.original_name?.localeCompare(b.original_name) },
  { value: 'name_desc', label: 'Name Z → A',       fn: (a, b) => b.original_name?.localeCompare(a.original_name) },
  { value: 'size_desc', label: 'Largest first',    fn: (a, b) => b.size - a.size },
  { value: 'size_asc',  label: 'Smallest first',   fn: (a, b) => a.size - b.size },
];

export const SHARE_SORT_OPTIONS = [
  { value: 'date_desc',      label: 'Newest first',      fn: (a, b) => new Date(b.created_at) - new Date(a.created_at) },
  { value: 'date_asc',       label: 'Oldest first',      fn: (a, b) => new Date(a.created_at) - new Date(b.created_at) },
  { value: 'name_asc',       label: 'Name A → Z',   fn: (a, b) => a.file_name?.localeCompare(b.file_name) },
  { value: 'name_desc',      label: 'Name Z → A',   fn: (a, b) => b.file_name?.localeCompare(a.file_name) },
  { value: 'downloads_desc', label: 'Downloads',    fn: (a, b) => b.download_count - a.download_count },
];

export const SHARE_FILTER_OPTIONS = [
  { value: 'all',       label: 'All' },
  { value: 'active',    label: 'Active',    test: (s) => s.status === 'active' },
  { value: 'expired',   label: 'Expired',   test: (s) => s.status === 'expired' },
  { value: 'revoked',   label: 'Revoked',   test: (s) => s.status === 'revoked' },
  { value: 'exhausted', label: 'Exhausted', test: (s) => s.status === 'exhausted' },
];
