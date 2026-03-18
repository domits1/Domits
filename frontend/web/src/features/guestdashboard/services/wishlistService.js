import { getAccessToken } from "../utils/authUtils";

const BASE_URL = "https://i8t5rc1e7b.execute-api.eu-north-1.amazonaws.com/dev/Wishlist";
const DEFAULT_WISHLIST_NAME = "My next trip";

const getRequestHeaders = () => {
  const headers = { "Content-Type": "application/json" };
  const token = getAccessToken();
  if (token) {
    headers.Authorization = token;
  }
  return headers;
};

const parseJson = async (response) => {
  try {
    return await response.json();
  } catch (error) {
    console.warn("Failed to parse response JSON:", error);
    return {};
  }
};

const normalizeWishlistItems = (data) => {
  let items;
  if (Array.isArray(data)) {
    items = data;
  } else if (Array.isArray(data?.items)) {
    items = data.items;
  } else {
    items = [];
  }

  return items.filter((item) => typeof item?.propertyId === "string" && item.propertyId.length > 0);
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

// Fetch user's wishlists (GET)
export const fetchWishlists = async () => {
  const res = await fetch(BASE_URL, {
    method: "GET",
    headers: getRequestHeaders(),
  });

  if (!res.ok) {
    throw new Error("Failed to fetch wishlists");
  }

  const data = await parseJson(res);
  return { wishlists: normalizeWishlistsMap(data) };
};

// Move accommodation to a different wishlist (PATCH)
export const moveAccommodation = async (oldName, newName, propertyId) => {
  const res = await fetch(BASE_URL, {
    method: "PATCH",
    headers: getRequestHeaders(),
    body: JSON.stringify({ oldName, newName, propertyId }),
  });

  if (!res.ok) {
    throw new Error("Failed to move accommodation");
  }

  return res.json();
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
    throw new Error(`Failed to ${method === "POST" ? "add to" : "remove from"} wishlist`);
  }

  return res.json();
};

// Check if a property is in any wishlist
export const isPropertyInAnyWishlist = async (propertyId) => {
  const data = await fetchWishlists();
  const allWishlists = data.wishlists || {};
  const likedIds = Object.values(allWishlists).flat();
  return likedIds.includes(propertyId);
};

// Fetch real item count for a specific wishlist (POST)
export const fetchWishlistItemCount = async (wishlistName) => {
  const res = await fetch(BASE_URL, {
    method: "POST",
    headers: getRequestHeaders(),
    body: JSON.stringify({
      action: "getWishlist",
      wishlistName,
    }),
  });

  if (!res.ok) {
    throw new Error(`Failed to get item count for wishlist '${wishlistName}'`);
  }

  const data = await parseJson(res);
  return { items: normalizeWishlistItems(data) };
};

// Create a new wishlist (PUT)
export const createWishlist = async (wishlistName) => {
  const res = await fetch(BASE_URL, {
    method: "PUT",
    headers: getRequestHeaders(),
    body: JSON.stringify({ wishlistName }),
  });

  if (!res.ok) {
    throw new Error("Failed to create wishlist");
  }

  return res.json();
};

// Rename a wishlist (PATCH)
export const renameWishlist = async (oldName, newName) => {
  const res = await fetch(BASE_URL, {
    method: "PATCH",
    headers: getRequestHeaders(),
    body: JSON.stringify({ oldName, newName }),
  });

  if (!res.ok) {
    throw new Error("Failed to rename wishlist");
  }

  return res.json();
};

// Delete a wishlist (DELETE)
export const deleteWishlist = async (wishlistName) => {
  const res = await fetch(BASE_URL, {
    method: "DELETE",
    headers: getRequestHeaders(),
    body: JSON.stringify({ wishlistName }),
  });

  if (!res.ok) {
    throw new Error("Failed to delete wishlist");
  }

  return res.json();
};

export const fetchWishlistItems = async (wishlistName = DEFAULT_WISHLIST_NAME) => {
  const response = await fetchWishlistItemCount(wishlistName);
  return response.items;
};
