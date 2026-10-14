import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import BookingRequestForm from "../rendering/booking/BookingRequestForm";

const renderForm = (props = {}) => {
  const onGuestChange = jest.fn();
  const onSubmit = jest.fn();
  const utils = render(
    <BookingRequestForm
      guest={{ name: "", email: "" }}
      onGuestChange={onGuestChange}
      onSubmit={onSubmit}
      isSubmitting={false}
      fieldErrors={{}}
      formError=""
      {...props}
    />
  );
  return { ...utils, onGuestChange, onSubmit };
};

describe("BookingRequestForm", () => {
  it("collects a name and an email and submits without reloading the page", () => {
    const { onGuestChange, onSubmit } = renderForm({ guest: { name: "Guest Name", email: "guest@example.com" } });

    fireEvent.change(screen.getByLabelText("Your name"), { target: { value: "Guest Name Two" } });
    expect(onGuestChange).toHaveBeenCalledWith("name", "Guest Name Two");

    fireEvent.change(screen.getByLabelText("Email address"), { target: { value: "two@example.com" } });
    expect(onGuestChange).toHaveBeenCalledWith("email", "two@example.com");

    fireEvent.click(screen.getByRole("button", { name: "Request to book" }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it("says the host still has to confirm before anything is booked", () => {
    renderForm();
    expect(screen.getByText(/nothing is booked until the host confirms/i)).toBeInTheDocument();
  });

  it("shows field errors next to their inputs and links them for screen readers", () => {
    renderForm({ fieldErrors: { name: "Please enter your name.", email: "Please enter a valid email address." } });

    expect(screen.getByLabelText("Your name")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByLabelText("Your name")).toHaveAccessibleDescription("Please enter your name.");
    expect(screen.getByLabelText("Email address")).toHaveAccessibleDescription("Please enter a valid email address.");
  });

  it("shows a form-level error from the server", () => {
    renderForm({ formError: "Please provide your name and a valid email address." });
    expect(screen.getByRole("alert")).toHaveTextContent("Please provide your name and a valid email address.");
  });

  it("locks the fields and relabels the button while sending", () => {
    renderForm({ isSubmitting: true, guest: { name: "Guest", email: "guest@example.com" } });

    expect(screen.getByLabelText("Your name")).toBeDisabled();
    expect(screen.getByLabelText("Email address")).toBeDisabled();
    expect(screen.getByRole("button", { name: "Sending…" })).toBeDisabled();
  });
});
