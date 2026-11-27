import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import DisconnectConfirmModal from "./DisconnectConfirmModal";
import { DISMISS_ACTIONS } from "./modalTestHelpers";

const PLATFORMS = {
  BookingCom: { otaCode: "BookingCom", name: "Booking.com" },
  Airbnb: { otaCode: "Airbnb", name: "Airbnb" },
  Vrbo: { otaCode: "Vrbo", name: "Vrbo" },
};

const renderModal = (props = {}) => {
  const onConfirm = jest.fn();
  const onClose = jest.fn();
  render(
    <DisconnectConfirmModal
      platform={PLATFORMS.Airbnb}
      upcomingBookingCount={0}
      onConfirm={onConfirm}
      onClose={onClose}
      {...props}
    />
  );
  return { onConfirm, onClose };
};

describe("DisconnectConfirmModal", () => {
  test.each([
    ["BookingCom", "Turn off Booking.com?", "reopen your dates in the Booking.com extranet"],
    ["Airbnb", "Turn off Airbnb?", "reopen your dates in your Airbnb calendar"],
    ["Vrbo", "Turn off Vrbo?", "reopen your dates in your Vrbo calendar"],
  ])("%s: names the platform in the title and says where to reopen the dates", (otaCode, title, reopen) => {
    renderModal({ platform: PLATFORMS[otaCode] });

    expect(screen.getByRole("dialog", { name: title })).toBeInTheDocument();
    expect(screen.getByText(new RegExp(reopen))).toBeInTheDocument();
    expect(screen.getByText(/Existing bookings stay valid/)).toBeInTheDocument();
    expect(screen.getByText(/You can turn .* on again later\./)).toBeInTheDocument();
  });

  test.each([
    [1, "You have 1 upcoming booking from Airbnb."],
    [4, "You have 4 upcoming bookings from Airbnb."],
  ])("with %i upcoming bookings it shows: %s", (count, sentence) => {
    renderModal({ upcomingBookingCount: count });

    expect(screen.getByText(sentence)).toBeInTheDocument();
  });

  test("without upcoming bookings it shows no such line", () => {
    renderModal({ upcomingBookingCount: 0 });

    expect(screen.queryByText(/upcoming/)).not.toBeInTheDocument();
  });

  test("a channel disconnected outside Domits gets its own text", () => {
    renderModal({ platform: PLATFORMS.Vrbo, disconnectedOutsideDomits: true });

    expect(screen.getByText(/already disconnected outside Domits/)).toBeInTheDocument();
    expect(screen.getByText(/Close your dates on Vrbo yourself/)).toBeInTheDocument();
    expect(screen.queryByText(/Existing bookings stay valid/)).not.toBeInTheDocument();
  });

  test("Turn off calls onConfirm once and does not close", async () => {
    const user = userEvent.setup();
    const { onConfirm, onClose } = renderModal();

    await user.click(screen.getByRole("button", { name: "Turn off" }));

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();
  });

  test.each(DISMISS_ACTIONS)("%s closes without confirming", async (_name, dismiss) => {
    const user = userEvent.setup();
    const { onConfirm, onClose } = renderModal();

    await dismiss(user);

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });
});
