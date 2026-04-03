const MESSAGE_TIME_FORMATTER = new Intl.DateTimeFormat("en-GB", {
  hour: "2-digit",
  minute: "2-digit",
});

const SHORT_DATE_FORMATTER = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
});

export const isValidDate = (value) => value instanceof Date && !Number.isNaN(value.getTime());

export const startOfDay = (date) => {
  const nextDate = new Date(date);
  nextDate.setHours(0, 0, 0, 0);
  return nextDate;
};

export const isSameDay = (leftDate, rightDate) => {
  if (!isValidDate(leftDate) || !isValidDate(rightDate)) {
    return false;
  }

  return (
    leftDate.getFullYear() === rightDate.getFullYear() &&
    leftDate.getMonth() === rightDate.getMonth() &&
    leftDate.getDate() === rightDate.getDate()
  );
};

export const getDashboardDisplayName = (user, fallbackName) => {
  const attributes = user?.attributes || {};
  return attributes.given_name || attributes.name || attributes.preferred_username || user?.username || fallbackName;
};

export const formatDashboardMessageTime = (createdAt) => {
  const now = new Date();
  return isSameDay(createdAt, now)
    ? MESSAGE_TIME_FORMATTER.format(createdAt)
    : SHORT_DATE_FORMATTER.format(createdAt);
};

const getContactsWithLatestMessage = (contacts) =>
  (Array.isArray(contacts) ? contacts : []).filter((contact) => contact?.latestMessage?.createdAt);

const getMessagePreviewText = (text, previewFallback) => {
  const preview = String(text || previewFallback).trim();
  return preview || previewFallback;
};

export const buildRecentMessages = (contacts, fallbackName) =>
  getContactsWithLatestMessage(contacts)
    .sort((leftContact, rightContact) => {
      const leftTime = new Date(leftContact.latestMessage.createdAt).getTime();
      const rightTime = new Date(rightContact.latestMessage.createdAt).getTime();
      return rightTime - leftTime;
    })
    .slice(0, 4)
    .map((contact) => {
      const createdAt = new Date(contact?.latestMessage?.createdAt);
      return {
        id:
          contact?.threadId ||
          contact?.partnerId ||
          contact?.userId ||
          contact?.recipientId ||
          contact?.givenName,
        name: contact?.givenName || contact?.name || fallbackName,
        avatar: contact?.profileImage || null,
        text: getMessagePreviewText(contact?.latestMessage?.text, "No message preview available"),
        time: isValidDate(createdAt) ? formatDashboardMessageTime(createdAt) : "",
      };
    });

export const countContactsWithMessages = (contacts) => getContactsWithLatestMessage(contacts).length;

export const countContactsWithMessagesOnDay = (contacts, today, toDate = (value) => new Date(value)) =>
  getContactsWithLatestMessage(contacts).filter((contact) =>
    isSameDay(toDate(contact?.latestMessage?.createdAt), today)
  ).length;