import { useState, useEffect, useCallback } from "react";
import fetchBookingDetailsAndAccommodation from "../utils/FetchBookingDetails";
import {
  fetchUserProfileById,
  getEmptyUserProfile,
} from "../../services/fetchUserProfileById";
import { getAccessToken } from "../../../../services/getAccessToken";

const UNIFIED_API = "https://54s3llwby8.execute-api.eu-north-1.amazonaws.com/default";

const LEGACY_HOST_CONTACTS_API = "https://d1mhedhjkb.execute-api.eu-north-1.amazonaws.com/default/FetchContacts";
const LEGACY_GUEST_CONTACTS_API = "https://d1mhedhjkb.execute-api.eu-north-1.amazonaws.com/default/FetchContacts_Guest";

const safeJsonParse = (v) => {
  try {
    return typeof v === "string" ? JSON.parse(v) : v;
  } catch {
    return null;
  }
};

const toIso = (v) => {
  const d = new Date(v ?? Date.now());
  return Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
};

const normalizePhoneDisplay = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return null;

  const digits = raw.replaceAll(/[^\d]/g, "");
  if (!digits) return raw;

  if (digits.startsWith("31") && digits.length === 11) {
    return `+${digits.slice(0, 2)} ${digits.slice(2, 3)} ${digits.slice(3, 7)} ${digits.slice(7)}`;
  }

  if (digits.length > 9) {
    return `+${digits}`;
  }

  return raw;
};

const looksLikePhoneIdentifier = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return false;
  return /^[\d+\-\s()]+$/.test(raw);
};

const requireToken = (token) => {
  const normalized = String(token || "").trim();
  if (!normalized) throw new Error("Authentication token is required.");
  return normalized;
};

const buildAuthHeaders = (token = null) => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${requireToken(token)}`,
});

const fetchResolvedUserProfile = async (targetUserId) => {
  if (!targetUserId) {
    return getEmptyUserProfile(targetUserId);
  }

  if (looksLikePhoneIdentifier(targetUserId)) {
    return {
      ...getEmptyUserProfile(targetUserId),
      givenName: normalizePhoneDisplay(targetUserId),
      userId: targetUserId,
      profileImage: null,
    };
  }

  try {
    const profile = await fetchUserProfileById(targetUserId);
    return profile || getEmptyUserProfile(targetUserId);
  } catch {
    return getEmptyUserProfile(targetUserId);
  }
};

const fetchLatestMessage = async (threadId, fallbackRecipientId, token = null) => {
  if (!threadId) return null;
  if (!token) return null;

  try {
    const url = `${UNIFIED_API}/messages?threadId=${encodeURIComponent(threadId)}`;
    const res = await fetch(url, { method: "GET", headers: buildAuthHeaders(token) });

    if (!res.ok) return null;

    const messages = await res.json();
    if (!Array.isArray(messages) || messages.length === 0) return null;

    const latest = messages[messages.length - 1];
    let metadata = latest?.metadata || {};
    if (typeof metadata === "string") metadata = safeJsonParse(metadata) || {};

    return {
      text: latest?.content || latest?.text || "",
      createdAt: toIso(latest?.createdAt),
      isAutomated: metadata?.isAutomated || false,
      senderId: latest?.senderId || latest?.userId || null,
      recipientId: latest?.recipientId || fallbackRecipientId || null,
      threadId: latest?.threadId || threadId || null,
      platform: latest?.platform || metadata?.channel || null,
      metadata,
    };
  } catch {
    return null;
  }
};

const getPartnerIdFromThread = ({ thread, userId, role }) => {
  const hostId = thread?.hostId;
  const guestId = thread?.guestId;
  if (!hostId || !guestId) return null;

  if (String(hostId) === String(userId)) return guestId;
  if (String(guestId) === String(userId)) return hostId;

  return role === "host" ? guestId : hostId;
};

const buildUnifiedContactsFromThreads = ({ threads, userId, role }) => {
  const list = Array.isArray(threads) ? threads : [];

  return list
    .filter((t) => t?.hostId && t?.guestId && String(t.hostId) !== String(t.guestId))
    .map((t) => {
      const partnerId = getPartnerIdFromThread({ thread: t, userId, role });

      return {
        partnerId,
        recipientId: partnerId,
        userId: partnerId,

        hostId: t.hostId,
        guestId: t.guestId,

        Status: "accepted",
        AccoId: t.propertyId,
        propertyId: t.propertyId,
        bookingId: t.bookingId || t.bookingid || null,
        threadId: t.id,
        isFromUnified: true,
        platform: t.platform || "DOMITS",
        externalThreadId: t.externalThreadId || null,
        integrationAccountId: t.integrationaccountid || t.integrationAccountId || null,
      };
    })
    .filter((c) => c.partnerId && String(c.partnerId) !== String(userId));
};

const computeLookupIds = ({ threadHostId, threadGuestId, userId, partnerId, role }) => {
  const fallbackHost = role === "guest" ? partnerId : userId;
  const fallbackGuest = role === "guest" ? userId : partnerId;

  if (!threadHostId || !threadGuestId) {
    return { hostIdForLookup: fallbackHost, guestIdForLookup: fallbackGuest };
  }

  if (String(threadHostId) === String(userId) || String(threadGuestId) === String(userId)) {
    return { hostIdForLookup: threadHostId, guestIdForLookup: threadGuestId };
  }

  return { hostIdForLookup: fallbackHost, guestIdForLookup: fallbackGuest };
};

const hydrateOneContact = async ({ contact, userId, role, token = null }) => {
  const partnerId = contact?.partnerId || contact?.recipientId || contact?.userId || null;
  const platform = String(contact?.platform || "DOMITS").toUpperCase();
  const isWhatsApp = platform === "WHATSAPP";

  const [userInfo, latestMessage] = await Promise.all([
    fetchResolvedUserProfile(partnerId),
    contact?.threadId ? fetchLatestMessage(contact.threadId, partnerId, token) : Promise.resolve(null),
  ]);

  const threadHostId = contact?.hostId || null;
  const threadGuestId = contact?.guestId || null;

  const { hostIdForLookup, guestIdForLookup } = computeLookupIds({
    threadHostId,
    threadGuestId,
    userId,
    partnerId,
    role,
  });

  let accoImage = null;
  let bookingStatus = null;
  let arrivalDate = null;
  let departureDate = null;
  let propertyId = contact?.propertyId || contact?.AccoId || null;
  let propertyTitle = null;

  if (!isWhatsApp) {
    try {
      const bookingInfo = await fetchBookingDetailsAndAccommodation({
        hostId: hostIdForLookup,
        guestId: guestIdForLookup,
        bookingId: contact?.bookingId || contact?.bookingid || null,
        propertyId: contact?.propertyId || contact?.AccoId || null,
        token,
        withAuth: role !== "guest",
        accommodationEndpoint: role === "guest" ? "bookingEngine/listingDetails" : "hostDashboard/single",
      });

      accoImage = bookingInfo?.accoImage || null;
      bookingStatus = bookingInfo?.bookingStatus || null;
      arrivalDate = bookingInfo?.arrivalDate || null;
      departureDate = bookingInfo?.departureDate || null;
      propertyId = bookingInfo?.propertyId || propertyId;
      propertyTitle = bookingInfo?.propertyTitle || null;
    } catch {}
  }

  const resolvedInfoName =
    userInfo?.givenName && userInfo.givenName !== "Unknown" && userInfo.givenName.trim().length > 0
      ? userInfo.givenName
      : null;

  const contactNameFallback =
    normalizePhoneDisplay(partnerId) ||
    contact?.givenName ||
    contact?.name ||
    contact?.fullName ||
    contact?.displayName ||
    contact?.contactName ||
    "Unknown";

  return {
    ...contact,

    partnerId,
    recipientId: partnerId,
    userId: partnerId,

    givenName: resolvedInfoName || contactNameFallback,
    profileImage: contact?.profileImage || userInfo?.profileImage || null,

    latestMessage,
    accoImage,
    bookingStatus,
    arrivalDate,
    departureDate,
    propertyId,
    propertyTitle,
    bookingId: contact?.bookingId || contact?.bookingid || null,
    platform,
    channelLabel: platform === "WHATSAPP" ? "WhatsApp" : platform,
    isWhatsApp,
    externalThreadId: contact?.externalThreadId || null,
    integrationAccountId: contact?.integrationAccountId || null,
  };
};

const hydrateContacts = async ({ contactsList, userId, role, token = null }) => {
  const safeContacts = Array.isArray(contactsList) ? contactsList : [];
  return Promise.all(safeContacts.map((c) => hydrateOneContact({ contact: c, userId, role, token })));
};

const getContactMergeKey = (contact, userId) => {
  if (contact?.threadId) return `thread:${contact.threadId}`;

  const partnerId = contact?.partnerId || contact?.recipientId || contact?.userId || null;
  const propertyId = contact?.propertyId || contact?.AccoId || "";
  const bookingId = contact?.bookingId || contact?.bookingid || "";
  const platform = String(contact?.platform || "DOMITS").toUpperCase();

  return [
    "participants",
    userId,
    partnerId,
    propertyId,
    bookingId,
    platform,
  ].join(":");
};

const mergeContacts = ({ primaryContacts, secondaryContacts, userId }) => {
  const merged = [];
  const seen = new Set();

  for (const contact of [...(primaryContacts || []), ...(secondaryContacts || [])]) {
    const key = getContactMergeKey(contact, userId);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    merged.push(contact);
  }

  return merged;
};

const normalizeLegacy = ({ raw, isHostLegacy, userId }) => {
  const partnerId = isHostLegacy ? raw?.userId : raw?.hostId;

  const fallbackGuestId = isHostLegacy ? null : userId;

  return {
    ...raw,
    partnerId,
    recipientId: partnerId,
    userId: partnerId,
    hostId: raw?.hostId || (isHostLegacy ? userId : null),
    guestId: raw?.userId || fallbackGuestId,
    Status: raw?.Status || raw?.status || "accepted",
    platform: "DOMITS",
  };
};

const useFetchContacts = (userId, role) => {
  const [contacts, setContacts] = useState([]);
  const [pendingContacts, setPendingContacts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchContacts = useCallback(async () => {
    if (!userId) {
      setContacts([]);
      setPendingContacts([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const token = requireToken(getAccessToken());
      let unifiedContacts = [];
      try {
        const threadsRes = await fetch(`${UNIFIED_API}/threads`, {
          method: "GET",
          headers: buildAuthHeaders(token),
        });

        if (threadsRes.ok) {
          const threadsData = await threadsRes.json();
          unifiedContacts = buildUnifiedContactsFromThreads({ threads: threadsData, userId, role });
        }
      } catch {}

      if (role === "guest") {
        if (unifiedContacts.length > 0) {
          const accepted = await hydrateContacts({ contactsList: unifiedContacts, userId, role, token });
          setContacts(accepted);
          setPendingContacts([]);
          return;
        }

        setContacts([]);
        setPendingContacts([]);
        return;
      }

      const isHostLegacy = role === "host";
      const endpoint = isHostLegacy ? LEGACY_HOST_CONTACTS_API : LEGACY_GUEST_CONTACTS_API;
      const requestData = isHostLegacy ? { hostID: userId } : { userID: userId };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestData),
      });

      if (!res.ok) throw new Error("Failed to fetch contacts");

      const responseData = await res.json();
      const parsed = safeJsonParse(responseData?.body) ?? responseData?.body ?? { accepted: [], pending: [] };

      const acceptedRaw = Array.isArray(parsed?.accepted) ? parsed.accepted : [];
      const pendingRaw = Array.isArray(parsed?.pending) ? parsed.pending : [];

      const acceptedNormalized = acceptedRaw.map((r) => normalizeLegacy({ raw: r, isHostLegacy, userId }));
      const pendingNormalized = (isHostLegacy ? pendingRaw.filter((c) => c?.userId !== userId) : pendingRaw).map((r) =>
        normalizeLegacy({ raw: r, isHostLegacy, userId })
      );

      const acceptedContacts = mergeContacts({
        primaryContacts: unifiedContacts,
        secondaryContacts: acceptedNormalized,
        userId,
      });

      const accepted = await hydrateContacts({ contactsList: acceptedContacts, userId, role, token });
      const pending = await hydrateContacts({ contactsList: pendingNormalized, userId, role, token });

      setContacts(accepted);
      setPendingContacts(pending);
    } catch (err) {
      setError("Error fetching contacts: " + (err?.message || String(err)));
      setContacts([]);
      setPendingContacts([]);
    } finally {
      setLoading(false);
    }
  }, [userId, role]);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  return { contacts, pendingContacts, loading, error, setContacts };
};

export default useFetchContacts;
