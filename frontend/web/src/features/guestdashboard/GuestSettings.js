import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Auth } from "aws-amplify";

// MUI Icons
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
import NotificationsNoneIcon from "@mui/icons-material/NotificationsNone";
import SecurityIcon from "@mui/icons-material/Security";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import PaymentsOutlinedIcon from "@mui/icons-material/PaymentsOutlined";
import LanguageOutlinedIcon from "@mui/icons-material/LanguageOutlined";

const SettingsOverview = () => {
  const [userName, setUserName] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const authUser = await Auth.currentAuthenticatedUser();
        const attrs = authUser?.attributes || {};

        const resolvedName =
          (attrs.given_name ?? "").trim() ||
          (attrs.name ?? "").trim() ||
          "";

        setUserName(resolvedName);
      } catch {
        setUserName("");
      }
    })();
  }, []);

  const cards = [
    {
      title: "Personal information",
      desc: "Provide your personal information so we can reach you.",
      to: "/guest/settings/personal-info",
      icon: <PersonOutlineIcon />,
    },
    {
      title: "Notifications",
      desc: "Choose notification preferences and how you want to be contacted.",
      to: "/guest/settings/notifications",
      icon: <NotificationsNoneIcon />,
    },
    {
      title: "Login & Security",
      desc: "Update your password and secure your account.",
      to: "/guest/settings/login-security",
      icon: <SecurityIcon />,
    },
    {
      title: "Privacy & Security",
      desc: "Manage your personal data, connected services, and sharing settings.",
      to: "/guest/settings/privacy-security",
      icon: <VisibilityOutlinedIcon />,
    },
    {
      title: "Payment & Payouts",
      desc: "Review payments, payouts, and coupons.",
      to: "/guest/settings/payment-payouts",
      icon: <PaymentsOutlinedIcon />,
    },
    {
      title: "Language & Currency",
      desc: "Choose a default language and currency.",
      to: "/guest/settings/language-currency",
      icon: <LanguageOutlinedIcon />,
    },
  ];

  return (
    <section className="guest-settings">
      <div className="guest-settings__container">
        <h1 className="guest-settings__title">
          {userName ? `${userName}’s Settings` : "Settings"}
        </h1>

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

export default SettingsOverview;
