import React from "react";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { Link, MemoryRouter, Route, Routes } from "react-router-dom";
import { toast } from "react-toastify";
import { LanguageContext } from "../../../../context/LanguageContext";
import en from "../../../../content/en.json";
import nl from "../../../../content/nl.json";
import { OwnerApiError, archiveOwner, getOwner, updateOwner } from "../services/ownerService";
import HostOwnerDetail from "./HostOwnerDetail";

jest.mock("aws-amplify", () => ({
  Auth: {
    currentAuthenticatedUser: jest.fn(),
  },
}));

jest.mock("../services/ownerService", () => {
  const actual = jest.requireActual("../services/ownerService");
  return {
    OwnerApiError: actual.OwnerApiError,
    getOwner: jest.fn(),
    updateOwner: jest.fn(),
    archiveOwner: jest.fn(),
    createOwner: jest.fn(),
  };
});

jest.mock("react-toastify", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

const t = en.hostOwners;
const texts = t.detail;

const owner = (overrides = {}) => ({
  id: "owner-1",
  host_id: "host-1",
  first_name: "Anna",
  last_name: "de Vries",
  company_name: null,
  email: "anna@example.com",
  phone: null,
  preferred_language: "nl-NL",
  owner_type: "individual",
  status: "active",
  notes: "Prefers email.",
  owner_user_id: null,
  created_at: 1781256600000,
  updated_at: 1793023500000,
  properties: [
    {
      property_id: "property-1",
      property_title: "Villa Kalimaya III",
      ownership_basis_points: 6000,
      effective_from: 1782864000000,
      effective_to: null,
    },
  ],
  ...overrides,
});

const ARCHIVED = owner({ status: "archived", properties: [] });

const apiError = (status, serverMessage = "raw server message") =>
  new OwnerApiError(serverMessage, { status, serverMessage });

const deferred = () => {
  let resolve;
  const promise = new Promise((done) => {
    resolve = done;
  });
  return { promise, resolve };
};

const renderPage = ({ language = "en", path = "/hostdashboard/owners/owner-1" } = {}) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <LanguageContext.Provider value={{ language, setLanguage: jest.fn() }}>
        <Routes>
          <Route path="/hostdashboard/owners" element={<p>Owners list page</p>} />
          <Route path="/hostdashboard/owners/:id" element={<HostOwnerDetail />} />
        </Routes>
      </LanguageContext.Provider>
    </MemoryRouter>
  );

const valueOf = (label) => {
  const terms = screen.getAllByRole("term").map((term) => term.textContent);
  expect(terms).toContain(label);
  return screen.getAllByRole("definition")[terms.indexOf(label)].textContent;
};

const openArchiveDialog = () => {
  fireEvent.click(screen.getByRole("button", { name: texts.archive }));
  expect(screen.getByRole("heading", { name: texts.archiveConfirmTitle })).toBeTruthy();
  const archiveButtons = screen.getAllByRole("button", { name: texts.archive });
  expect(archiveButtons).toHaveLength(2);
  return { confirmButton: archiveButtons[1], cancelButton: screen.getByRole("button", { name: t.form.cancel }) };
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe("HostOwnerDetail", () => {
  test("shows the loader while the owner loads, for the id in the route", async () => {
    const pending = deferred();
    getOwner.mockReturnValue(pending.promise);

    renderPage();

    expect(screen.getByRole("status").textContent).toContain(texts.loading);
    expect(getOwner).toHaveBeenCalledWith("owner-1");

    pending.resolve(owner());
    expect(await screen.findByRole("heading", { name: "Anna de Vries" })).toBeTruthy();
    expect(screen.queryByRole("status")).toBeNull();
  });

  test("shows every owner field with translated labels, and the current properties", async () => {
    getOwner.mockResolvedValue(owner());

    renderPage();

    await screen.findByRole("heading", { name: "Anna de Vries" });
    expect(valueOf(t.form.labels.first_name)).toBe("Anna");
    expect(valueOf(t.form.labels.last_name)).toBe("de Vries");
    expect(valueOf(t.form.labels.email)).toBe("anna@example.com");
    expect(valueOf(t.form.labels.phone)).toBe(texts.notProvided);
    expect(valueOf(t.form.labels.preferred_language)).toBe("nl-NL");
    expect(valueOf(t.form.labels.owner_type)).toBe("Individual");
    expect(valueOf(t.form.labels.status)).toBe("Active");
    expect(valueOf(t.form.labels.notes)).toBe("Prefers email.");
    expect(valueOf(texts.labels.created_at)).not.toBe(texts.notProvided);
    expect(valueOf(texts.labels.updated_at)).not.toBe(texts.notProvided);
    expect(screen.queryByText(t.form.labels.company_name)).toBeNull();
    const properties = screen.getByRole("region", { name: t.columnProperties });
    expect(within(properties).getByText("Villa Kalimaya III, 60%")).toBeTruthy();
    expect(screen.queryByText("host-1")).toBeNull();
  });

  test("shows the company name of a company owner", async () => {
    getOwner.mockResolvedValue(owner({ owner_type: "company", company_name: "De Vries BV", properties: [] }));

    renderPage();

    await screen.findByRole("heading", { name: "Anna de Vries" });
    expect(valueOf(t.form.labels.company_name)).toBe("De Vries BV");
    expect(valueOf(t.form.labels.owner_type)).toBe("Company");
    expect(screen.getByText(t.noProperties)).toBeTruthy();
  });

  test.each([
    ["404", apiError(404), texts.errorNotFound, false],
    ["400 for an id that is not valid", apiError(400, "A valid owner id is required."), texts.errorNotFound, false],
    ["401", apiError(401), t.errorSignedOut, false],
    ["403", apiError(403), t.errorForbidden, false],
    ["500", apiError(500), texts.errorGeneric, true],
    ["a network failure", new TypeError("Failed to fetch"), texts.errorGeneric, true],
  ])("shows the translated load error for %s", async (_label, error, text, canRetry) => {
    getOwner.mockRejectedValue(error);

    renderPage();

    expect((await screen.findByRole("alert")).textContent).toBe(text + (canRetry ? t.retry : ""));
    expect(screen.queryByText(/raw server message|Failed to fetch/)).toBeNull();
    expect(Boolean(screen.queryByRole("button", { name: t.retry }))).toBe(canRetry);
    expect(screen.getByRole("link", { name: texts.backToOwners })).toBeTruthy();
  });

  test("treats a response that is not an owner as a load error", async () => {
    getOwner.mockResolvedValue([owner()]);

    renderPage();

    expect((await screen.findByRole("alert")).textContent).toContain(texts.errorGeneric);
  });

  test("Retry loads the owner again", async () => {
    getOwner.mockRejectedValueOnce(apiError(500)).mockResolvedValueOnce(owner());

    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: t.retry }));

    expect(await screen.findByRole("heading", { name: "Anna de Vries" })).toBeTruthy();
    expect(getOwner).toHaveBeenCalledTimes(2);
  });

  test("the back link leads to the owners list", async () => {
    getOwner.mockResolvedValue(owner());

    renderPage();
    fireEvent.click(await screen.findByRole("link", { name: texts.backToOwners }));

    expect(screen.getByText("Owners list page")).toBeTruthy();
  });

  test("Edit opens the form, and the page shows the saved owner with a toast", async () => {
    getOwner.mockResolvedValue(owner());
    updateOwner.mockResolvedValue(owner({ last_name: "Janssen" }));

    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: t.editOwner }));
    const dialog = screen.getByRole("dialog", { name: t.form.editTitle });
    fireEvent.change(within(dialog).getByLabelText(t.form.labels.last_name), { target: { value: "Janssen" } });
    fireEvent.click(within(dialog).getByRole("button", { name: t.form.save }));

    expect(await screen.findByRole("heading", { name: "Anna Janssen" })).toBeTruthy();
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(updateOwner).toHaveBeenCalledWith("owner-1", { last_name: "Janssen" });
    expect(toast.success).toHaveBeenCalledWith("Anna Janssen was updated.");
    expect(getOwner).toHaveBeenCalledTimes(1);
  });

  test("Archive asks first, then archives and shows the archived owner with a toast", async () => {
    getOwner.mockResolvedValue(owner());
    archiveOwner.mockResolvedValue(ARCHIVED);

    renderPage();
    await screen.findByRole("heading", { name: "Anna de Vries" });
    const { confirmButton } = openArchiveDialog();
    expect(
      screen.getByText("Anna de Vries will be hidden from your owners list. You can restore this owner later.")
    ).toBeTruthy();
    expect(archiveOwner).not.toHaveBeenCalled();
    fireEvent.click(confirmButton);

    expect(await screen.findByRole("button", { name: texts.restore })).toBeTruthy();
    expect(valueOf(t.form.labels.status)).toBe("Archived");
    expect(screen.queryByRole("heading", { name: texts.archiveConfirmTitle })).toBeNull();
    expect(screen.queryByRole("button", { name: texts.archive })).toBeNull();
    expect(archiveOwner).toHaveBeenCalledTimes(1);
    expect(archiveOwner).toHaveBeenCalledWith("owner-1");
    expect(toast.success).toHaveBeenCalledWith("Anna de Vries was archived.");
  });

  test("cancelling the archive question sends nothing and changes nothing", async () => {
    getOwner.mockResolvedValue(owner());

    renderPage();
    await screen.findByRole("heading", { name: "Anna de Vries" });
    fireEvent.click(openArchiveDialog().cancelButton);

    expect(screen.queryByRole("heading", { name: texts.archiveConfirmTitle })).toBeNull();
    expect(archiveOwner).not.toHaveBeenCalled();
    expect(updateOwner).not.toHaveBeenCalled();
    expect(valueOf(t.form.labels.status)).toBe("Active");
    expect(toast.success).not.toHaveBeenCalled();
  });

  const HELD_SHARES_MESSAGE = "This owner still holds ownership shares. Set new shares for these properties first.";
  const OWNER_CONFLICT_MESSAGE = "This owner changed at the same time. Reload and try again.";
  const HELD_SHARES_EXPLANATION =
    "Anna de Vries cannot be archived yet, because this owner still has current or upcoming ownership shares. " +
    "First remove Anna de Vries from the shares of those properties, then archive again.";

  test.each([
    ["the held-shares message", apiError(409, HELD_SHARES_MESSAGE), HELD_SHARES_MESSAGE],
    ["the concurrent-change message", apiError(409, OWNER_CONFLICT_MESSAGE), OWNER_CONFLICT_MESSAGE],
    ["no message", new OwnerApiError("Request failed", { status: 409, serverMessage: null }), HELD_SHARES_EXPLANATION],
    ["an empty message", apiError(409, ""), HELD_SHARES_EXPLANATION],
  ])("a 409 on archive with %s shows the right text and keeps the owner active", async (_label, error, text) => {
    getOwner.mockResolvedValue(owner());
    archiveOwner.mockRejectedValue(error);

    renderPage();
    await screen.findByRole("heading", { name: "Anna de Vries" });
    fireEvent.click(openArchiveDialog().confirmButton);

    expect((await screen.findByRole("alert")).textContent).toBe(text);
    expect(valueOf(t.form.labels.status)).toBe("Active");
    expect(screen.getByRole("button", { name: texts.archive }).disabled).toBe(false);
    expect(screen.queryByRole("button", { name: texts.restore })).toBeNull();
    expect(toast.success).not.toHaveBeenCalled();
  });

  test.each([
    ["500", apiError(500), t.form.errorGeneric],
    ["403", apiError(403), t.errorForbidden],
  ])("a %s on archive shows the translated save error", async (_label, error, text) => {
    getOwner.mockResolvedValue(owner());
    archiveOwner.mockRejectedValue(error);

    renderPage();
    await screen.findByRole("heading", { name: "Anna de Vries" });
    fireEvent.click(openArchiveDialog().confirmButton);

    expect((await screen.findByRole("alert")).textContent).toBe(text);
    expect(valueOf(t.form.labels.status)).toBe("Active");
  });

  test("a 404 on archive shows that the owner no longer exists", async () => {
    getOwner.mockResolvedValue(owner());
    archiveOwner.mockRejectedValue(apiError(404));

    renderPage();
    await screen.findByRole("heading", { name: "Anna de Vries" });
    fireEvent.click(openArchiveDialog().confirmButton);

    expect((await screen.findByRole("alert")).textContent).toBe(texts.errorNotFound);
    expect(screen.queryByRole("heading", { name: "Anna de Vries" })).toBeNull();
  });

  test("Restore sends only the active status and shows the active owner with a toast", async () => {
    getOwner.mockResolvedValue(ARCHIVED);
    updateOwner.mockResolvedValue(owner({ properties: [] }));

    renderPage();
    await screen.findByRole("heading", { name: "Anna de Vries" });
    expect(screen.queryByRole("button", { name: texts.archive })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: texts.restore }));

    expect(await screen.findByRole("button", { name: texts.archive })).toBeTruthy();
    expect(valueOf(t.form.labels.status)).toBe("Active");
    expect(updateOwner).toHaveBeenCalledTimes(1);
    expect(updateOwner).toHaveBeenCalledWith("owner-1", { status: "active" });
    expect(archiveOwner).not.toHaveBeenCalled();
    expect(toast.success).toHaveBeenCalledWith("Anna de Vries was restored.");
  });

  test("a failed restore shows the translated error and keeps the owner archived", async () => {
    getOwner.mockResolvedValue(ARCHIVED);
    updateOwner.mockRejectedValue(apiError(500));

    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: texts.restore }));

    expect((await screen.findByRole("alert")).textContent).toBe(t.form.errorGeneric);
    expect(valueOf(t.form.labels.status)).toBe("Archived");
    expect(toast.success).not.toHaveBeenCalled();
  });

  test("disables the buttons while the archive request runs", async () => {
    const pending = deferred();
    getOwner.mockResolvedValue(owner());
    archiveOwner.mockReturnValue(pending.promise);

    renderPage();
    await screen.findByRole("heading", { name: "Anna de Vries" });
    fireEvent.click(openArchiveDialog().confirmButton);

    expect(screen.getByRole("button", { name: texts.archiving }).disabled).toBe(true);
    expect(screen.getByRole("button", { name: t.editOwner }).disabled).toBe(true);

    pending.resolve(ARCHIVED);
    expect(await screen.findByRole("button", { name: texts.restore })).toBeTruthy();
    expect(screen.getByRole("button", { name: texts.restore }).disabled).toBe(false);
    expect(screen.getByRole("button", { name: t.editOwner }).disabled).toBe(false);
  });

  test("disables the buttons while the restore request runs, and sends it once", async () => {
    const pending = deferred();
    getOwner.mockResolvedValue(ARCHIVED);
    updateOwner.mockReturnValue(pending.promise);

    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: texts.restore }));

    const restoring = screen.getByRole("button", { name: texts.restoring });
    expect(restoring.disabled).toBe(true);
    expect(screen.getByRole("button", { name: t.editOwner }).disabled).toBe(true);
    fireEvent.click(restoring);
    expect(updateOwner).toHaveBeenCalledTimes(1);

    pending.resolve(owner());
    await waitFor(() => expect(screen.getByRole("button", { name: texts.archive }).disabled).toBe(false));
  });

  test("moving to another owner's page loads that owner and clears the first owner's state", async () => {
    const second = owner({ id: "owner-2", first_name: "Bram", last_name: "Jansen", email: "bram@example.com" });
    getOwner.mockImplementation(async (ownerId) => (ownerId === "owner-2" ? second : owner()));
    archiveOwner.mockRejectedValue(apiError(409, HELD_SHARES_MESSAGE));

    render(
      <MemoryRouter initialEntries={["/hostdashboard/owners/owner-1"]}>
        <LanguageContext.Provider value={{ language: "en", setLanguage: jest.fn() }}>
          <Link to="/hostdashboard/owners/owner-2">Next owner</Link>
          <Routes>
            <Route path="/hostdashboard/owners/:id" element={<HostOwnerDetail />} />
          </Routes>
        </LanguageContext.Provider>
      </MemoryRouter>
    );
    await screen.findByRole("heading", { name: "Anna de Vries" });
    fireEvent.click(openArchiveDialog().confirmButton);
    expect((await screen.findByRole("alert")).textContent).toBe(HELD_SHARES_MESSAGE);

    fireEvent.click(screen.getByRole("link", { name: "Next owner" }));

    expect(await screen.findByRole("heading", { name: "Bram Jansen" })).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "Anna de Vries" })).toBeNull();
    expect(valueOf(t.form.labels.email)).toBe("bram@example.com");
    expect(screen.queryByRole("alert")).toBeNull();
    expect(getOwner).toHaveBeenNthCalledWith(1, "owner-1");
    expect(getOwner).toHaveBeenNthCalledWith(2, "owner-2");
    expect(getOwner).toHaveBeenCalledTimes(2);
  });

  test("uses the selected language", async () => {
    getOwner.mockResolvedValue(owner());

    renderPage({ language: "nl" });

    await screen.findByRole("heading", { name: "Anna de Vries" });
    expect(screen.getByRole("link", { name: nl.hostOwners.detail.backToOwners })).toBeTruthy();
    expect(screen.getByRole("button", { name: nl.hostOwners.detail.archive })).toBeTruthy();
    expect(screen.getByText("Particulier")).toBeTruthy();
    expect(screen.getByText("Villa Kalimaya III, 60%")).toBeTruthy();
  });
});
