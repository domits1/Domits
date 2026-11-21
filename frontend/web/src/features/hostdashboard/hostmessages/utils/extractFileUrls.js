const toAttachmentList = (attachments) => {
  if (Array.isArray(attachments)) return attachments;
  if (typeof attachments !== "string") return [];

  try {
    const parsed = JSON.parse(attachments);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const extractFileUrls = (attachments) =>
  toAttachmentList(attachments)
    .map((attachment) => attachment?.url)
    .filter(Boolean);
