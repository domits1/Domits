import { getAccessToken } from "../../../../services/getAccessToken";

const API = "https://ix2oc0fedf.execute-api.eu-north-1.amazonaws.com/default/invoices";

export async function getInvoices() {
  const token = await getAccessToken();
  const response = await fetch(API, {
    method: "GET",
    headers: { Authorization: token },
  });
  if (!response.ok) throw new Error(`Failed to fetch invoices: ${response.status}`);
  return response.json();
}

export async function createInvoice({ bookingId, totalAmount, nights, ratePerNight }) {
  const token = await getAccessToken();
  const response = await fetch(API, {
    method: "POST",
    headers: { Authorization: token, "Content-Type": "application/json" },
    body: JSON.stringify({ bookingId, totalAmount, nights, ratePerNight }),
  });
  if (!response.ok) throw new Error(`Failed to create invoice: ${response.status}`);
  return response.json();
}
