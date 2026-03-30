const UNIFIED_MESSAGING_API = "https://54s3llwby8.execute-api.eu-north-1.amazonaws.com/default";

const jsonHeaders = { "Content-Type": "application/json" };

async function parseResponse(response) {
  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(errorText || `Request failed with ${response.status}`);
  }

  return response.json();
}

export async function fetchMessagingPreferences(userId) {
  const response = await fetch(
    `${UNIFIED_MESSAGING_API}/messaging-preferences?userId=${encodeURIComponent(userId)}`,
    { method: "GET", headers: jsonHeaders }
  );
  return parseResponse(response);
}

export async function saveMessagingPreferences(payload) {
  const response = await fetch(`${UNIFIED_MESSAGING_API}/messaging-preferences`, {
    method: "PUT",
    headers: jsonHeaders,
    body: JSON.stringify(payload),
  });
  return parseResponse(response);
}

export async function listMessagingTemplates(userId, includeArchived = true) {
  const response = await fetch(
    `${UNIFIED_MESSAGING_API}/messaging-templates?userId=${encodeURIComponent(
      userId
    )}&includeArchived=${includeArchived}`,
    { method: "GET", headers: jsonHeaders }
  );
  return parseResponse(response);
}

export async function createMessagingTemplate(payload) {
  const response = await fetch(`${UNIFIED_MESSAGING_API}/messaging-templates`, {
    method: "POST",
    headers: jsonHeaders,
    body: JSON.stringify(payload),
  });
  return parseResponse(response);
}

export async function updateMessagingTemplate(templateId, payload) {
  const response = await fetch(`${UNIFIED_MESSAGING_API}/messaging-templates/${encodeURIComponent(templateId)}`, {
    method: "PATCH",
    headers: jsonHeaders,
    body: JSON.stringify(payload),
  });
  return parseResponse(response);
}

export async function duplicateMessagingTemplate(templateId) {
  const response = await fetch(
    `${UNIFIED_MESSAGING_API}/messaging-templates/${encodeURIComponent(templateId)}/duplicate`,
    {
      method: "POST",
      headers: jsonHeaders,
    }
  );
  return parseResponse(response);
}

export async function listMessagingAutoReplyRules(userId) {
  const response = await fetch(
    `${UNIFIED_MESSAGING_API}/messaging-auto-replies?userId=${encodeURIComponent(userId)}`,
    { method: "GET", headers: jsonHeaders }
  );
  return parseResponse(response);
}

export async function createMessagingAutoReplyRule(payload) {
  const response = await fetch(`${UNIFIED_MESSAGING_API}/messaging-auto-replies`, {
    method: "POST",
    headers: jsonHeaders,
    body: JSON.stringify(payload),
  });
  return parseResponse(response);
}

export async function updateMessagingAutoReplyRule(ruleId, payload) {
  const response = await fetch(`${UNIFIED_MESSAGING_API}/messaging-auto-replies/${encodeURIComponent(ruleId)}`, {
    method: "PATCH",
    headers: jsonHeaders,
    body: JSON.stringify(payload),
  });
  return parseResponse(response);
}
