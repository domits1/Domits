import React from "react";

const PrivacyIllustration = () => (
  <svg
    className="privacy-illustration"
    width="240"
    height="240"
    viewBox="0 0 240 240"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    role="img"
    aria-label="Privacy document protected by a lock"
  >
    {/* Soft background shapes */}
    <circle cx="120" cy="120" r="62" fill="#0D9813" opacity="0.06" />
    <circle cx="190" cy="78" r="16" fill="#0D9813" opacity="0.12" />

    {/* Foliage behind the document */}
    <g opacity="0.18" fill="#0D9813">
      <path d="M58 178c14-6 30-2 40 10-16 4-31-1-40-10z" />
      <path d="M50 158c12 2 22 12 24 26-12-5-21-15-24-26z" />
      <path d="M182 150c-13 1-25 11-29 26 13-3 24-13 29-26z" />
      <path d="M196 172c-12 4-21 15-22 29 11-7 19-18 22-29z" />
    </g>

    {/* Back sheet (offset) */}
    <rect x="96" y="74" width="92" height="116" rx="10" fill="#0D9813" opacity="0.08" />

    {/* Front document */}
    <rect x="64" y="68" width="100" height="124" rx="12" fill="#FBFEFB" stroke="#E6F2E7" strokeWidth="2" />

    {/* Padlock */}
    <g>
      <path
        d="M101 116v-8a13 13 0 0 1 26 0v8"
        stroke="#0D9813"
        strokeWidth="7"
        fill="none"
        strokeLinecap="round"
      />
      <rect x="94" y="116" width="40" height="32" rx="6" fill="#0D9813" />
      <circle cx="114" cy="129" r="4.5" fill="#FBFEFB" />
      <rect x="111.5" y="129" width="5" height="9" rx="2.5" fill="#FBFEFB" />
    </g>

    {/* Text lines */}
    <g fill="#0D9813" opacity="0.22">
      <rect x="86" y="160" width="56" height="5" rx="2.5" />
      <rect x="86" y="172" width="40" height="5" rx="2.5" />
    </g>
  </svg>
);

export default PrivacyIllustration;
