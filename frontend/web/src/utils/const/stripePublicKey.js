import publicKeys from "./publicKeys.json";

const STRIPE_MODE = String(process.env.REACT_APP_STRIPE_MODE || "LIVE")
  .trim()
  .toUpperCase();
const STRIPE_PUBLIC_KEY = publicKeys.STRIPE_PUBLIC_KEYS[STRIPE_MODE];

if (!STRIPE_PUBLIC_KEY) {
  throw new Error(`Unknown REACT_APP_STRIPE_MODE "${STRIPE_MODE}"; expected LIVE, TEST or SANDBOX.`);
}

export { STRIPE_MODE, STRIPE_PUBLIC_KEY };