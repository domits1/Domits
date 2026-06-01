import React from "react";
import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import { createInitialPricingForm } from "../constants";
import { HostPropertyAvailabilityTab, HostPropertyTabContent } from "./HostPropertyTabContent";
import { getAccessToken } from "../../../../services/getAccessToken";

jest.mock("../../../../services/getAccessToken", () => ({
  getAccessToken: jest.fn(() => "test-token"),
}));

const okJsonResponse = (body) => ({
  ok: true,
  json: async () => body,
});

const renderAvailabilityTab = (props = {}) =>
  render(
    <HostPropertyAvailabilityTab
      propertyId="property-1"
      listingTitle="Demo listing"
      availability={[{ availableStartDate: 20260615, availableEndDate: 20260621 }]}
      saving={false}
      {...props}
    />
  );

const expectCalendarOverridePatch = async (expectedBody) => {
  await waitFor(() => {
    expect(globalThis.fetch).toHaveBeenCalledTimes(2);
  });
  const [url, options] = globalThis.fetch.mock.calls[1];
  expect(url).toContain("/calendar/overrides");
  expect(options).toEqual(expect.objectContaining({ method: "PATCH" }));
  expect(JSON.parse(options.body)).toEqual(expectedBody);
};

const mockOverrideLoad = (overrides = []) => {
  globalThis.fetch.mockResolvedValueOnce(okJsonResponse({ overrides }));
};

const mockOverrideLoadThenSave = ({ savedOverrides, initialOverrides = [] }) => {
  globalThis.fetch
    .mockResolvedValueOnce(okJsonResponse({ overrides: initialOverrides }))
    .mockResolvedValueOnce(okJsonResponse({ overrides: savedOverrides }));
};

const getSaveButton = () => screen.getByRole("button", { name: /save availability/i });

const prepareRangeSelection = async ({ startDate, endDate, availability }) => {
  await waitFor(() => {
    expect(getSaveButton()).toBeEnabled();
  });
  fireEvent.change(screen.getByLabelText("Start date"), { target: { value: startDate } });
  fireEvent.change(screen.getByLabelText("End date"), { target: { value: endDate } });
  fireEvent.change(screen.getByLabelText("Mark selected range as", { selector: "select" }), {
    target: { value: availability },
  });
};

const saveAvailabilityRange = async (rangeSelection) => {
  await prepareRangeSelection(rangeSelection);
  fireEvent.click(getSaveButton());
};

const buildTabContentProps = () => ({
  selectedTab: "Availability",
  form: { title: "Demo listing", subtitle: "", description: "" },
  updateField: jest.fn(),
  displayedPropertyType: "Entire house",
  setCapacity: jest.fn(),
  capacity: { propertyType: "Entire house", guests: 2, bedrooms: 1, beds: 1, bathrooms: 1 },
  adjustCapacityField: jest.fn(),
  updateCapacityField: jest.fn(),
  address: { street: "", houseNumber: "", postalCode: "", city: "", country: "" },
  updateAddressField: jest.fn(),
  displayedPhotos: [],
  pendingPhotoCount: 0,
  onOpenPhotoPicker: jest.fn(),
  onPhotoFilesSelected: jest.fn(),
  onPhotoDrop: jest.fn(),
  onPhotoDragOver: jest.fn(),
  onPhotoDragLeave: jest.fn(),
  isPhotoDragOver: false,
  onRequestDeletePhoto: jest.fn(),
  onPhotoTileDragStart: jest.fn(),
  onPhotoTileDragEnd: jest.fn(),
  onPhotoTileDragOver: jest.fn(),
  onPhotoTileDragLeave: jest.fn(),
  onPhotoTileDrop: jest.fn(),
  draggingPhotoId: null,
  photoDropTargetId: null,
  deletingPhoto: false,
  photoInputRef: { current: null },
  amenityCategoryKeys: [],
  amenitiesByCategory: {},
  expandedAmenityCategories: {},
  selectedAmenityCountByCategory: {},
  selectedAmenityIdSet: new Set(),
  toggleAmenityCategory: jest.fn(),
  toggleAmenitySelection: jest.fn(),
  pricingForm: createInitialPricingForm(),
  setPricingForm: jest.fn(),
  propertyId: "property-1",
  listingTitle: "Demo listing",
  availability: [{ availableStartDate: 20260615, availableEndDate: 20260621 }],
  policyRules: {},
  checkInDetails: { checkIn: {}, checkOut: {} },
  policyAvailabilitySettings: {
    advanceNoticeDays: 0,
    preparationTimeDays: 0,
    advanceNoticeRestrictionKey: "MinimumAdvanceReservation",
    preparationTimeRestrictionKey: "PreparationTimeDays",
  },
  setCheckInDetails: jest.fn(),
  setPolicyAvailabilitySettings: jest.fn(),
  updatePolicyRule: jest.fn(),
  handleDeletePropertyClick: jest.fn(),
  bookingType: "direct",
  onBookingTypeChange: jest.fn(),
  saving: false,
});

describe("HostPropertyAvailabilityTab", () => {
  beforeEach(() => {
    getAccessToken.mockReturnValue("test-token");
    globalThis.fetch = jest.fn().mockResolvedValue(okJsonResponse({ overrides: [] }));
  });

  afterEach(() => {
    jest.clearAllMocks();
    delete globalThis.fetch;
  });

  test("renders a calendar from the Listing Editor Availability tab instead of the placeholder", async () => {
    render(<HostPropertyTabContent {...buildTabContentProps()} />);

    expect(screen.getByRole("heading", { name: "Availability" })).toBeInTheDocument();
    expect(screen.getByRole("grid", { name: "Availability calendar" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Previous month" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Next month" })).toBeInTheDocument();
    expect(screen.queryByText(/coming soon/i)).not.toBeInTheDocument();

    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/calendar/overrides?propertyId=property-1"),
        expect.objectContaining({ method: "GET" })
      );
    });
  });

  test("loads existing calendar overrides and shows unavailable dates", async () => {
    mockOverrideLoad([
      { date: 20260615, isAvailable: false },
      { date: 20260616, isAvailable: true },
    ]);

    renderAvailabilityTab();

    expect(await screen.findByText("2026-06-15")).toBeInTheDocument();
    expect(screen.queryByText("2026-06-16")).not.toBeInTheDocument();
  });

  test("shows outside-listing-window dates when base availability data allows it", async () => {
    renderAvailabilityTab();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /save availability/i })).toBeEnabled();
    });
    fireEvent.change(screen.getByLabelText("Start date"), { target: { value: "2026-06-10" } });

    expect(
      screen.getByRole("gridcell", {
        name: /2026-06-10, Outside listing window/i,
      })
    ).toBeInTheDocument();
  });

  test("saves an unavailable override to the shared calendar override endpoint", async () => {
    mockOverrideLoadThenSave({
      savedOverrides: [{ date: 20260616, isAvailable: false }],
    });

    renderAvailabilityTab();

    await saveAvailabilityRange({
      startDate: "2026-06-16",
      endDate: "2026-06-16",
      availability: "unavailable",
    });

    await expectCalendarOverridePatch({
      propertyId: "property-1",
      overrides: [{ date: 20260616, isAvailable: false }],
    });
    expect(await screen.findByText(/1 date marked unavailable/i)).toBeInTheDocument();
  });

  test("saves an unavailable date range to the shared calendar override endpoint", async () => {
    mockOverrideLoadThenSave({
      savedOverrides: [
        { date: 20260615, isAvailable: false },
        { date: 20260616, isAvailable: false },
        { date: 20260617, isAvailable: false },
      ],
    });

    renderAvailabilityTab();

    await saveAvailabilityRange({
      startDate: "2026-06-15",
      endDate: "2026-06-17",
      availability: "unavailable",
    });

    await expectCalendarOverridePatch({
      propertyId: "property-1",
      overrides: [
        { date: 20260615, isAvailable: false },
        { date: 20260616, isAvailable: false },
        { date: 20260617, isAvailable: false },
      ],
    });
    expect(await screen.findByText(/3 dates marked unavailable/i)).toBeInTheDocument();
    expect(screen.getByText("2026-06-15")).toBeInTheDocument();
    expect(screen.getByText("2026-06-16")).toBeInTheDocument();
    expect(screen.getByText("2026-06-17")).toBeInTheDocument();
  });

  test("saves an available range without changing payload shape", async () => {
    mockOverrideLoadThenSave({
      savedOverrides: [
        { date: 20260617, isAvailable: true },
        { date: 20260618, isAvailable: true },
      ],
    });

    renderAvailabilityTab();

    await saveAvailabilityRange({
      startDate: "2026-06-17",
      endDate: "2026-06-18",
      availability: "available",
    });

    await expectCalendarOverridePatch({
      propertyId: "property-1",
      overrides: [
        { date: 20260617, isAvailable: true },
        { date: 20260618, isAvailable: true },
      ],
    });
    expect(await screen.findByText(/2 dates marked available/i)).toBeInTheDocument();
  });

  test("denies access safely when the host token is missing", async () => {
    getAccessToken.mockReturnValue("");

    renderAvailabilityTab();

    expect(await screen.findByText("Sign in again to load availability.")).toBeInTheDocument();
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });
});
