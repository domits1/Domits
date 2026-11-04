import React from "react";
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Footer from "./Footer";
import { LanguageContext } from "../../context/LanguageContext";

const renderFooter = () =>
  render(
    <LanguageContext.Provider value={{ language: "en" }}>
      <MemoryRouter>
        <Footer />
      </MemoryRouter>
    </LanguageContext.Provider>
  );

describe("Footer helpdesk links", () => {
  test("sends guests to the guest FAQ on bookdomits.com in the same tab", () => {
    renderFooter();

    const guestHelpdesk = screen.getByRole("link", { name: "Helpdesk for guests" });
    expect(guestHelpdesk).toHaveAttribute("href", "https://bookdomits.com/guest-faq-frequently-asked-questions/");
    expect(guestHelpdesk).not.toHaveAttribute("target", "_blank");
  });

  test("sends hosts to the host FAQ on bookdomits.com in the same tab, right after Become a host", () => {
    renderFooter();

    const hostHelpdesk = screen.getByRole("link", { name: "Helpdesk for hosts" });
    expect(hostHelpdesk).toHaveAttribute("href", "https://bookdomits.com/host-faq-frequently-asked-questions/");
    expect(hostHelpdesk).not.toHaveAttribute("target", "_blank");

    const footerLinks = screen.getAllByRole("link").map((link) => link.textContent);
    expect(footerLinks.indexOf("Helpdesk for hosts")).toBe(footerLinks.indexOf("Become a host") + 1);
  });
});
