import React from "react";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { toast } from "react-toastify";
import { MemoryRouter } from "react-router-dom";
import { LanguageContext } from "../../../../context/LanguageContext";
import en from "../../../../content/en.json";
import nl from "../../../../content/nl.json";
import { getAccessToken } from "../../../../services/getAccessToken";
import { OwnerApiError, createOwner, listOwners, updateOwner } from "../services/ownerService";
import HostOwners from "./HostOwners";

jest.mock("../../../../services/getAccessToken", () => ({
  getAccessToken: jest.fn(),
}));

jest.mock("aws-amplify", () => ({
  Auth: {
    currentAuthenticatedUser: jest.fn(),
  },
}));

jest.mock("../services/ownerService", () => {
  const actual = jest.requireActual("../services/ownerService");
  return {
    OwnerApiError: actual.OwnerApiError,
    listOwners: jest.fn(),
    createOwner: jest.fn(),
    updateOwner: jest.fn(),
  };
});

jest.mock("react-toastify", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

const t = en.hostOwners;

const owner = (overrides = {}) => ({
  id: "owner-1",
  first_name: "Anna",
  last_name: "de Vries",
  company_name: null,
  owner_type: "individual",
  status: "active",
  properties: [
    {
      property_id: "property-1",
      property_title: "Villa Kalimaya III",
      ownership_basis_points: 10000,
      effective_from: 1782864000000,
      effective_to: null,
    },
  ],
  ...overrides,
});

const ARCHIVED_OWNER = owner({ id: "owner-2", first_name: "Bram", last_name: "Jansen", status: "archived", properties: [] });

const apiError = (status) => new OwnerApiError("raw server message", { status, serverMessage: "raw server message" });

const deferred = () => {
  let resolve;
  const promise = new Promise((done) => {
    resolve = done;
  });
  return { promise, resolve };
};

const renderPage = (language = "en") =>
  render(
    <MemoryRouter>
      <LanguageContext.Provider value={{ language, setLanguage: jest.fn() }}>
        <HostOwners />
      </LanguageContext.Provider>
    </MemoryRouter>
  );

describe("HostOwners", () => {
  test("shows the loader while the owners load", async () => {
    const pending = deferred();
    listOwners.mockReturnValue(pending.promise);

    renderPage();

    expect(screen.getByRole("status").textContent).toContain(t.loading);
    expect(screen.queryByRole("table")).toBeNull();

    pending.resolve([]);
    await screen.findByText(t.empty);
    expect(screen.queryByRole("status")).toBeNull();
  });

  test("loads the owners once on mount and renders them", async () => {
    listOwners.mockResolvedValue([owner()]);

    renderPage();

    expect(await screen.findByRole("table", { name: t.title })).toBeTruthy();
    expect(screen.getByRole("rowheader", { name: "Anna de Vries" })).toBeTruthy();
    expect(screen.getByText("Villa Kalimaya III, 100%")).toBeTruthy();
    expect(listOwners).toHaveBeenCalledTimes(1);
  });

  test("shows the empty state when the host has no owners", async () => {
    listOwners.mockResolvedValue([]);

    renderPage();

    expect(await screen.findByText(t.empty)).toBeTruthy();
    expect(screen.queryByRole("table")).toBeNull();
    expect(screen.queryByRole("checkbox")).toBeNull();
  });

  test.each([
    ["401", apiError(401), t.errorSignedOut],
    ["403", apiError(403), t.errorForbidden],
    ["500", apiError(500), t.errorGeneric],
    ["404", apiError(404), t.errorGeneric],
    ["a missing API URL", new Error("REACT_APP_PROPERTY_OWNERS_API_URL is not set."), t.errorGeneric],
    ["a network failure", new TypeError("Failed to fetch"), t.errorGeneric],
  ])("shows the translated error for %s, never the raw message", async (_label, error, text) => {
    listOwners.mockRejectedValue(error);

    renderPage();

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain(text);
    expect(screen.queryByText(/raw server message|REACT_APP_|Failed to fetch/)).toBeNull();
    expect(screen.getByRole("button", { name: t.retry })).toBeTruthy();
  });

  test("asks the host to sign in again when the client cannot read a sign-in token", async () => {
    const originalEnv = process.env;
    process.env = { ...originalEnv, REACT_APP_PROPERTY_OWNERS_API_URL: "https://owners.example.test/property-owners" };
    global.fetch = jest.fn();
    getAccessToken.mockReturnValue(null);
    listOwners.mockImplementation(jest.requireActual("../services/ownerService").listOwners);

    try {
      renderPage();

      expect((await screen.findByRole("alert")).textContent).toContain(t.errorSignedOut);
      expect(global.fetch).not.toHaveBeenCalled();
    } finally {
      process.env = originalEnv;
      delete global.fetch;
    }
  });

  test("treats a response that is not a list as a load error", async () => {
    listOwners.mockResolvedValue({ message: "unexpected" });

    renderPage();

    expect((await screen.findByRole("alert")).textContent).toContain(t.errorGeneric);
  });

  test("Retry loads the owners again and shows them", async () => {
    listOwners.mockRejectedValueOnce(apiError(500)).mockResolvedValueOnce([owner()]);

    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: t.retry }));

    expect(await screen.findByRole("rowheader", { name: "Anna de Vries" })).toBeTruthy();
    expect(screen.queryByRole("alert")).toBeNull();
    expect(listOwners).toHaveBeenCalledTimes(2);
  });

  test("hides archived owners until the toggle is turned on", async () => {
    listOwners.mockResolvedValue([owner(), ARCHIVED_OWNER]);

    renderPage();

    const toggle = await screen.findByRole("checkbox", { name: t.showArchived });
    expect(toggle.checked).toBe(false);
    expect(screen.getByRole("rowheader", { name: "Anna de Vries" })).toBeTruthy();
    expect(screen.queryByRole("rowheader", { name: "Bram Jansen" })).toBeNull();

    fireEvent.click(toggle);
    expect(screen.getByRole("rowheader", { name: "Bram Jansen" })).toBeTruthy();

    fireEvent.click(toggle);
    expect(screen.queryByRole("rowheader", { name: "Bram Jansen" })).toBeNull();
  });

  test("explains the empty view when every owner is archived", async () => {
    listOwners.mockResolvedValue([ARCHIVED_OWNER]);

    renderPage();

    expect(await screen.findByText(t.allArchived)).toBeTruthy();
    expect(screen.queryByRole("table")).toBeNull();

    fireEvent.click(screen.getByRole("checkbox", { name: t.showArchived }));
    expect(screen.getByRole("rowheader", { name: "Bram Jansen" })).toBeTruthy();
  });

  test("offers Add owner and one Edit per row, and nothing else", async () => {
    listOwners.mockResolvedValue([owner()]);

    renderPage();

    await screen.findByRole("table");
    const buttons = screen.getAllByRole("button").map((button) => button.getAttribute("aria-label") ?? button.textContent);
    expect(buttons).toEqual([t.addOwner, "Edit Anna de Vries"]);
  });

  test("offers Add owner on the empty page too", async () => {
    listOwners.mockResolvedValue([]);

    renderPage();

    await screen.findByText(t.empty);
    expect(screen.getByRole("button", { name: t.addOwner })).toBeTruthy();
  });

  test("does not offer Add owner while loading or after a load error", async () => {
    listOwners.mockRejectedValue(apiError(500));

    renderPage();

    expect(screen.queryByRole("button", { name: t.addOwner })).toBeNull();
    await screen.findByRole("alert");
    expect(screen.queryByRole("button", { name: t.addOwner })).toBeNull();
  });

  test("Add owner opens the empty form, and the new owner appears after saving", async () => {
    const created = owner({ id: "owner-3", first_name: "Carla", last_name: "Bakker", properties: [] });
    listOwners.mockResolvedValue([owner()]);
    createOwner.mockResolvedValue(created);

    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: t.addOwner }));

    const dialog = screen.getByRole("dialog", { name: t.form.createTitle });
    expect(within(dialog).getByLabelText(t.form.labels.first_name).value).toBe("");
    fireEvent.change(within(dialog).getByLabelText(t.form.labels.first_name), { target: { value: "Carla" } });
    fireEvent.change(within(dialog).getByLabelText(t.form.labels.last_name), { target: { value: "Bakker" } });
    fireEvent.change(within(dialog).getByLabelText(t.form.labels.email), { target: { value: "carla@example.com" } });
    fireEvent.change(within(dialog).getByLabelText(t.form.labels.owner_type), { target: { value: "individual" } });
    fireEvent.click(within(dialog).getByRole("button", { name: t.form.save }));

    expect(await screen.findByRole("rowheader", { name: "Carla Bakker" })).toBeTruthy();
    expect(screen.getByRole("rowheader", { name: "Anna de Vries" })).toBeTruthy();
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(toast.success).toHaveBeenCalledWith("Carla Bakker was added.");
    expect(listOwners).toHaveBeenCalledTimes(1);
  });

  test("Edit opens the form prefilled, and the row updates after saving", async () => {
    const second = owner({ id: "owner-2", first_name: "Bram", last_name: "Jansen" });
    listOwners.mockResolvedValue([owner(), second]);
    updateOwner.mockResolvedValue({ ...second, first_name: "Bram", last_name: "Janssen" });

    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: "Edit Bram Jansen" }));

    const dialog = screen.getByRole("dialog", { name: t.form.editTitle });
    const lastName = within(dialog).getByLabelText(t.form.labels.last_name);
    expect(lastName.value).toBe("Jansen");
    fireEvent.change(lastName, { target: { value: "Janssen" } });
    fireEvent.click(within(dialog).getByRole("button", { name: t.form.save }));

    expect(await screen.findByRole("rowheader", { name: "Bram Janssen" })).toBeTruthy();
    expect(screen.queryByRole("rowheader", { name: "Bram Jansen" })).toBeNull();
    expect(screen.getAllByRole("rowheader").map((cell) => cell.textContent)).toEqual(["Anna de Vries", "Bram Janssen"]);
    expect(updateOwner).toHaveBeenCalledWith("owner-2", { last_name: "Janssen" });
    expect(toast.success).toHaveBeenCalledWith("Bram Janssen was updated.");
    expect(listOwners).toHaveBeenCalledTimes(1);
  });

  test("closing the form changes nothing and shows no toast", async () => {
    listOwners.mockResolvedValue([owner()]);

    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: "Edit Anna de Vries" }));
    fireEvent.click(screen.getByRole("button", { name: t.form.cancel }));

    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(screen.getByRole("rowheader", { name: "Anna de Vries" })).toBeTruthy();
    expect(toast.success).not.toHaveBeenCalled();
  });

  test("uses the selected language", async () => {
    listOwners.mockResolvedValue([owner()]);

    renderPage("nl");

    expect(await screen.findByText("Particulier")).toBeTruthy();
    expect(screen.getByRole("heading", { name: nl.hostOwners.title })).toBeTruthy();
  });

  test.each([["fr"], [undefined]])("falls back to English for language %p", async (language) => {
    listOwners.mockResolvedValue([owner()]);

    renderPage(language);

    expect(await screen.findByText("Individual")).toBeTruthy();
    expect(screen.getByRole("heading", { name: t.title })).toBeTruthy();
  });
});
