import { ArrowUpDown } from 'lucide-react';

export default function SortFilterBar({
  sortOptions,
  sortKey,
  setSortKey,
  filterOptions = [],
  filterKey,
  setFilterKey,
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 mb-4">
      {/* Sort dropdown */}
      <div className="relative flex items-center">
        <ArrowUpDown size={12} className="absolute left-2.5 text-text-muted pointer-events-none" />
        <select
          value={sortKey}
          onChange={(e) => setSortKey(e.target.value)}
          className="input-field pl-7 pr-3 py-1.5 text-xs w-auto cursor-pointer appearance-none"
        >
          {sortOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      {/* Filter chips */}
      {filterOptions.length > 0 && (
        <div className="flex items-center gap-1 flex-wrap">
          {filterOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setFilterKey(opt.value)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-all duration-150 ${
                filterKey === opt.value
                  ? 'bg-accent/10 text-accent border-accent/30'
                  : 'bg-elevated text-text-muted border-border hover:text-text-primary hover:border-accent/20'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
