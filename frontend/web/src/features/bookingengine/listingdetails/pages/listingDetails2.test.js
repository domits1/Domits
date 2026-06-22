import React from "react";
import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import ListingDetails2 from "./listingDetails2";
import FetchPropertyById from "../services/fetchPropertyById";
import fetchHostInfo from "../services/fetchHostInfo";
import RangeCalendar from "../views/RangeCalendar";

jest.mock("../services/fetchPropertyById");
jest.mock("../services/fetchHostInfo");
jest.mock("../../../hostdashboard/Loading", () => () => <div>Loading</div>);
jest.mock("../components/header", () => () => <div>Header</div>);
jest.mock("../components/sectionTabs", () => () => <div>Tabs</div>);
jest.mock("../views/propertyContainer", () => {
  const PropTypes = require("prop-types");
  const MockPropertyContainer = ({
    unavailableDateKeys = [],
    bookedDateKeys = [],
    externalBlockedDateKeys = [],
    availabilityRanges = [],
    availableDateKeys = null,
    children,
  }) => {
    const safeAvailableDateKeys = Array.isArray(availableDateKeys) ? availableDateKeys : [];
    return (
      <div>
        <div data-testid="property-unavailable-dates">{unavailableDateKeys.join("|")}</div>
        <div data-testid="property-booked-dates">{bookedDateKeys.join("|")}</div>
        <div data-testid="property-external-blocked-dates">{externalBlockedDateKeys.join("|")}</div>
        <div data-testid="property-availability-ranges">{JSON.stringify(availabilityRanges)}</div>
        <div data-testid="property-available-dates">{safeAvailableDateKeys.join("|")}</div>
        {children}
      </div>
    );
  };
  MockPropertyContainer.propTypes = {
    unavailableDateKeys: PropTypes.arrayOf(PropTypes.string),
    bookedDateKeys: PropTypes.arrayOf(PropTypes.string),
    externalBlockedDateKeys: PropTypes.arrayOf(PropTypes.string),
    availabilityRanges: PropTypes.arrayOf(PropTypes.object),
    availableDateKeys: PropTypes.arrayOf(PropTypes.string),
    children: PropTypes.node,
  };
  return MockPropertyContainer;
});
jest.mock("../views/bookingContainer", () => {
  const PropTypes = require("prop-types");
  const MockBookingContainer = ({
    unavailableDateKeys = [],
    bookedDateKeys = [],
    availabilityRanges = [],
    availableDateKeys = null,
  }) => {
    const safeAvailableDateKeys = Array.isArray(availableDateKeys) ? availableDateKeys : [];
    return (
      <div>
        <div data-testid="booking-unavailable-dates">{unavailableDateKeys.join("|")}</div>
        <div data-testid="booking-booked-dates">{bookedDateKeys.join("|")}</div>
        <div data-testid="booking-availability-ranges">{JSON.stringify(availabilityRanges)}</div>
        <div data-testid="booking-available-dates">{safeAvailableDateKeys.join("|")}</div>
      </div>
    );
  };
  MockBookingContainer.propTypes = {
    unavailableDateKeys: PropTypes.arrayOf(PropTypes.string),
    bookedDateKeys: PropTypes.arrayOf(PropTypes.string),
    availabilityRanges: PropTypes.arrayOf(PropTypes.object),
    availableDateKeys: PropTypes.arrayOf(PropTypes.string),
  };
  return MockBookingContainer;
});

const renderListingDetails = () =>
  render(
    <MemoryRouter initialEntries={["/listingdetails?ID=property-1"]}>
      <ListingDetails2 />
    </MemoryRouter>
  );

const mockProperty = (calendarAvailability = {}, options = {}) => {
  FetchPropertyById.mockResolvedValue({
    property: {
      id: "property-1",
      hostId: "host-1",
      title: "Demo listing",
    },
    availability: options.availability || [],
    calendarAvailability,
  });
  fetchHostInfo.mockResolvedValue({ name: "Host" });
};

const renderRangeCalendar = (props = {}) => {
  const onRangeChange = jest.fn();
  render(
    <RangeCalendar
      availabilityRanges={[{ start: 20260615, end: 20260621 }]}
      availableDateKeys={[]}
      checkInDate=""
      checkOutDate=""
      onRangeChange={onRangeChange}
      {...props}
    />
  );
  return onRangeChange;
};

describe("ListingDetails2 availability", () => {
  beforeEach(() => {
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => [],
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test("uses backend unavailable date keys, external blocked dates, and active booking nights", async () => {
    mockProperty({
      externalBlockedDates: ["2026-06-18"],
      unavailableDateKeys: ["2026-06-19"],
    });
    globalThis.fetch.mockResolvedValue({
      ok: true,
      json: async () => [
        {
          arrivaldate: "2026-06-15",
          departuredate: "2026-06-17",
        },
      ],
    });

    renderListingDetails();

    await waitFor(() => {
      expect(screen.getByTestId("booking-unavailable-dates")).toHaveTextContent("2026-06-19");
    });

    const unavailableDates = screen.getByTestId("booking-unavailable-dates").textContent;
    expect(unavailableDates).toContain("2026-06-15");
    expect(unavailableDates).toContain("2026-06-16");
    expect(unavailableDates).toContain("2026-06-18");
    expect(unavailableDates).toContain("2026-06-19");
    expect(unavailableDates).not.toContain("2026-06-17");

    const bookedDates = screen.getByTestId("property-booked-dates").textContent;
    expect(bookedDates).toContain("2026-06-15");
    expect(bookedDates).toContain("2026-06-16");
    expect(bookedDates).not.toContain("2026-06-17");
    expect(screen.getByTestId("booking-booked-dates")).toHaveTextContent("2026-06-15");
    expect(screen.getByTestId("property-external-blocked-dates")).toHaveTextContent("2026-06-18");
    expect(screen.getByTestId("property-unavailable-dates")).toHaveTextContent("2026-06-19");
  });

  test("falls back gracefully when backend unavailable date keys are missing", async () => {
    mockProperty({
      externalBlockedDates: ["2026-06-20"],
    });

    renderListingDetails();

    await waitFor(() => {
      expect(screen.getByTestId("booking-unavailable-dates")).toHaveTextContent("2026-06-20");
    });
  });

  test("passes base availability and explicit available overrides to guest availability components", async () => {
    mockProperty(
      {
        availableDateKeys: ["2026-06-10"],
        unavailableDateKeys: ["2026-06-19"],
      },
      {
        availability: [{ availableStartDate: 20260615, availableEndDate: 20260621 }],
      }
    );

    renderListingDetails();

    await waitFor(() => {
      expect(screen.getByTestId("booking-available-dates")).toHaveTextContent("2026-06-10");
    });

    expect(screen.getByTestId("booking-availability-ranges")).toHaveTextContent(
      JSON.stringify([{ start: 20260615, end: 20260621 }])
    );
    expect(screen.getByTestId("property-available-dates")).toHaveTextContent("2026-06-10");
    expect(screen.getByTestId("property-availability-ranges")).toHaveTextContent(
      JSON.stringify([{ start: 20260615, end: 20260621 }])
    );
  });

  test("keeps missing availableDateKeys as unknown instead of an empty allowlist", async () => {
    mockProperty(
      {
        unavailableDateKeys: ["2026-06-19"],
      },
      {
        availability: [{ availableStartDate: 20260615, availableEndDate: 20260621 }],
      }
    );

    renderListingDetails();

    await waitFor(() => {
      expect(screen.getByTestId("booking-available-dates")).toHaveTextContent("");
    });
    expect(screen.getByTestId("booking-availability-ranges")).toHaveTextContent(
      JSON.stringify([{ start: 20260615, end: 20260621 }])
    );
  });
});

describe("RangeCalendar effective availability", () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date("2026-06-01T12:00:00.000Z"));
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  test("renders outside-base-window dates as unavailable with a visible marker", () => {
    renderRangeCalendar();

    const outsideWindowDate = screen.getByRole("button", { name: "June 10, 2026" });
    const insideWindowDate = screen.getByRole("button", { name: "June 15, 2026" });

    expect(outsideWindowDate).toBeDisabled();
    expect(outsideWindowDate).toHaveClass("range-calendar__day--outside-window");
    expect(outsideWindowDate).toHaveClass("range-calendar__day--unavailable");
    expect(within(outsideWindowDate).getByText("--")).toBeInTheDocument();
    expect(insideWindowDate).not.toBeDisabled();
  });

  test("renders booked dates with the same unavailable marker and style as other blocked dates", () => {
    renderRangeCalendar({
      bookedDateKeys: ["2026-06-16"],
      unavailableDateKeys: ["2026-06-16"],
    });

    const bookedDate = screen.getByRole("button", { name: "June 16, 2026" });

    expect(bookedDate).toBeDisabled();
    expect(bookedDate).toHaveClass("range-calendar__day--unavailable");
    expect(bookedDate).not.toHaveClass("range-calendar__day--booked");
    expect(within(bookedDate).getByText("--")).toBeInTheDocument();
    expect(within(bookedDate).queryByText("Booked")).not.toBeInTheDocument();
  });

  test("does not mass-disable outside-window dates when available override snapshot is missing", () => {
    renderRangeCalendar({ availableDateKeys: null });

    expect(screen.getByRole("button", { name: "June 10, 2026" })).not.toBeDisabled();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  test("shows a clear message when selected stay includes outside-window unavailable nights", () => {
    const onRangeChange = renderRangeCalendar({ availableDateKeys: ["2026-06-10"] });

    fireEvent.click(screen.getByRole("button", { name: "June 10, 2026" }));
    fireEvent.click(screen.getByRole("button", { name: "June 15, 2026" }));

    expect(screen.getByRole("alert")).toHaveTextContent("This property has no availability for the selected dates.");
    expect(onRangeChange).toHaveBeenLastCalledWith("2026-06-15", "");
  });

  test("keeps explicit available override outside base window selectable", () => {
    const onRangeChange = renderRangeCalendar({ availableDateKeys: ["2026-06-10"] });

    const availableOverrideDate = screen.getByRole("button", { name: "June 10, 2026" });

    expect(availableOverrideDate).not.toBeDisabled();
    fireEvent.click(availableOverrideDate);

    expect(onRangeChange).toHaveBeenCalledWith("2026-06-10", "");
  });

  test("keeps explicit unavailable override inside base window unavailable", () => {
    renderRangeCalendar({ unavailableDateKeys: ["2026-06-16"] });

    const unavailableOverrideDate = screen.getByRole("button", { name: "June 16, 2026" });

    expect(unavailableOverrideDate).toBeDisabled();
    expect(unavailableOverrideDate).toHaveClass("range-calendar__day--unavailable");
    expect(unavailableOverrideDate).toHaveClass("range-calendar__day--unavailable-override");
    expect(within(unavailableOverrideDate).getByText("--")).toBeInTheDocument();
  });

  test("booked dates remain unavailable when an explicit available override exists", () => {
    renderRangeCalendar({
      availableDateKeys: ["2026-06-16"],
      bookedDateKeys: ["2026-06-16"],
    });

    const availableOverrideDate = screen.getByRole("button", { name: "June 16, 2026" });

    expect(availableOverrideDate).toBeDisabled();
    expect(availableOverrideDate).toHaveClass("range-calendar__day--unavailable");
    expect(availableOverrideDate).not.toHaveClass("range-calendar__day--booked");
    expect(within(availableOverrideDate).getByText("--")).toBeInTheDocument();
    expect(within(availableOverrideDate).queryByText("Booked")).not.toBeInTheDocument();
  });

  test("blocks active booking nights as unavailable and keeps checkout date selectable", () => {
    renderRangeCalendar({
      availabilityRanges: [{ start: 20260619, end: 20260622 }],
      bookedDateKeys: ["2026-06-19", "2026-06-20", "2026-06-21"],
    });

    const firstBookedNight = screen.getByRole("button", { name: "June 19, 2026" });
    const checkoutDate = screen.getByRole("button", { name: "June 22, 2026" });

    expect(firstBookedNight).toBeDisabled();
    expect(firstBookedNight).toHaveClass("range-calendar__day--unavailable");
    expect(within(firstBookedNight).getByText("--")).toBeInTheDocument();
    expect(within(firstBookedNight).queryByText("Booked")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "June 20, 2026" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "June 21, 2026" })).toBeDisabled();
    expect(checkoutDate).not.toBeDisabled();
    expect(checkoutDate).not.toHaveClass("range-calendar__day--unavailable");
    expect(within(checkoutDate).queryByText("Booked")).not.toBeInTheDocument();
  });

  test("shows the generic unavailable message when selected stay includes booked nights", () => {
    const onRangeChange = renderRangeCalendar({ bookedDateKeys: ["2026-06-16"] });

    fireEvent.click(screen.getByRole("button", { name: "June 15, 2026" }));
    fireEvent.click(screen.getByRole("button", { name: "June 18, 2026" }));

    expect(screen.getByRole("alert")).toHaveTextContent("This property has no availability for the selected dates.");
    expect(onRangeChange).toHaveBeenLastCalledWith("2026-06-18", "");
  });
});
