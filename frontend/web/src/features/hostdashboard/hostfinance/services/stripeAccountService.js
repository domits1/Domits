import { getAccessToken } from "../../../../services/getAccessToken";

const API = "https://hamuly8izh.execute-api.eu-north-1.amazonaws.com/development/payments";

export async function getStripeAccountDetails() {
  const token = await getAccessToken();
  const response = await fetch(API, {
    method: "GET",
    headers: { Authorization: token },
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`HTTP error! Status: ${response.status}`);
  }

  const data = await response.json();
  return data.details;
}

export async function createStripeAccount() {
  const token = await getAccessToken();
  const response = await fetch(API, {
    method: "POST",
    headers: { Authorization: token },
  });

  if (!response.ok) {
    throw new Error(`HTTP error! Status: ${response.status}`);
  }

  const data = await response.json();
  return data.details;
}

export async function getCharges() {
  const token = await getAccessToken();
  const response = await fetch(
    "https://4ac2ngbvlb.execute-api.eu-north-1.amazonaws.com/deployment/payments/retrieve-user-charges",
    {
      method: "GET",
      headers: { Authorization: token },
    }
  );

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`HTTP error! Status: ${response.status}`);
  }

  const data = await response.json();
  return data.details;
}

export async function getPayouts() {
  const token = await getAccessToken();
  const response = await fetch(
    "https://4ac2ngbvlb.execute-api.eu-north-1.amazonaws.com/deployment/payments/retrieve-user-payouts",
    {
      method: "GET",
      headers: { Authorization: token },
    }
  );

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`HTTP error! Status: ${response.status}`);
  }

  const data = await response.json();
  return data.details;
}

export async function getHostBalance() {
  const token = await getAccessToken();
  const response = await fetch(
    "https://4ac2ngbvlb.execute-api.eu-north-1.amazonaws.com/deployment/payments/retrieve-user-balance",
    {
      method: "GET",
      headers: { Authorization: token },
    }
  );

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`HTTP error! Status: ${response.status}`);
  }

  const data = await response.json();
  return data.details;
}

export async function setPayoutSchedule(event) {
  const token = await getAccessToken();
  const response = await fetch(
    "https://4ac2ngbvlb.execute-api.eu-north-1.amazonaws.com/deployment/payments/set-payout-schedule",
    {
      method: "POST",
      headers: { Authorization: token },
      body: JSON.stringify(event),
    }
  );

  if (!response.ok) {
    throw new Error(`HTTP error! Status: ${response.status}`);
  }

  const data = await response.json();
  return data.details;
}

export async function getPayoutSchedule() {
  const token = await getAccessToken();
  const response = await fetch(
    "https://4ac2ngbvlb.execute-api.eu-north-1.amazonaws.com/deployment/payments/retrieve-user-payout-schedule",
    {
      method: "GET",
      headers: { Authorization: token },
    }
  );

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`HTTP error! Status: ${response.status}`);
  }

  const data = await response.json();
  return data.details;
}
