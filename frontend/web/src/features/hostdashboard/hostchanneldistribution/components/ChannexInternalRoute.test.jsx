import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import ChannexInternalRoute, {
  ACCESS_ERROR_MESSAGE,
  CHECKING_MESSAGE,
  NOT_AVAILABLE_MESSAGE,
} from "./ChannexInternalRoute";
import { CHANNEX_ACCESS_STATE, loadChannexAccessState } from "../../channexadmin/channexCertificationAccess";

jest.mock("../../channexadmin/channexCertificationAccess", () => ({
  CHANNEX_ACCESS_STATE: { ALLOWED: "allowed", DENIED: "denied", ERROR: "error" },
  loadChannexAccessState: jest.fn(),
}));

const { ALLOWED, DENIED, ERROR } = CHANNEX_ACCESS_STATE;

const renderGuard = () =>
  render(
    <ChannexInternalRoute>
      <p>Distribution page</p>
    </ChannexInternalRoute>
  );

describe("ChannexInternalRoute", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("shows a checking sentence and hides the page while access is pending", () => {
    loadChannexAccessState.mockReturnValue(new Promise(() => {}));

    renderGuard();

    expect(screen.getByRole("status").textContent).toBe(CHECKING_MESSAGE);
    expect(screen.queryByText("Distribution page")).toBeNull();
  });

  test("renders the page for an allowed user", async () => {
    loadChannexAccessState.mockResolvedValue(ALLOWED);

    renderGuard();

    expect(await screen.findByText("Distribution page")).toBeTruthy();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  test("shows the not-available sentence and no Retry when access is denied", async () => {
    loadChannexAccessState.mockResolvedValue(DENIED);

    renderGuard();

    expect((await screen.findByRole("alert")).textContent).toBe(NOT_AVAILABLE_MESSAGE);
    expect(screen.queryByRole("button", { name: "Retry" })).toBeNull();
    expect(screen.queryByText("Distribution page")).toBeNull();
  });

  test("shows the error sentence and a Retry button when the check failed", async () => {
    loadChannexAccessState.mockResolvedValue(ERROR);

    renderGuard();

    expect((await screen.findByRole("alert")).textContent).toBe(ACCESS_ERROR_MESSAGE);
    expect(screen.getByRole("button", { name: "Retry" })).toBeTruthy();
    expect(screen.queryByText("Distribution page")).toBeNull();
  });

  test("Retry runs the check again and renders the page when it now succeeds", async () => {
    loadChannexAccessState.mockResolvedValueOnce(ERROR).mockResolvedValueOnce(ALLOWED);

    renderGuard();
    fireEvent.click(await screen.findByRole("button", { name: "Retry" }));

    expect(await screen.findByText("Distribution page")).toBeTruthy();
    expect(loadChannexAccessState).toHaveBeenCalledTimes(2);
  });

  test("Retry cannot be clicked again while the new check runs", async () => {
    loadChannexAccessState.mockResolvedValueOnce(ERROR).mockReturnValueOnce(new Promise(() => {}));

    renderGuard();
    const retry = await screen.findByRole("button", { name: "Retry" });
    fireEvent.click(retry);
    fireEvent.click(retry);

    expect(screen.getByRole("status").textContent).toBe(CHECKING_MESSAGE);
    expect(screen.queryByRole("button", { name: "Retry" })).toBeNull();
    expect(loadChannexAccessState).toHaveBeenCalledTimes(2);
  });

  test("a Retry that fails again shows the error sentence again", async () => {
    loadChannexAccessState.mockResolvedValue(ERROR);

    renderGuard();
    fireEvent.click(await screen.findByRole("button", { name: "Retry" }));

    expect((await screen.findByRole("alert")).textContent).toBe(ACCESS_ERROR_MESSAGE);
    expect(loadChannexAccessState).toHaveBeenCalledTimes(2);
  });

  test("denies access for any state other than allowed", async () => {
    loadChannexAccessState.mockResolvedValue("true");

    renderGuard();

    expect((await screen.findByRole("alert")).textContent).toBe(NOT_AVAILABLE_MESSAGE);
    expect(screen.queryByText("Distribution page")).toBeNull();
  });
});
