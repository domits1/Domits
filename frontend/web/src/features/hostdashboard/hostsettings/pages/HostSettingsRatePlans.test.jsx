import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import HostSettingsRatePlans from "./HostSettingsRatePlans";

jest.mock("../hooks/useSettingsTrans", () => ({
  __esModule: true,
  default: () => ({
    hub: { breadcrumb: "Settings" },
    t: {
      breadcrumb: "Rate Plans",
      title: "Rate Plans",
      subtitle: "Manage your rate plans.",
      ratePlansSection: "Rate Plans",
      hostOnlyFee: {
        title: "Domits.com Booking Channel",
        sub: "10% Host-only fee on bookings via Domits.com",
        note: "Allows Domits to run the platform 24/7",
      },
      directBooking: {
        cardTitle: "Direct Booking Website (% Per Reservation)",
        cardSubtitle: "All-in reservation fee",
        cardNote: "No additional transaction fee",
      },
      websitePlan: {
        cardTitle: "Direct Booking Website (Monthly)",
        cardSubtitle: "Start for free",
        cardNote: "Accelerate with Elite website",
      },
      enterprise: {
        cardTitle: "Enterprise Plan",
        cardSubtitle: "Pricing per property per month",
        cardNote: "Scales with your portfolio",
      },
    },
  }),
}));

jest.mock("../components/SettingsSubPage", () => ({
  __esModule: true,
  default: ({ children, title, subtitle }) => (
    <main>
      <h1>{title}</h1>
      <p>{subtitle}</p>
      {children}
    </main>
  ),
}));

describe("HostSettingsRatePlans", () => {
  test("shows all four plans under one Rate Plans category", () => {
    const { container } = render(
      <MemoryRouter>
        <HostSettingsRatePlans />
      </MemoryRouter>
    );

    expect(
      screen.getByRole("heading", { level: 2, name: "Rate Plans" })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Additional Plans" })
    ).not.toBeInTheDocument();

    expect(screen.getByText("Direct Booking Website (Monthly)")).toBeInTheDocument();
    expect(screen.getByText("Start for free")).toBeInTheDocument();
    expect(screen.getByText("Accelerate with Elite website")).toBeInTheDocument();

    expect(
      screen.getByText("Direct Booking Website (% Per Reservation)")
    ).toBeInTheDocument();
    expect(screen.getByText("All-in reservation fee")).toBeInTheDocument();
    expect(screen.getByText("No additional transaction fee")).toBeInTheDocument();

    expect(screen.getByText("Domits.com Booking Channel")).toBeInTheDocument();
    expect(
      screen.getByText("10% Host-only fee on bookings via Domits.com")
    ).toBeInTheDocument();
    expect(
      screen.getByText("Allows Domits to run the platform 24/7")
    ).toBeInTheDocument();

    expect(screen.getByText("Enterprise Plan")).toBeInTheDocument();
    expect(
      screen.getByText("Pricing per property per month")
    ).toBeInTheDocument();
    expect(screen.getByText("Scales with your portfolio")).toBeInTheDocument();

    expect(
      screen.getByRole("link", { name: /Direct Booking Website.*Monthly/ })
    ).toHaveAttribute(
      "href",
      "/hostdashboard/settings/rate-plans/direct-booking-website"
    );
    expect(
      screen.getByRole("link", { name: /Direct Booking Website.*Per Reservation/ })
    ).toHaveAttribute("href", "/hostdashboard/settings/rate-plans/direct-booking");
    expect(
      screen.getByRole("link", { name: /Enterprise Plan/ })
    ).toHaveAttribute("href", "/hostdashboard/settings/rate-plans/enterprise");

    expect(
      screen.getByText("Domits.com Booking Channel").closest("a")
    ).toBeNull();

    expect(
      container.querySelectorAll(".host-settings-card-chevron")
    ).toHaveLength(3);
  });
});
