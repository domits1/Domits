import React from "react";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import en from "../../../../content/en.json";
import { fetchHostPropertySelectOptions } from "../../services/hostTaskPropertyService";
import { OwnerApiError, listOwners, setShares } from "../services/ownerService";
import { DAY_MS, todayUtc, utcMidnightToDateInput } from "../utils/utcDate";
import SetSharesModal, { utcDateFormatter } from "./SetSharesModal";

jest.mock("../services/ownerService", () => {
  const actual = jest.requireActual("../services/ownerService");
  return { OwnerApiError: actual.OwnerApiError, listOwners: jest.fn(), setShares: jest.fn() };
});

jest.mock("../../services/hostTaskPropertyService", () => ({ fetchHostPropertySelectOptions: jest.fn() }));

const t = en.hostOwners;
const texts = t.shares;

const TODAY = todayUtc();
const NEXT_WEEK = TODAY + 7 * DAY_MS;
const TODAY_INPUT = utcMidnightToDateInput(TODAY);
const NEXT_WEEK_INPUT = utcMidnightToDateInput(NEXT_WEEK);

const share = (propertyId, basisPoints, effectiveTo = null) => ({
  property_id: propertyId,
  property_title: "ignored",
  ownership_basis_points: basisPoints,
  effective_from: TODAY - 30 * DAY_MS,
  effective_to: effectiveTo,
});

const owner = (id, firstName, lastName, status, properties) => ({
  id,
  first_name: firstName,
  last_name: lastName,
  status,
  properties,
});

const ANNA = owner("owner-1", "Anna", "de Vries", "active", [share("property-1", 6000)]);
const BRAM = owner("owner-2", "Bram", "Jansen", "inactive", [share("property-1", 4000)]);
const CARLA = owner("owner-3", "Carla", "Bakker", "archived", []);
const DIRK = owner("owner-4", "Dirk", "Smit", "active", [share("property-2", 10000, NEXT_WEEK)]);
const OWNERS = [ANNA, BRAM, CARLA, DIRK];

const PROPERTY_OPTIONS = [
  { value: "property-1", title: "Villa Kalimaya III", label: "Villa Kalimaya III - Bali" },
  { value: "property-2", title: "Beach House", label: "Beach House" },
  { value: "property-3", title: "", label: "" },
];

const deferred = () => {
  let resolve;
  const promise = new Promise((done) => {
    resolve = done;
  });
  return { promise, resolve };
};

const renderModal = ({ initialOwnerId = "owner-1" } = {}) => {
  const onClose = jest.fn();
  const onSaved = jest.fn();
  render(<SetSharesModal t={t} language="en" initialOwnerId={initialOwnerId} onClose={onClose} onSaved={onSaved} />);
  return { onClose, onSaved };
};

const propertySelect = () => screen.getByLabelText(texts.propertyLabel);
const dateInput = () => screen.getByLabelText(texts.dateLabel);
const ownerSelects = () => screen.queryAllByLabelText(texts.ownerColumn);
const percentInputs = () => screen.queryAllByLabelText(texts.percentColumn);
const saveButton = () => screen.getByRole("button", { name: texts.save });
const totalText = () => screen.getByText(/% of 100%$/).textContent;

const openWithProperty = async (propertyId, options) => {
  const view = renderModal(options);
  fireEvent.change(await screen.findByLabelText(texts.propertyLabel), { target: { value: propertyId } });
  return view;
};

const rowValues = () =>
  ownerSelects().map((select, index) => ({ ownerId: select.value, percent: percentInputs()[index].value }));

beforeEach(() => {
  listOwners.mockResolvedValue(OWNERS);
  fetchHostPropertySelectOptions.mockResolvedValue(PROPERTY_OPTIONS);
});

describe("loading", () => {
  test("shows the loader, then the form with the property select focused", async () => {
    const owners = deferred();
    listOwners.mockReturnValue(owners.promise);

    renderModal();

    expect(screen.getByRole("status").textContent).toContain(t.loading);
    owners.resolve(OWNERS);
    await waitFor(() => expect(propertySelect()).toHaveFocus());
    expect(screen.queryByRole("status")).toBeNull();
    expect(fetchHostPropertySelectOptions).toHaveBeenCalledWith();
    expect(listOwners).toHaveBeenCalledTimes(1);
  });

  test("offers the properties with a placeholder and a fallback for a property without a title", async () => {
    renderModal();

    const options = within(await screen.findByLabelText(texts.propertyLabel)).getAllByRole("option");
    expect(options.map((option) => option.textContent)).toEqual([
      texts.propertyPlaceholder,
      "Villa Kalimaya III",
      "Beach House",
      t.unknownProperty,
    ]);
    expect(ownerSelects()).toHaveLength(0);
  });

  test("a load error offers Retry, which loads again", async () => {
    listOwners.mockRejectedValueOnce(new OwnerApiError("boom", { status: 500, serverMessage: null }));

    renderModal();

    expect((await screen.findByRole("alert")).textContent).toContain(t.errorGeneric);
    fireEvent.click(screen.getByRole("button", { name: t.retry }));
    expect(await screen.findByLabelText(texts.propertyLabel)).toBeTruthy();
    expect(listOwners).toHaveBeenCalledTimes(2);
  });

  test.each([
    ["the properties fail to load", () => fetchHostPropertySelectOptions.mockRejectedValueOnce(new Error("down"))],
    ["the owners are not a list", () => listOwners.mockResolvedValueOnce({ message: "unexpected" })],
  ])("shows the generic load error when %s", async (_label, arrange) => {
    arrange();

    renderModal();

    expect((await screen.findByRole("alert")).textContent).toContain(t.errorGeneric);
  });

  test("a 401 on load shows the signed-out text without Retry", async () => {
    listOwners.mockRejectedValueOnce(new OwnerApiError("signed out", { status: 401, serverMessage: null }));

    renderModal();

    expect((await screen.findByRole("alert")).textContent).toContain(t.errorSignedOut);
    expect(screen.queryByRole("button", { name: t.retry })).toBeNull();
  });
});

describe("rows", () => {
  test("start from the current split of the chosen property", async () => {
    await openWithProperty("property-1");

    expect(rowValues()).toEqual([
      { ownerId: "owner-1", percent: "60" },
      { ownerId: "owner-2", percent: "40" },
    ]);
    expect(totalText()).toContain("100% of 100%");
  });

  test("add the owner of the page when that owner holds no share yet", async () => {
    await openWithProperty("property-1", { initialOwnerId: "owner-4" });

    expect(rowValues()).toEqual([
      { ownerId: "owner-1", percent: "60" },
      { ownerId: "owner-2", percent: "40" },
      { ownerId: "owner-4", percent: "" },
    ]);
  });

  test("start with only the owner of the page for a property without owners", async () => {
    await openWithProperty("property-3");

    expect(rowValues()).toEqual([{ ownerId: "owner-1", percent: "" }]);
  });

  test("do not add an archived owner of the page", async () => {
    await openWithProperty("property-3", { initialOwnerId: "owner-3" });

    expect(rowValues()).toEqual([]);
  });

  test("Add owner adds an empty row and Remove takes a row out", async () => {
    await openWithProperty("property-1");

    fireEvent.click(screen.getByRole("button", { name: texts.addOwner }));
    expect(rowValues()).toEqual([
      { ownerId: "owner-1", percent: "60" },
      { ownerId: "owner-2", percent: "40" },
      { ownerId: "", percent: "" },
    ]);

    fireEvent.click(screen.getByRole("button", { name: "Remove Bram Jansen" }));
    expect(rowValues()).toEqual([
      { ownerId: "owner-1", percent: "60" },
      { ownerId: "", percent: "" },
    ]);
    expect(totalText()).toContain("60% of 100%");
    expect(screen.getByRole("button", { name: texts.removeOwner })).toBeTruthy();
  });

  test("offer active and inactive owners, never archived ones, and disable owners chosen in another row", async () => {
    await openWithProperty("property-1");

    const options = within(ownerSelects()[0]).getAllByRole("option");
    expect(options.map((option) => [option.textContent, option.disabled])).toEqual([
      [texts.chooseOwner, true],
      ["Anna de Vries", false],
      ["Bram Jansen (Inactive)", true],
      ["Dirk Smit", false],
    ]);
  });

  test("the total follows the typed shares, including a comma value", async () => {
    await openWithProperty("property-1");

    fireEvent.change(percentInputs()[0], { target: { value: "33,5" } });
    expect(totalText()).toContain("73.5% of 100%");

    fireEvent.change(percentInputs()[1], { target: { value: "abc" } });
    expect(totalText()).toContain("33.5% of 100%");
  });

  test("three shares of 33.33, 33.33 and 33.34 total exactly 100%, without floating point noise", async () => {
    await openWithProperty("property-1", { initialOwnerId: "owner-4" });

    fireEvent.change(percentInputs()[0], { target: { value: "0.1" } });
    fireEvent.change(percentInputs()[1], { target: { value: "0.2" } });
    expect(totalText()).toBe("0.3% of 100%");

    fireEvent.change(percentInputs()[0], { target: { value: "33.33" } });
    fireEvent.change(percentInputs()[1], { target: { value: "33,33" } });
    fireEvent.change(percentInputs()[2], { target: { value: "33.34" } });

    expect(totalText()).toBe("100% of 100%");
  });

  test("a total above 100% is still shown", async () => {
    await openWithProperty("property-1");

    fireEvent.change(percentInputs()[1], { target: { value: "50" } });

    expect(totalText()).toBe("110% of 100%");
  });

  test("changing the property starts again from that property's split", async () => {
    await openWithProperty("property-1");
    fireEvent.change(percentInputs()[0], { target: { value: "10" } });

    fireEvent.change(propertySelect(), { target: { value: "property-2" } });

    expect(rowValues()).toEqual([
      { ownerId: "owner-4", percent: "100" },
      { ownerId: "owner-1", percent: "" },
    ]);
  });
});

describe("date", () => {
  test("defaults to today and allows today up to the latest date", async () => {
    renderModal();

    const input = await screen.findByLabelText(texts.dateLabel);
    expect(input.type).toBe("date");
    expect(input.value).toBe(TODAY_INPUT);
    expect(input.min).toBe(TODAY_INPUT);
    expect(input.max).toBe(utcMidnightToDateInput(TODAY + 1826 * DAY_MS));
  });

  test("warns about a planned change, with the date in UTC", async () => {
    await openWithProperty("property-2");

    const warning = texts.plannedChangeWarning.replace("{date}", utcDateFormatter("en")(NEXT_WEEK));
    expect(screen.getByText(warning)).toBeTruthy();
  });

  test("shows no warning when nothing is planned", async () => {
    await openWithProperty("property-1");

    expect(screen.queryByText(/already planned/)).toBeNull();
  });
});

describe("validation", () => {
  test("asks for a property first and sends nothing", async () => {
    renderModal();
    await screen.findByLabelText(texts.propertyLabel);

    fireEvent.click(saveButton());

    expect(screen.getByText(texts.errors.propertyRequired)).toBeTruthy();
    expect(propertySelect().getAttribute("aria-invalid")).toBe("true");
    expect(propertySelect().getAttribute("aria-describedby")).toBe("host-owners-shares-property-error");
    expect(propertySelect()).toHaveFocus();
    expect(setShares).not.toHaveBeenCalled();
  });

  test("shows the date, owner and percent errors next to their fields and focuses the first", async () => {
    await openWithProperty("property-1");
    fireEvent.change(dateInput(), { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: texts.addOwner }));
    fireEvent.change(percentInputs()[1], { target: { value: "0" } });

    fireEvent.click(saveButton());

    expect(screen.getByText(texts.errors.dateRequired)).toBeTruthy();
    expect(screen.getByText(texts.errors.ownerRequired)).toBeTruthy();
    expect(screen.getByText(texts.errors.percentZero)).toBeTruthy();
    expect(screen.getByText(texts.errors.percentRequired)).toBeTruthy();
    expect(percentInputs()[1]).toHaveAccessibleDescription(texts.errors.percentZero);
    expect(ownerSelects()[2]).toHaveAccessibleDescription(texts.errors.ownerRequired);
    expect(dateInput()).toHaveFocus();
    expect(setShares).not.toHaveBeenCalled();
  });

  test("refuses a total that is not 100%", async () => {
    await openWithProperty("property-1");
    fireEvent.change(percentInputs()[1], { target: { value: "39.99" } });

    fireEvent.click(saveButton());

    expect(screen.getByRole("alert").textContent).toBe(texts.errors.totalMismatch);
    expect(setShares).not.toHaveBeenCalled();
  });

  test("refuses an empty owner list", async () => {
    await openWithProperty("property-3");
    fireEvent.click(screen.getByRole("button", { name: "Remove Anna de Vries" }));

    fireEvent.click(saveButton());

    expect(screen.getByRole("alert").textContent).toBe(texts.errors.sharesRequired);
    expect(setShares).not.toHaveBeenCalled();
  });

  test("a corrected field loses its error", async () => {
    await openWithProperty("property-1");
    fireEvent.change(percentInputs()[0], { target: { value: "abc" } });
    fireEvent.click(saveButton());
    expect(screen.getByText(texts.errors.percentInvalid)).toBeTruthy();

    fireEvent.change(percentInputs()[0], { target: { value: "60" } });

    expect(screen.queryByText(texts.errors.percentInvalid)).toBeNull();
    expect(percentInputs()[0].getAttribute("aria-invalid")).toBe("false");
  });
});

describe("saving", () => {
  const fillNewSplit = async (date = NEXT_WEEK_INPUT) => {
    const handlers = await openWithProperty("property-1", { initialOwnerId: "owner-4" });
    fireEvent.change(dateInput(), { target: { value: date } });
    fireEvent.change(percentInputs()[0], { target: { value: "50,5" } });
    fireEvent.change(percentInputs()[1], { target: { value: "29.5" } });
    fireEvent.change(percentInputs()[2], { target: { value: "20" } });
    return handlers;
  };

  const result = (upcoming) => ({
    property_id: "property-1",
    property_title: "Villa Kalimaya III",
    as_of: TODAY,
    current: [],
    upcoming,
  });

  test("sends exactly the property, the UTC date and the shares in basis points", async () => {
    setShares.mockResolvedValue(result([]));
    await fillNewSplit();

    fireEvent.click(saveButton());

    await waitFor(() => expect(setShares).toHaveBeenCalledTimes(1));
    expect(setShares).toHaveBeenCalledWith({
      property_id: "property-1",
      effective_from: NEXT_WEEK,
      shares: [
        { owner_id: "owner-1", ownership_basis_points: 5050 },
        { owner_id: "owner-2", ownership_basis_points: 2950 },
        { owner_id: "owner-4", ownership_basis_points: 2000 },
      ],
    });
  });

  test("calls onSaved straight away when nothing is upcoming", async () => {
    const saved = result([]);
    setShares.mockResolvedValue(saved);
    const { onSaved } = await fillNewSplit(TODAY_INPUT);

    fireEvent.click(saveButton());

    await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1));
    expect(onSaved).toHaveBeenCalledWith({
      result: saved,
      propertyTitle: "Villa Kalimaya III",
      dateInput: TODAY_INPUT,
    });
  });

  test("shows the upcoming split for a future date, and calls onSaved on Close", async () => {
    const upcoming = [
      { owner_id: "owner-1", ownership_basis_points: 5050, effective_from: NEXT_WEEK, effective_to: null },
      { owner_id: "OWNER-4", ownership_basis_points: 2000, effective_from: NEXT_WEEK, effective_to: null },
    ];
    const saved = result(upcoming);
    setShares.mockResolvedValue(saved);
    const { onSaved, onClose } = await fillNewSplit();

    fireEvent.click(saveButton());

    expect(await screen.findByRole("heading", { name: texts.upcomingTitle })).toBeTruthy();
    expect(screen.getAllByRole("listitem").map((item) => item.textContent)).toEqual([
      "Anna de Vries, 50.5%",
      "Dirk Smit, 20%",
    ]);
    expect(onSaved).not.toHaveBeenCalled();
    const closeButtons = screen.getAllByRole("button", { name: t.form.close });
    expect(closeButtons[1]).toHaveFocus();

    fireEvent.click(closeButtons[1]);

    expect(onSaved).toHaveBeenCalledWith({
      result: saved,
      propertyTitle: "Villa Kalimaya III",
      dateInput: NEXT_WEEK_INPUT,
    });
    expect(onClose).not.toHaveBeenCalled();
  });

  test("Escape on the upcoming split also reports the save", async () => {
    setShares.mockResolvedValue(
      result([{ owner_id: "owner-1", ownership_basis_points: 10000, effective_from: NEXT_WEEK }])
    );
    const { onSaved, onClose } = await fillNewSplit();
    fireEvent.click(saveButton());
    await screen.findByRole("heading", { name: texts.upcomingTitle });

    fireEvent.keyDown(document, { key: "Escape" });

    expect(onSaved).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();
  });

  test.each([
    ["a 409 for today", TODAY_INPUT, 409, texts.errorChangedToday],
    ["a 409 for a later date", NEXT_WEEK_INPUT, 409, texts.errorConflict],
    ["a 500", NEXT_WEEK_INPUT, 500, t.form.errorGeneric],
    ["a 401", NEXT_WEEK_INPUT, 401, t.errorSignedOut],
  ])("translates %s and lets the host try again", async (_label, date, status, text) => {
    setShares.mockRejectedValue(
      new OwnerApiError("raw server message", { status, serverMessage: "raw server message" })
    );
    const { onSaved } = await fillNewSplit(date);

    fireEvent.click(saveButton());

    expect((await screen.findByRole("alert")).textContent).toBe(text);
    expect(saveButton().disabled).toBe(false);
    expect(onSaved).not.toHaveBeenCalled();
  });

  test("disables the buttons and ignores Escape while saving, and sends once", async () => {
    const pending = deferred();
    setShares.mockReturnValue(pending.promise);
    const { onClose, onSaved } = await fillNewSplit();

    fireEvent.click(saveButton());

    const savingButton = await screen.findByRole("button", { name: texts.saving });
    expect(savingButton.disabled).toBe(true);
    expect(screen.getByRole("button", { name: texts.cancel }).disabled).toBe(true);
    expect(screen.getByRole("button", { name: texts.addOwner }).disabled).toBe(true);
    expect(screen.getByRole("button", { name: "Remove Anna de Vries" }).disabled).toBe(true);
    expect(screen.getByRole("button", { name: t.form.close }).disabled).toBe(true);
    fireEvent.keyDown(document, { key: "Escape" });
    fireEvent.submit(screen.getByRole("form", { name: texts.title }));
    expect(onClose).not.toHaveBeenCalled();
    expect(setShares).toHaveBeenCalledTimes(1);

    pending.resolve(result([]));
    await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1));
  });
});

describe("closing", () => {
  test("Cancel, the close button and Escape call onClose without saving", async () => {
    const { onClose } = renderModal();
    await screen.findByLabelText(texts.propertyLabel);

    fireEvent.click(screen.getByRole("button", { name: texts.cancel }));
    fireEvent.click(screen.getByRole("button", { name: t.form.close }));
    fireEvent.keyDown(document, { key: "Escape" });

    expect(onClose).toHaveBeenCalledTimes(3);
    expect(setShares).not.toHaveBeenCalled();
  });

  test("is a modal dialog named by its title", async () => {
    renderModal();

    expect(await screen.findByRole("dialog", { name: texts.title })).toBeTruthy();
  });
});
