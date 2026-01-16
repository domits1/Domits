import React from "react";
import { Link } from "react-router-dom";

const SettingsPage = ({ userName = "Lotte" }) => {
  const cards = [
    {
      title: "Personal information",
      desc: "Provide your personal information so we can reach you.",
      to: "/guestdashboard/settings",
      icon: "👤",
    },
    {
      title: "Notifications",
      desc: "Choose notification preferences and how you want to be contacted.",
      to: "/guest/settings/notifications",
      icon: "🔔",
    },
    {
      title: "Login & Security",
      desc: "Update your password and secure your account.",
      to: "/guest/settings/login-security",
      icon: "🛡️",
    },
    {
      title: "Privacy & Security",
      desc: "Manage your personal data, connected services, and sharing settings.",
      to: "/guest/settings/privacy-security",
      icon: "👁️",
    },
    {
      title: "Payment & Payouts",
      desc: "Review payments, payouts, and coupons.",
      to: "/guest/settings/payment-payouts",
      icon: "💵",
    },
    {
      title: "Language & Currency",
      desc: "Choose a default language and currency.",
      to: "/guest/settings/language-currency",
      icon: "🌍",
    },
  ];

  return (
    <section className="guest-settings">
      <div className="guest-settings__container">
        <h1 className="guest-settings__title">{userName}’s Settings</h1>

        <div className="guest-settings__grid">
          {cards.map((card) => (
            <Link
              key={card.to}
              to={card.to}
              className="guest-settings__card"
            >
              <div className="guest-settings__card-head">
                <span className="guest-settings__card-icon">
                  {card.icon}
                </span>
                <span className="guest-settings__card-title">
                  {card.title}
                </span>
              </div>

              <p className="guest-settings__card-desc">
                {card.desc}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};

export default SettingsPage;
