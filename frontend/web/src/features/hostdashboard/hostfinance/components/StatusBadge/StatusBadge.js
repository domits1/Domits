import { getStatusMeta } from "./getStatusMeta";

export function StatusBadge ({ status }) {
  const meta = getStatusMeta(status);
  return (
    <span className={`status-badge ${meta.tone}`}>
      <span className="status-dot" />
      {meta.label}
    </span>
  );
};
