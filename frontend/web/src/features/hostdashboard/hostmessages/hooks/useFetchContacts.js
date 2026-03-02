import { useState, useEffect, useCallback } from "react";
import fetchBookingDetailsAndAccommodation from "../utils/FetchBookingDetails";

const UNIFIED_API = "https://54s3llwby8.execute-api.eu-north-1.amazonaws.com/default";
const GET_USER_INFO_API = "https://gernw0crt3.execute-api.eu-north-1.amazonaws.com/default/GetUserInfo";

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

const parseCognitoAttributes = (attrsArr) => {
  if (!Array.isArray(attrsArr)) return null;

  return attrsArr.reduce((acc, a) => {
    if (a?.Name) acc[a.Name] = a.Value;
    return acc;
  }, {});
};

const fetchUserInfo = async (targetUserId) => {
  if (!targetUserId) return { givenName: "Unknown", userId: targetUserId };

  try {
    const res = await fetch(GET_USER_INFO_API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ UserId: targetUserId }),
    });

    if (!res.ok) return { givenName: "Unknown", userId: targetUserId };

    const userData = await res.json();
    const parsed = safeJsonParse(userData?.body) ?? userData?.body ?? userData;
    const first = Array.isArray(parsed) ? parsed[0] : parsed;

    const attrsArr = first?.Attributes;
    const attrs = parseCognitoAttributes(attrsArr);
    if (!attrs) return { givenName: "Unknown", userId: targetUserId };

    const resolvedUserId =
      attrs["sub"] || attrs["userId"] || attrsArr?.find?.((a) => a?.Name === "sub")?.Value || targetUserId;

    return {
      givenName: attrs["given_name"] || attrs["name"] || "Unknown",
      userId: resolvedUserId,
    };
  } catch {
    return { givenName: "Unknown", userId: targetUserId };
  }
};

const fetchLatestMessage = async (threadId, fallbackRecipientId) => {
  if (!threadId) return null;

  try {
    const url = `${UNIFIED_API}/messages?threadId=${encodeURIComponent(threadId)}`;
    const res = await fetch(url, { method: "GET", headers: { "Content-Type": "application/json" } });

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
        threadId: t.id,
        isFromUnified: true,
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

const hydrateOneContact = async ({ contact, userId, role }) => {
  const partnerId = contact?.partnerId || contact?.recipientId || contact?.userId || null;

  const [userInfo, latestMessage] = await Promise.all([
    partnerId ? fetchUserInfo(partnerId) : Promise.resolve({ givenName: "Unknown", userId: partnerId }),
    contact?.threadId ? fetchLatestMessage(contact.threadId, partnerId) : Promise.resolve(null),
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

  try {
    const bookingInfo = await fetchBookingDetailsAndAccommodation({
      hostId: hostIdForLookup,
      guestId: guestIdForLookup,
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

  return {
    ...contact,

    partnerId,
    recipientId: partnerId,
    userId: partnerId,

    givenName: userInfo?.givenName || contact?.givenName || "Unknown",
    profileImage: contact?.profileImage || null,

    latestMessage,
    accoImage,
    bookingStatus,
    arrivalDate,
    departureDate,
    propertyId,
    propertyTitle,
  };
};

const hydrateContacts = async ({ contactsList, userId, role }) => {
  const safeContacts = Array.isArray(contactsList) ? contactsList : [];
  return Promise.all(safeContacts.map((c) => hydrateOneContact({ contact: c, userId, role })));
};

const normalizeLegacy = ({ raw, isHostLegacy, userId }) => {
  const partnerId = isHostLegacy ? raw?.userId : raw?.hostId;

  return {
    ...raw,
    partnerId,
    recipientId: partnerId,
    userId: partnerId,
    hostId: raw?.hostId || (isHostLegacy ? userId : null),
    guestId: raw?.userId || (!isHostLegacy ? userId : null),
    Status: raw?.Status || raw?.status || "accepted",
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
      let unifiedContacts = [];
      try {
        const threadsRes = await fetch(`${UNIFIED_API}/threads?userId=${encodeURIComponent(userId)}`, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        });

        if (threadsRes.ok) {
          const threadsData = await threadsRes.json();
          unifiedContacts = buildUnifiedContactsFromThreads({ threads: threadsData, userId, role });
        }
      } catch {}

      if (unifiedContacts.length > 0) {
        const accepted = await hydrateContacts({ contactsList: unifiedContacts, userId, role });
        setContacts(accepted);
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

      const accepted = await hydrateContacts({ contactsList: acceptedNormalized, userId, role });
      const pending = await hydrateContacts({ contactsList: pendingNormalized, userId, role });

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
