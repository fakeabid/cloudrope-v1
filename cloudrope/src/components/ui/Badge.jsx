const variants = {
  active:    'bg-success/10 text-success border-success/30',
  revoked:   'bg-error/10 text-error border-error/30',
  expired:   'bg-warning/10 text-warning border-warning/30',
  exhausted: 'bg-text-muted/10 text-text-muted border-text-muted/30',
  default:   'bg-elevated text-text-muted border-border',
};

export default function Badge({ status, width='', children }) {
  const cls = variants[status] || variants.default;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${cls} ${width}`}>
      {children || status}
    </span>
  );
}
