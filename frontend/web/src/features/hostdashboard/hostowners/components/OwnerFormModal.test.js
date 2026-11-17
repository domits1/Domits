import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import en from "../../../../content/en.json";
import nl from "../../../../content/nl.json";
import de from "../../../../content/de.json";
import es from "../../../../content/es.json";
import { OwnerApiError, createOwner, updateOwner } from "../services/ownerService";
import OwnerFormModal from "./OwnerFormModal";

jest.mock("aws-amplify", () => ({
  Auth: {
    currentAuthenticatedUser: jest.fn(),
  },
}));

jest.mock("../services/ownerService", () => {
  const actual = jest.requireActual("../services/ownerService");
  return { OwnerApiError: actual.OwnerApiError, createOwner: jest.fn(), updateOwner: jest.fn() };
});

const t = en.hostOwners;
const labels = t.form.labels;

const STORED_OWNER = Object.freeze({
  id: "3f2b8c1e-9a4d-4e6f-8b7a-1c2d3e4f5a6b",
  first_name: "Anna",
  last_name: "de Vries",
  company_name: null,
  email: "anna@example.com",
  phone: "+31 6 12345678",
  preferred_language: "nl-NL",
  owner_type: "individual",
  status: "active",
  notes: null,
  properties: [],
});

const deferred = () => {
  let resolve;
  const promise = new Promise((done) => {
    resolve = done;
  });
  return { promise, resolve };
};

const renderModal = (owner = null) => {
  const onClose = jest.fn();
  const onSaved = jest.fn();
  render(<OwnerFormModal owner={owner} t={t} onClose={onClose} onSaved={onSaved} />);
  return { onClose, onSaved };
};

const field = (name) => screen.getByLabelText(labels[name]);
const type = (name, value) => fireEvent.change(field(name), { target: { value } });
const saveButton = () => screen.getByRole("button", { name: t.form.save });
const submit = () => fireEvent.click(saveButton());

const fillValidIndividual = () => {
  type("first_name", "  Anna ");
  type("last_name", " de Vries ");
  type("email", " anna@example.com ");
  type("owner_type", "individual");
};

describe("OwnerFormModal create", () => {
  test("opens as a labelled dialog with the first name focused", () => {
    renderModal();

    expect(screen.getByRole("dialog", { name: t.form.createTitle })).toBeTruthy();
    expect(field("first_name")).toHaveFocus();
  });

  test("sends the trimmed values without empty optional fields", async () => {
    const saved = { ...STORED_OWNER, phone: null, preferred_language: null };
    createOwner.mockResolvedValue(saved);
    const { onSaved } = renderModal();

    fillValidIndividual();
    type("phone", "   ");
    type("notes", "  Prefers email.  ");
    submit();

    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(saved));
    expect(createOwner).toHaveBeenCalledTimes(1);
    expect(createOwner.mock.calls[0][0]).toStrictEqual({
      first_name: "Anna",
      last_name: "de Vries",
      email: "anna@example.com",
      owner_type: "individual",
      status: "active",
      notes: "Prefers email.",
    });
  });

  test("shows the company name only for a company or trust, and requires it there", async () => {
    renderModal();

    expect(screen.queryByLabelText(labels.company_name)).toBeNull();
    fillValidIndividual();
    type("owner_type", "trust");
    expect(field("company_name")).toBeTruthy();

    submit();

    expect(await screen.findByText(t.form.errors.companyNameRequired)).toBeTruthy();
    expect(field("company_name")).toHaveFocus();
    expect(createOwner).not.toHaveBeenCalled();

    type("company_name", " Family Trust ");
    createOwner.mockResolvedValue({ ...STORED_OWNER, owner_type: "trust", company_name: "Family Trust" });
    submit();

    await waitFor(() => expect(createOwner).toHaveBeenCalledTimes(1));
    expect(createOwner.mock.calls[0][0]).toMatchObject({ owner_type: "trust", company_name: "Family Trust" });
  });

  test("shows an error next to each invalid field and focuses the first one", () => {
    renderModal();

    type("first_name", "Anna");
    type("email", "anna@example");
    type("phone", "call me");
    submit();

    expect(field("last_name")).toHaveFocus();
    expect(field("last_name").getAttribute("aria-invalid")).toBe("true");
    expect(screen.getByText(t.form.errors.required, { selector: "#host-owners-form-last_name-error" })).toBeTruthy();
    expect(screen.getByText(t.form.errors.invalidEmail)).toBeTruthy();
    expect(screen.getByText(t.form.errors.invalidPhone)).toBeTruthy();
    expect(field("first_name").getAttribute("aria-invalid")).toBe("false");
    expect(createOwner).not.toHaveBeenCalled();
  });

  test("fills in the maximum length in the too-long error", () => {
    renderModal();

    fillValidIndividual();
    type("first_name", "a".repeat(101));
    submit();

    expect(screen.getByText("Use at most 100 characters.")).toBeTruthy();
  });

  test("clears the error of a field once it is edited", () => {
    renderModal();

    submit();
    expect(field("first_name").getAttribute("aria-invalid")).toBe("true");

    type("first_name", "Anna");
    expect(field("first_name").getAttribute("aria-invalid")).toBe("false");
  });
});

describe("OwnerFormModal edit", () => {
  test("is prefilled from the owner", () => {
    renderModal(STORED_OWNER);

    expect(screen.getByRole("dialog", { name: t.form.editTitle })).toBeTruthy();
    expect(field("first_name").value).toBe("Anna");
    expect(field("email").value).toBe("anna@example.com");
    expect(field("owner_type").value).toBe("individual");
    expect(field("notes").value).toBe("");
  });

  test("sends only the changed fields, and null for a cleared optional field", async () => {
    const saved = { ...STORED_OWNER, first_name: "Anne", phone: null };
    updateOwner.mockResolvedValue(saved);
    const { onSaved } = renderModal(STORED_OWNER);

    type("first_name", " Anne ");
    type("phone", "");
    submit();

    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(saved));
    expect(updateOwner).toHaveBeenCalledTimes(1);
    expect(updateOwner.mock.calls[0][0]).toBe(STORED_OWNER.id);
    expect(updateOwner.mock.calls[0][1]).toStrictEqual({ first_name: "Anne", phone: null });
  });

  test("disables save until something changes, and does not send an empty update", () => {
    renderModal(STORED_OWNER);

    expect(saveButton().disabled).toBe(true);
    fireEvent.submit(screen.getByRole("form", { name: t.form.editTitle }));
    expect(updateOwner).not.toHaveBeenCalled();
    type("last_name", "Jansen");
    expect(saveButton().disabled).toBe(false);
    type("last_name", "de Vries ");
    expect(saveButton().disabled).toBe(true);
  });

  test("checks the company rule against the stored owner", () => {
    renderModal(STORED_OWNER);

    type("owner_type", "company");
    submit();

    expect(screen.getByText(t.form.errors.companyNameRequired)).toBeTruthy();
    expect(updateOwner).not.toHaveBeenCalled();
  });

  test("switching a company to individual hides the company name and clears it", async () => {
    const company = { ...STORED_OWNER, owner_type: "company", company_name: "De Vries Holding" };
    updateOwner.mockResolvedValue({ ...company, owner_type: "individual", company_name: null });
    renderModal(company);

    expect(field("company_name").value).toBe("De Vries Holding");
    type("owner_type", "individual");
    expect(screen.queryByLabelText(labels.company_name)).toBeNull();
    submit();

    await waitFor(() => expect(updateOwner).toHaveBeenCalledTimes(1));
    expect(updateOwner.mock.calls[0][1]).toStrictEqual({ owner_type: "individual", company_name: null });
  });

  test("keeps save disabled for an unchanged individual that has a stored company name", () => {
    renderModal({ ...STORED_OWNER, company_name: "Old Company BV" });

    expect(saveButton().disabled).toBe(true);
    fireEvent.submit(screen.getByRole("form", { name: t.form.editTitle }));
    expect(updateOwner).not.toHaveBeenCalled();
  });

  test("edits an archived owner without restoring it, and never offers archived as a choice", async () => {
    const archived = { ...STORED_OWNER, status: "archived" };
    updateOwner.mockResolvedValue({ ...archived, first_name: "Anne" });
    renderModal(archived);

    const archivedOption = screen.getByRole("option", { name: t.statuses.archived });
    expect(field("status").value).toBe("archived");
    expect(archivedOption.disabled).toBe(true);

    type("first_name", "Anne");
    submit();

    await waitFor(() => expect(updateOwner).toHaveBeenCalledTimes(1));
    expect(updateOwner.mock.calls[0][1]).toStrictEqual({ first_name: "Anne" });
  });

  test("does not offer archived for an owner that is not archived", () => {
    renderModal(STORED_OWNER);

    expect(screen.queryByRole("option", { name: t.statuses.archived })).toBeNull();
  });
});

describe("OwnerFormModal server errors", () => {
  test("shows the server message of a 400 above the form and keeps the values", async () => {
    const message = "email must be a valid email address.";
    createOwner.mockRejectedValue(new OwnerApiError(message, { status: 400, serverMessage: message }));
    const { onSaved } = renderModal();

    fillValidIndividual();
    submit();

    expect((await screen.findByRole("alert")).textContent).toBe(message);
    expect(field("first_name").value).toBe("  Anna ");
    expect(saveButton().disabled).toBe(false);
    expect(onSaved).not.toHaveBeenCalled();
  });

  test.each([
    ["404", new OwnerApiError("Owner not found.", { status: 404, serverMessage: "Owner not found." }), t.form.errorNotFound],
    ["401", new OwnerApiError("raw", { status: 401, serverMessage: "raw" }), t.errorSignedOut],
    ["403", new OwnerApiError("raw", { status: 403, serverMessage: "raw" }), t.errorForbidden],
    ["409", new OwnerApiError("raw", { status: 409, serverMessage: "raw" }), t.form.errorGeneric],
    ["500", new OwnerApiError("raw", { status: 500, serverMessage: "raw" }), t.form.errorGeneric],
    ["a 400 without a message", new OwnerApiError("raw", { status: 400, serverMessage: null }), t.form.errorGeneric],
    ["a network failure", new TypeError("Failed to fetch"), t.form.errorGeneric],
  ])("shows the translated text for %s", async (_label, error, text) => {
    updateOwner.mockRejectedValue(error);
    renderModal(STORED_OWNER);

    type("first_name", "Anne");
    submit();

    expect((await screen.findByRole("alert")).textContent).toBe(text);
    expect(field("first_name").value).toBe("Anne");
  });
});

describe("OwnerFormModal saving and closing", () => {
  test("disables both buttons while saving and ignores Escape", async () => {
    const pending = deferred();
    updateOwner.mockReturnValue(pending.promise);
    const { onClose, onSaved } = renderModal(STORED_OWNER);

    type("first_name", "Anne");
    submit();

    const savingButton = await screen.findByRole("button", { name: t.form.saving });
    expect(savingButton.disabled).toBe(true);
    expect(screen.getByRole("button", { name: t.form.cancel }).disabled).toBe(true);
    fireEvent.keyDown(document, { key: "Escape" });
    fireEvent.submit(screen.getByRole("form", { name: t.form.editTitle }));
    expect(onClose).not.toHaveBeenCalled();
    expect(updateOwner).toHaveBeenCalledTimes(1);

    pending.resolve({ ...STORED_OWNER, first_name: "Anne" });
    await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1));
  });

  test("Escape closes without a request", () => {
    const { onClose } = renderModal(STORED_OWNER);

    type("first_name", "Anne");
    fireEvent.keyDown(document, { key: "Escape" });

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(updateOwner).not.toHaveBeenCalled();
  });

  test("Cancel closes without a request", () => {
    const { onClose } = renderModal();

    fillValidIndividual();
    fireEvent.click(screen.getByRole("button", { name: t.form.cancel }));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(createOwner).not.toHaveBeenCalled();
  });

  test("the close button in the header closes without a request", () => {
    const { onClose } = renderModal(STORED_OWNER);

    type("first_name", "Anne");
    const closeButton = screen.getByRole("button", { name: t.form.close });
    expect(closeButton.textContent).toBe("×");
    fireEvent.click(closeButton);

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(updateOwner).not.toHaveBeenCalled();
  });

  test("the close button is disabled while saving", async () => {
    const pending = deferred();
    updateOwner.mockReturnValue(pending.promise);
    const { onClose, onSaved } = renderModal(STORED_OWNER);

    type("first_name", "Anne");
    submit();

    await screen.findByRole("button", { name: t.form.saving });
    const closeButton = screen.getByRole("button", { name: t.form.close });
    expect(closeButton.disabled).toBe(true);
    fireEvent.click(closeButton);
    expect(onClose).not.toHaveBeenCalled();

    pending.resolve({ ...STORED_OWNER, first_name: "Anne" });
    await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1));
  });
});

describe("OwnerFormModal texts", () => {
  test("every error key of the form rules has a text in every language", () => {
    const keys = [
      "required",
      "tooLong",
      "invalidCharacters",
      "invalidEmail",
      "invalidPhone",
      "invalidLanguage",
      "invalidOwnerType",
      "invalidStatus",
      "archivedStatus",
      "companyNameRequired",
    ];
    for (const content of [en, nl, de, es]) {
      expect(Object.keys(content.hostOwners.form.errors).sort()).toEqual([...keys].sort());
    }
  });

  test("the close label exists in every language", () => {
    for (const content of [en, nl, de, es]) {
      expect(typeof content.hostOwners.form.close).toBe("string");
      expect(content.hostOwners.form.close).not.toBe("");
    }
  });
});
