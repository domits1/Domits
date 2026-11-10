import React from "react";
import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import "@testing-library/jest-dom";
import About from "../pages/about/About";
import { LanguageContext } from "../context/LanguageContext";

const renderAbout = () =>
  render(
    <LanguageContext.Provider value={{ language: "en" }}>
      <MemoryRouter>
        <About />
      </MemoryRouter>
    </LanguageContext.Provider>
  );

describe("About page", () => {
  test("sends the partner success card to the host landing page", () => {
    renderAbout();

    const partnerCard = screen.getByRole("heading", { name: "Partner success" }).closest("article");

    expect(within(partnerCard).getByRole("link", { name: /learn more/i })).toHaveAttribute("href", "/landing");
  });

  test("has no link to the partner path that does not exist", () => {
    renderAbout();

    const hrefs = screen.getAllByRole("link").map((link) => link.getAttribute("href"));

    expect(hrefs).not.toContain("/partner");
  });
});
