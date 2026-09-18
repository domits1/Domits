import React from "react";
import "@testing-library/jest-dom";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { toast } from "react-toastify";
import SpecialRequestsSection from "./SpecialRequestsSection";
import { updateBookingSpecialRequest } from "../services/bookingAPI";

jest.mock("react-toastify", () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));

jest.mock("../services/bookingAPI", () => ({
  updateBookingSpecialRequest: jest.fn(),
}));

describe("SpecialRequestsSection save button state", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("disables the Save button again immediately after a successful save", async () => {
    updateBookingSpecialRequest.mockResolvedValue({});
    const user = userEvent.setup();

    render(<SpecialRequestsSection bookingId="booking-1" specialRequest="Late check-in" />);

    const textarea = screen.getByPlaceholderText(/late check-in around 9pm/i);
    const saveButton = screen.getByRole("button", { name: /save request/i });

    expect(saveButton).toBeDisabled();

    await user.clear(textarea);
    await user.type(textarea, "Extra pillows please");
    expect(saveButton).toBeEnabled();

    await user.click(saveButton);

    await waitFor(() => expect(toast.success).toHaveBeenCalled());
    expect(saveButton).toBeDisabled();
  });
});
