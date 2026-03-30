export const safeJson = (value) => {
  try {
    if (!value) return null;
    return typeof value === "string" ? JSON.parse(value) : value;
  } catch {
    return null;
  }
};

const integrationIdPattern = /\/integrations\/([^/]+)/;
const messagingTemplateIdPattern = /\/messaging-templates\/([^/]+)/;
const messagingAutoReplyRuleIdPattern = /\/messaging-auto-replies\/([^/]+)/;

export const extractIntegrationId = (path) => {
  const match = integrationIdPattern.exec(String(path || ""));
  return match?.[1] || null;
};

export const extractMessagingTemplateId = (path) => {
  const match = messagingTemplateIdPattern.exec(String(path || ""));
  return match?.[1] || null;
};

export const extractMessagingAutoReplyRuleId = (path) => {
  const match = messagingAutoReplyRuleIdPattern.exec(String(path || ""));
  return match?.[1] || null;
};
