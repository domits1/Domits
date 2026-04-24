import { getAccessToken } from "../utils/authUtils";

const BASE_URL = "https://i8t5rc1e7b.execute-api.eu-north-1.amazonaws.com/dev/Wishlist";
const DEFAULT_WISHLIST_NAME = "My next trip";
const WISHLIST_CACHE_TTL_MS = 15000;

let wishlistsCachePromise = null;
let wishlistsCacheExpiresAt = 0;

const invalidateWishlistsCache = () => {
  wishlistsCachePromise = null;
  wishlistsCacheExpiresAt = 0;
};

const getRequestHeaders = () => {
  const headers = { "Content-Type": "application/json" };
  const token = getAccessToken();
  if (token) {
    headers.Authorization = token;
  }
  return headers;
};

const parseJson = async (response) => {
  const text = await response.text();
  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text);
  } catch {
    throw new Error("Invalid response received from wishlist service");
  }
};

const createServiceError = async (response, fallbackMessage) => {
  let details = "";
  try {
    details = await response.text();
  } catch {
    details = "";
  }

  const suffix = details ? `: ${details.slice(0, 240)}` : "";
  return new Error(`${fallbackMessage} (${response.status})${suffix}`);
};

const normalizeWishlistsMap = (data) => {
  let source;
  if (data && typeof data === "object" && !Array.isArray(data)) {
    source = data.wishlists && typeof data.wishlists === "object" ? data.wishlists : data;
  } else {
    source = {};
  }

  return Object.entries(source).reduce((acc, [name, propertyIds]) => {
    if (!Array.isArray(propertyIds)) return acc;
    acc[name] = propertyIds.filter((propertyId) => typeof propertyId === "string" && propertyId.length > 0);
    return acc;
  }, {});
};

export const fetchWishlists = async ({ forceRefresh = false } = {}) => {
  const cacheIsFresh = wishlistsCachePromise && Date.now() < wishlistsCacheExpiresAt;
  if (!forceRefresh && cacheIsFresh) {
    return wishlistsCachePromise;
  }

  wishlistsCachePromise = (async () => {
    const res = await fetch(BASE_URL, {
      method: "GET",
      headers: getRequestHeaders(),
    });

    if (!res.ok) {
      throw await createServiceError(res, "Failed to fetch wishlists");
    }

    const data = await parseJson(res);
    return { wishlists: normalizeWishlistsMap(data) };
  })();
  wishlistsCacheExpiresAt = Date.now() + WISHLIST_CACHE_TTL_MS;

  try {
    return await wishlistsCachePromise;
  } catch (error) {
    invalidateWishlistsCache();
    throw error;
  }
};

// Move accommodation to a different wishlist (PATCH)
export const moveAccommodation = async (oldName, newName, propertyId) => {
  const res = await fetch(BASE_URL, {
    method: "PATCH",
    headers: getRequestHeaders(),
    body: JSON.stringify({ oldName, newName, propertyId }),
  });

  if (!res.ok) {
    throw await createServiceError(res, "Failed to move accommodation");
  }

  const data = await parseJson(res);
  invalidateWishlistsCache();
  return data;
};

// Add or remove accommodation from a wishlist (POST / DELETE)
export const updateWishlistItem = async (propertyId, method, wishlistName = DEFAULT_WISHLIST_NAME) => {
  const res = await fetch(BASE_URL, {
    method,
    headers: getRequestHeaders(),
    body: JSON.stringify({
      propertyId,
      wishlistName,
    }),
  });

  if (!res.ok) {
    throw await createServiceError(
      res,
      `Failed to ${method === "POST" ? "add to" : "remove from"} wishlist`,
    );
  }

  const data = await parseJson(res);
  invalidateWishlistsCache();
  return data;
};

// Check if a property is in any wishlist, returns { liked, wishlistName }
export const isPropertyInAnyWishlist = async (propertyId) => {
  const data = await fetchWishlists();
  const allWishlists = data.wishlists || {};
  for (const [name, ids] of Object.entries(allWishlists)) {
    if (ids.includes(propertyId)) return { liked: true, wishlistName: name };
  }
  return { liked: false, wishlistName: null };
};

const buildWishlistItems = (wishlistsMap, wishlistName) => {
  const propertyIds = Array.isArray(wishlistsMap?.[wishlistName]) ? wishlistsMap[wishlistName] : [];
  return propertyIds.map((propertyId) => ({ propertyId }));
};

// Create a new wishlist (PUT)
export const createWishlist = async (wishlistName) => {
  const res = await fetch(BASE_URL, {
    method: "PUT",
    headers: getRequestHeaders(),
    body: JSON.stringify({ wishlistName }),
  });

  if (!res.ok) {
    throw await createServiceError(res, "Failed to create wishlist");
  }

  const data = await parseJson(res);
  invalidateWishlistsCache();
  return data;
};

// Rename a wishlist (PATCH)
export const renameWishlist = async (oldName, newName) => {
  const res = await fetch(BASE_URL, {
    method: "PATCH",
    headers: getRequestHeaders(),
    body: JSON.stringify({ oldName, newName }),
  });

  if (!res.ok) {
    throw await createServiceError(res, "Failed to rename wishlist");
  }

  const data = await parseJson(res);
  invalidateWishlistsCache();
  return data;
};

// Delete a wishlist (DELETE)
export const deleteWishlist = async (wishlistName) => {
  const res = await fetch(BASE_URL, {
    method: "DELETE",
    headers: getRequestHeaders(),
    body: JSON.stringify({ wishlistName }),
  });

  if (!res.ok) {
    throw await createServiceError(res, "Failed to delete wishlist");
  }

  const data = await parseJson(res);
  invalidateWishlistsCache();
  return data;
};

export const fetchWishlistItems = async (wishlistName = DEFAULT_WISHLIST_NAME) => {
  const { wishlists } = await fetchWishlists();
  return buildWishlistItems(wishlists, wishlistName);
};
