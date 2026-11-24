import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { LanguageContext } from "../../../../context/LanguageContext";
import en from "../../../../content/en.json";
import nl from "../../../../content/nl.json";
import OwnerManagementLayout from "./OwnerManagementLayout";
import HostOwnerStatements from "./HostOwnerStatements";

const renderAt = (pathname, language = "en") =>
  render(
    <LanguageContext.Provider value={{ language, setLanguage: jest.fn() }}>
      <MemoryRouter initialEntries={[pathname]}>
        <Routes>
          <Route path="/owners" element={<OwnerManagementLayout />}>
            <Route index element={<div>Owners page</div>} />
            <Route path="statements" element={<HostOwnerStatements />} />
          </Route>
        </Routes>
      </MemoryRouter>
    </LanguageContext.Provider>
  );

describe("HostOwnerStatements", () => {
  test("renders the empty overview and keeps statements separate from payouts", () => {
    renderAt("/owners/statements");

    expect(screen.getByRole("heading", { name: en.hostOwnerStatements.title })).toBeTruthy();
    expect(screen.getByRole("heading", { name: en.hostOwnerStatements.emptyTitle })).toBeTruthy();
    expect(screen.getByText(en.hostOwnerStatements.emptyDescription)).toBeTruthy();
    expect(screen.getByText(en.hostOwnerStatements.payoutNote)).toBeTruthy();
  });

  test("marks the statements tab as active on the statements route", () => {
    renderAt("/owners/statements");

    expect(screen.getByRole("link", { name: en.ownerManagementNavigation.statements }).getAttribute("aria-current")).toBe("page");
    expect(screen.getByRole("link", { name: en.ownerManagementNavigation.owners }).getAttribute("aria-current")).toBeNull();
  });

  test("keeps the owner list as the default owner management route", () => {
    renderAt("/owners");

    expect(screen.getByText("Owners page")).toBeTruthy();
    expect(screen.getByRole("link", { name: en.ownerManagementNavigation.owners }).getAttribute("aria-current")).toBe("page");
    expect(screen.getByRole("link", { name: en.ownerManagementNavigation.statements }).getAttribute("href")).toBe("/owners/statements");
  });

  test("uses the selected language", () => {
    renderAt("/owners/statements", "nl");

    expect(screen.getByRole("heading", { name: nl.hostOwnerStatements.title })).toBeTruthy();
    expect(screen.getByRole("link", { name: nl.ownerManagementNavigation.statements })).toBeTruthy();
  });

  test("falls back to English for unsupported languages", () => {
    renderAt("/owners/statements", "fr");

    expect(screen.getByRole("heading", { name: en.hostOwnerStatements.title })).toBeTruthy();
  });
});
