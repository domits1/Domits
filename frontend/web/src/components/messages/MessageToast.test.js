/**
 * @jest-environment jsdom
 */

import React from "react";
import "@testing-library/jest-dom";
import { act, fireEvent, render, screen } from "@testing-library/react";
import MessageToast from "./MessageToast";

jest.mock("./domits-logo.jpg", () => "domits-logo.jpg");

const AUTO_CLOSE_MS = 5000;

describe("MessageToast", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test("shows no close button and never closes itself when nobody listens for the close", () => {
    render(<MessageToast message="New message" />);

    act(() => {
      jest.advanceTimersByTime(AUTO_CLOSE_MS * 2);
    });

    expect(screen.queryByRole("button", { name: "Close notification" })).not.toBeInTheDocument();
    expect(screen.getByText("New message")).toBeInTheDocument();
  });

  test("closes itself after 5 seconds, not before", () => {
    const onClose = jest.fn();
    render(<MessageToast message="Message failed to send" onClose={onClose} />);

    act(() => {
      jest.advanceTimersByTime(AUTO_CLOSE_MS - 1);
    });
    expect(onClose).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(1);
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test("closes when the close button is clicked", () => {
    const onClose = jest.fn();
    render(<MessageToast message="Message failed to send" onClose={onClose} />);

    fireEvent.click(screen.getByRole("button", { name: "Close notification" }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test("keeps its 5 seconds when the parent re-renders with a new close handler", () => {
    const firstClose = jest.fn();
    const secondClose = jest.fn();
    const { rerender } = render(<MessageToast message="Message failed to send" onClose={firstClose} />);

    act(() => {
      jest.advanceTimersByTime(3000);
    });
    rerender(<MessageToast message="Message failed to send" onClose={secondClose} />);
    act(() => {
      jest.advanceTimersByTime(2000);
    });

    expect(firstClose).not.toHaveBeenCalled();
    expect(secondClose).toHaveBeenCalledTimes(1);
  });

  test("does not call the close handler after it is unmounted", () => {
    const onClose = jest.fn();
    const { unmount } = render(<MessageToast message="Message failed to send" onClose={onClose} />);

    unmount();
    act(() => {
      jest.advanceTimersByTime(AUTO_CLOSE_MS * 2);
    });

    expect(onClose).not.toHaveBeenCalled();
  });
});
