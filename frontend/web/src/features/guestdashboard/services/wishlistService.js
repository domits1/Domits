import { getAccessToken } from "../utils/authUtils";

const BASE_URL = "https://i8t5rc1e7b.execute-api.eu-north-1.amazonaws.com/dev/Wishlist";

// Fetch user's wishlists
export const fetchWishlists = async () => {
  const token = getAccessToken();
  const res = await fetch(BASE_URL, {
    method: "GET",
    headers: {
      Authorization: token,
      "Content-Type": "application/json",
      Origin: window.location.origin,
    },
  });

  if (!res.ok) {
    throw new Error("Failed to fetch wishlists");
  }

  return res.json();
};

// Move accommodation to a different wishlist
export const moveAccommodation = async (oldName, newName, propertyId) => {
  const token = getAccessToken();

  const res = await fetch(BASE_URL, {
    method: "PATCH",
    headers: {
      Authorization: token,
      "Content-Type": "application/json",
      Origin: window.location.origin,
    },
    body: JSON.stringify({ oldName, newName, propertyId }),
  });

  if (!res.ok) {
    throw new Error("Failed to move accommodation");
  }

  return res.json();
};
