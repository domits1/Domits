export function getStatusMeta (status) {
  const s = String(status).toLowerCase();
  switch (s) {
    case "succeeded":
      return { label: "Succeeded", tone: "is-success" };
    case "paid":
      return { label: "Paid", tone: "is-success" };
    case "pending":
      return { label: "Pending", tone: "is-pending" };
    case "incoming charge - pending":
      return { label: "incoming charge - pending", tone: "is-pending" };
    case "failed":
      return { label: "Failed", tone: "is-danger" };
    case "canceled":
      return { label: "Canceled", tone: "is-danger" };
    case "cancelled":
      return { label: "Cancelled", tone: "is-danger" };
    default:
      return { label: status || "Unknown", tone: "is-muted" };
  }
};
