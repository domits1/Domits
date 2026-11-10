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
  test.each([
    ["Helpdesk for guests", "https://bookdomits.com/guest-faq-frequently-asked-questions/"],
    ["Helpdesk for hosts", "https://bookdomits.com/host-faq-frequently-asked-questions/"],
  ])("%s links to %s in the same tab", (linkName, expectedUrl) => {
    renderFooter();

    const helpdeskLink = screen.getByRole("link", { name: linkName });
    expect(helpdeskLink).toHaveAttribute("href", expectedUrl);
    expect(helpdeskLink).not.toHaveAttribute("target", "_blank");
  });

  test("Helpdesk for hosts comes directly after Become a host", () => {
    renderFooter();

    const footerLinks = screen.getAllByRole("link").map((link) => link.textContent);
    expect(footerLinks.indexOf("Helpdesk for hosts")).toBe(footerLinks.indexOf("Become a host") + 1);
  });
});
