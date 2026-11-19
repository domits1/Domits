import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PlatformCard from "./PlatformCard";

const PLATFORM = { otaCode: "BookingCom", name: "Booking.com" };
const state = (overrides = {}) => ({
  label: "Live",
  tone: "success",
  switchOn: true,
  switchDisabled: false,
  note: null,
  ...overrides,
});

describe("PlatformCard", () => {
  test("shows the platform name, the badge and the switch state", () => {
    render(<PlatformCard platform={PLATFORM} state={state()} onToggle={jest.fn()} />);

    expect(screen.getByText("Booking.com")).toBeInTheDocument();
    expect(screen.getByText("Live")).toHaveClass("chdist-badge--success");
    expect(screen.getByRole("switch", { name: "Booking.com distribution" })).toBeChecked();
  });

  test.each([
    ["success", "chdist-badge--success"],
    ["error", "chdist-badge--error"],
    ["pending", "chdist-badge--pending"],
    ["neutral", "chdist-badge--neutral"],
  ])("gives the %s tone its own badge class", (tone, className) => {
    render(<PlatformCard platform={PLATFORM} state={state({ label: "Label", tone })} onToggle={jest.fn()} />);

    expect(screen.getByText("Label")).toHaveClass(className);
  });

  test("renders an off switch", () => {
    render(<PlatformCard platform={PLATFORM} state={state({ switchOn: false })} onToggle={jest.fn()} />);

    expect(screen.getByRole("switch")).not.toBeChecked();
  });

  test("shows the note when there is one, and nothing when there is none", () => {
    const { rerender } = render(
      <PlatformCard
        platform={PLATFORM}
        state={state({ tone: "error", note: "Close your dates yourself." })}
        onToggle={jest.fn()}
      />
    );
    expect(screen.getByText("Close your dates yourself.")).toBeInTheDocument();

    rerender(<PlatformCard platform={PLATFORM} state={state()} onToggle={jest.fn()} />);
    expect(screen.queryByText("Close your dates yourself.")).not.toBeInTheDocument();
  });

  test("disables the switch when the state locks it", () => {
    render(<PlatformCard platform={PLATFORM} state={state({ switchDisabled: true })} onToggle={jest.fn()} />);

    expect(screen.getByRole("switch")).toBeDisabled();
  });

  test("disables the switch when no toggle handler is given, so it never looks usable while it does nothing", () => {
    render(<PlatformCard platform={PLATFORM} state={state()} />);

    expect(screen.getByRole("switch")).toBeDisabled();
  });

  test("reports the requested direction with the OTA code when the host flips the switch", async () => {
    const user = userEvent.setup();
    const onToggle = jest.fn();
    const { rerender } = render(
      <PlatformCard platform={PLATFORM} state={state({ switchOn: false })} onToggle={onToggle} />
    );

    await user.click(screen.getByRole("switch"));
    expect(onToggle).toHaveBeenLastCalledWith({ otaCode: "BookingCom", turnOn: true });

    rerender(<PlatformCard platform={PLATFORM} state={state({ switchOn: true })} onToggle={onToggle} />);
    await user.click(screen.getByRole("switch"));
    expect(onToggle).toHaveBeenLastCalledWith({ otaCode: "BookingCom", turnOn: false });
  });

  test("does not call the handler when the switch is locked", async () => {
    const user = userEvent.setup();
    const onToggle = jest.fn();
    render(<PlatformCard platform={PLATFORM} state={state({ switchDisabled: true })} onToggle={onToggle} />);

    await user.click(screen.getByRole("switch"));

    expect(onToggle).not.toHaveBeenCalled();
  });
});
