import React from "react";
import "@testing-library/jest-dom";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import RemoteLockConfirmModal from "./RemoteLockConfirmModal";
import {
  DISMISS_ACTIONS,
  expectDismissalBlockedWhileInFlight,
} from "../../hostchanneldistribution/components/modalTestHelpers";
import { connectRemoteLock, disconnectRemoteLock } from "../services/remoteLockService";
import en from "../../../../content/en.json";
import nl from "../../../../content/nl.json";

jest.mock("../services/remoteLockService");

const COPY = en.settings.homeAutomation;
const SIGN_IN_NOTICE = "You'll be sent to RemoteLock to sign in.";

// variant, title, confirm button, request it must run, request it must not run
const VARIANTS = [
  ["connect", "Connect RemoteLock", "Connect", connectRemoteLock, disconnectRemoteLock],
  ["reconnect", "Reconnect RemoteLock", "Reconnect", connectRemoteLock, disconnectRemoteLock],
  ["disconnect", "Disconnect RemoteLock", "Disconnect", disconnectRemoteLock, connectRemoteLock],
];

const renderModal = (variant, props = {}) =>
  render(<RemoteLockConfirmModal variant={variant} copy={COPY} onClose={jest.fn()} onDone={jest.fn()} {...props} />);

describe("RemoteLockConfirmModal", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it.each(["connect", "reconnect"])("%s tells the host they are sent to RemoteLock to sign in", (variant) => {
    renderModal(variant);

    expect(screen.getByText(SIGN_IN_NOTICE)).toBeInTheDocument();
  });

  it("disconnect explains that guests' codes are no longer managed", () => {
    renderModal("disconnect");

    expect(screen.getByText(/no longer manage your guests' door codes/)).toBeInTheDocument();
    expect(screen.queryByText(SIGN_IN_NOTICE)).not.toBeInTheDocument();
  });

  it("is a dialog named after the variant", () => {
    renderModal("reconnect");

    expect(screen.getByRole("dialog", { name: "Reconnect RemoteLock" })).toBeInTheDocument();
  });

  it("is shown in the copy it is given", () => {
    renderModal("connect", { copy: nl.settings.homeAutomation });

    expect(screen.getByRole("dialog", { name: "RemoteLock koppelen" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Annuleren" })).toBeInTheDocument();
  });

  it.each(VARIANTS)("%s: confirming runs only its own request and hands the result to onDone", async (variant, _title, confirmName, request, otherRequest) => {
    const user = userEvent.setup();
    const result = { status: "SOMETHING", lastSyncAt: null };
    request.mockResolvedValue(result);
    const onDone = jest.fn();
    renderModal(variant, { onDone });

    await user.click(screen.getByRole("button", { name: confirmName }));

    expect(request).toHaveBeenCalledTimes(1);
    expect(otherRequest).not.toHaveBeenCalled();
    expect(onDone).toHaveBeenCalledWith(result);
  });

  it.each(VARIANTS)("%s: Cancel closes without running a request", async (variant) => {
    const user = userEvent.setup();
    const onClose = jest.fn();
    renderModal(variant, { onClose });

    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(connectRemoteLock).not.toHaveBeenCalled();
    expect(disconnectRemoteLock).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it.each(VARIANTS)("%s: an error shows a fixed message, logs the detail and keeps the modal open", async (variant, _title, confirmName, request) => {
    const user = userEvent.setup();
    const consoleError = jest.spyOn(console, "error").mockImplementation(() => {});
    request.mockRejectedValue(new Error("secret internal detail"));
    const onDone = jest.fn();
    const onClose = jest.fn();
    renderModal(variant, { onDone, onClose });

    await user.click(screen.getByRole("button", { name: confirmName }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Something went wrong. Please try again.");
    expect(screen.queryByText(/secret internal detail/)).not.toBeInTheDocument();
    expect(consoleError).toHaveBeenCalledWith(expect.any(String), "secret internal detail");
    expect(onDone).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: confirmName })).toBeEnabled();
    consoleError.mockRestore();
  });

  describe.each(VARIANTS)("%s: while the request is in flight", (variant, _title, confirmName, request) => {
    it.each(DISMISS_ACTIONS)("%s does not close the modal, and works again once it settles", (_label, dismiss) =>
      expectDismissalBlockedWhileInFlight({
        dismiss,
        mockedRequest: request,
        submitButtonName: confirmName,
        settledValue: { status: "SOMETHING", lastSyncAt: null },
        renderModal: (onClose) => renderModal(variant, { onClose }),
      })
    );
  });

  describe("connect and reconnect", () => {
    const AUTHORIZE_URL = "https://connect.remotelock.com/oauth/authorize?state=s";
    let originalLocation;

    beforeEach(() => {
      originalLocation = window.location;
      delete window.location;
      window.location = { assign: jest.fn() };
    });

    afterEach(() => {
      window.location = originalLocation;
    });

    it.each([
      ["connect", "Connect"],
      ["reconnect", "Reconnect"],
    ])("%s sends the browser to RemoteLock and stays disabled while it leaves", async (variant, confirmName) => {
      const user = userEvent.setup();
      connectRemoteLock.mockResolvedValue({ status: "CONNECTING", authorizeUrl: AUTHORIZE_URL });
      const onDone = jest.fn();
      renderModal(variant, { onDone });

      await user.click(screen.getByRole("button", { name: confirmName }));

      await waitFor(() => expect(window.location.assign).toHaveBeenCalledWith(AUTHORIZE_URL));
      expect(onDone).not.toHaveBeenCalled();
      expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
    });

    it.each([
      [true, true],
      [false, false],
    ])("pageshow with persisted %s: modal back to normal %s", async (persisted, restored) => {
      const user = userEvent.setup();
      connectRemoteLock.mockResolvedValue({ status: "CONNECTING", authorizeUrl: AUTHORIZE_URL });
      renderModal("connect");
      await user.click(screen.getByRole("button", { name: "Connect" }));
      await waitFor(() => expect(window.location.assign).toHaveBeenCalled());
      const pageShow = new Event("pageshow");
      Object.defineProperty(pageShow, "persisted", { value: persisted });

      act(() => {
        window.dispatchEvent(pageShow);
      });

      expect(screen.getByRole("button", { name: "Cancel" }).disabled).toBe(!restored);
      expect(screen.getByRole("button", { name: restored ? "Connect" : "Connecting..." })).toBeInTheDocument();
    });

    it.each([
      ["ALREADY_CONNECTED", "RemoteLock is already connected."],
      ["CONFIG_MISSING", "RemoteLock isn't available right now. Please contact support."],
      ["LEASE_UNAVAILABLE", "RemoteLock is busy. Please try again in a moment."],
      ["SOMETHING_NEW", "Something went wrong. Please try again."],
    ])("shows the message for %s and does not navigate", async (code, message) => {
      const user = userEvent.setup();
      jest.spyOn(console, "error").mockImplementation(() => {});
      connectRemoteLock.mockRejectedValue(Object.assign(new Error("x"), { code }));
      renderModal("connect");

      await user.click(screen.getByRole("button", { name: "Connect" }));

      expect(await screen.findByRole("alert")).toHaveTextContent(message);
      expect(window.location.assign).not.toHaveBeenCalled();
      expect(screen.getByRole("button", { name: "Connect" })).toBeEnabled();
    });
  });

  it("disables both buttons and shows the in-flight label while the request runs", async () => {
    const user = userEvent.setup();
    connectRemoteLock.mockReturnValue(new Promise(() => {}));
    renderModal("connect");

    await user.click(screen.getByRole("button", { name: "Connect" }));

    expect(screen.getByRole("button", { name: "Connecting..." })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
  });
});
