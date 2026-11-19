import React from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import en from "../../../../content/en.json";
import nl from "../../../../content/nl.json";
import OwnersTable from "./OwnersTable";

const t = en.hostOwners;

const owner = (overrides = {}) => ({
  id: "owner-1",
  first_name: "Anna",
  last_name: "de Vries",
  company_name: null,
  owner_type: "individual",
  status: "active",
  properties: [],
  ...overrides,
});

const share = (overrides = {}) => ({
  property_id: "property-1",
  property_title: "Villa Kalimaya III",
  ownership_basis_points: 10000,
  effective_from: 1782864000000,
  effective_to: null,
  ...overrides,
});

const OwnersRoute = ({ children }) => (
  <MemoryRouter initialEntries={["/hostdashboard/owners"]}>
    <Routes>
      <Route path="/hostdashboard/owners" element={children} />
    </Routes>
  </MemoryRouter>
);

const renderTable = (owners, { texts = t, language = "en", onEdit = jest.fn() } = {}) =>
  render(<OwnersTable owners={owners} t={texts} language={language} onEdit={onEdit} />, { wrapper: OwnersRoute });

const rowFor = (name) => screen.getByRole("row", { name: new RegExp(name) });

describe("OwnersTable", () => {
  test("has a header for every column", () => {
    renderTable([owner()]);

    const headers = screen.getAllByRole("columnheader").map((header) => header.textContent);
    expect(headers).toEqual([t.columnName, t.columnType, t.columnStatus, t.columnProperties, t.columnActions]);
  });

  test("gives every row an Edit button named after the owner that passes the owner on", () => {
    const onEdit = jest.fn();
    const second = owner({ id: "owner-2", first_name: "Bram", last_name: "Jansen" });
    renderTable([owner(), second], { onEdit });

    const editButton = screen.getByRole("button", { name: "Edit Bram Jansen" });
    expect(editButton.textContent).toBe(t.editOwner);
    fireEvent.click(editButton);

    expect(onEdit).toHaveBeenCalledTimes(1);
    expect(onEdit).toHaveBeenCalledWith(second);
  });

  test("links each owner's name to that owner's detail page", () => {
    renderTable([owner(), owner({ id: "owner-2", first_name: "Bram", last_name: "Jansen" })]);

    const hrefOf = (name) => screen.getByRole("link", { name }).getAttribute("href");
    expect(hrefOf("Anna de Vries")).toBe("/hostdashboard/owners/owner-1");
    expect(hrefOf("Bram Jansen")).toBe("/hostdashboard/owners/owner-2");
    expect(screen.getByRole("button", { name: "Edit Bram Jansen" })).toBeTruthy();
  });

  test("shows the full name, with the company name below it when present", () => {
    renderTable([owner(), owner({ id: "owner-2", first_name: "Bram", last_name: "Jansen", company_name: "Jansen BV" })]);

    expect(screen.getByRole("rowheader", { name: "Anna de Vries" })).toBeTruthy();
    const companyCell = screen.getByRole("rowheader", { name: /Bram Jansen/ });
    expect(within(companyCell).getByText("Bram Jansen")).toBeTruthy();
    expect(within(companyCell).getByText("Jansen BV")).toBeTruthy();
  });

  test.each([
    ["individual", "Individual"],
    ["company", "Company"],
    ["trust", "Trust"],
    ["something-new", "Unknown type"],
    ["constructor", "Unknown type"],
  ])("translates owner type %s", (ownerType, label) => {
    renderTable([owner({ owner_type: ownerType })]);

    expect(within(rowFor("Anna")).getByText(label)).toBeTruthy();
    expect(screen.queryByText(ownerType)).toBeNull();
  });

  test.each([
    ["active", "Active"],
    ["inactive", "Inactive"],
    ["pending", "Pending"],
    ["archived", "Archived"],
    ["something-new", "Unknown status"],
  ])("shows status %s as a translated badge", (status, label) => {
    renderTable([owner({ status })]);

    const badge = within(rowFor("Anna")).getByText(label);
    expect(badge.className).toContain("host-owners-status");
    expect(screen.queryByText(status)).toBeNull();
  });

  test("adds a status modifier only for a known status", () => {
    const { rerender } = renderTable([owner({ status: "archived" })]);
    expect(screen.getByText("Archived").className).toBe("host-owners-status host-owners-status--archived");

    rerender(<OwnersTable owners={[owner({ status: "something-new" })]} t={t} language="en" onEdit={jest.fn()} />);
    expect(screen.getByText("Unknown status").className).toBe("host-owners-status");
  });

  test.each([
    [10000, "Villa Kalimaya III, 100%"],
    [3333, "Villa Kalimaya III, 33.33%"],
    [5050, "Villa Kalimaya III, 50.5%"],
    [1, "Villa Kalimaya III, 0.01%"],
  ])("formats %p basis points as a percentage", (basisPoints, text) => {
    renderTable([owner({ properties: [share({ ownership_basis_points: basisPoints })] })]);

    expect(screen.getByText(text)).toBeTruthy();
  });

  test("lists every current property of an owner", () => {
    renderTable([
      owner({
        properties: [
          share({ ownership_basis_points: 6000 }),
          share({ property_id: "property-2", property_title: "Charming Windmill Stay", ownership_basis_points: 2500 }),
        ],
      }),
    ]);

    const items = within(rowFor("Anna"))
      .getAllByRole("listitem")
      .map((item) => item.textContent);
    expect(items).toEqual(["Villa Kalimaya III, 60%", "Charming Windmill Stay, 25%"]);
  });

  test("uses the translated fallback when the property title is null", () => {
    renderTable([owner({ properties: [share({ property_title: null, ownership_basis_points: 3333 })] })]);

    expect(screen.getByText("Unknown property, 33.33%")).toBeTruthy();
  });

  test("does not invent a percentage for an invalid share", () => {
    renderTable([owner({ properties: [share({ ownership_basis_points: 33.5 })] })]);

    expect(screen.getByText("Villa Kalimaya III, share unknown")).toBeTruthy();
  });

  test("keeps template-like text in a property title as it is", () => {
    renderTable([owner({ properties: [share({ property_title: "Villa {percent}" })] })]);

    expect(screen.getByText("Villa {percent}, 100%")).toBeTruthy();
  });

  test.each([
    ["an empty list", []],
    ["a missing list", undefined],
  ])("shows the no-properties text for %s", (_label, properties) => {
    renderTable([owner({ properties })]);

    expect(within(rowFor("Anna")).getByText(t.noProperties)).toBeTruthy();
    expect(within(rowFor("Anna")).queryByRole("list")).toBeNull();
  });

  test("formats the percentage for the active language", () => {
    renderTable([owner({ properties: [share({ ownership_basis_points: 3333 })] })], {
      texts: nl.hostOwners,
      language: "nl",
    });

    expect(screen.getByText("Villa Kalimaya III, 33,33%")).toBeTruthy();
    expect(screen.getByText("Particulier")).toBeTruthy();
    expect(screen.getByText("Actief")).toBeTruthy();
  });
});
