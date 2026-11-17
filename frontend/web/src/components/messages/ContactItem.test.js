/**
 * @jest-environment jsdom
 */

import React from "react";
import "@testing-library/jest-dom";
import { fireEvent, render, screen } from "@testing-library/react";
import ContactItem from "./ContactItem";

jest.mock("./domits-logo.jpg", () => "domits-logo.jpg");

describe("ContactItem profile photo", () => {
  test("falls back to the Domits logo when the profile photo does not load", () => {
    render(<ContactItem contact={{ givenName: "Srinath", profileImage: "https://example.com/broken.jpg" }} />);

    const photo = screen.getByRole("img");
    fireEvent.error(photo);

    expect(photo).toHaveAttribute("src", "domits-logo.jpg");
  });
});

const renderItem = (contact) =>
  render(<ContactItem contact={{ givenName: "Tst Domits", ...contact }} selected={false} />);

describe("ContactItem channel badge", () => {
  test("shows the OTA name with its own case for a Channex contact", () => {
    renderItem({ platform: "CHANNEX", channelLabel: "Booking.com", bookingSource: "BookingCom" });

    expect(screen.getByText("Booking.com")).toBeInTheDocument();
    expect(screen.queryByText("BOOKING.COM")).not.toBeInTheDocument();
  });

  test("shows Channex for a Channex contact without a booking source", () => {
    renderItem({ platform: "CHANNEX" });

    expect(screen.getByText("Channex")).toBeInTheDocument();
  });

  test("keeps the WhatsApp label", () => {
    renderItem({ platform: "WHATSAPP", channelLabel: "WhatsApp" });

    expect(screen.getByText("WhatsApp")).toBeInTheDocument();
  });

  test("shows no badge for a Domits contact", () => {
    renderItem({ platform: "DOMITS", channelLabel: "DOMITS" });

    expect(screen.queryByText("DOMITS")).not.toBeInTheDocument();
  });
});
