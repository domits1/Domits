import React from "react";
import "@testing-library/jest-dom";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import RemoteLockCallbackView from "./RemoteLockCallbackView";
import { LanguageContext } from "../../../../context/LanguageContext";
import { RemoteLockRequestError, completeRemoteLockConnect } from "../services/remoteLockService";

jest.mock("../services/remoteLockService", () => ({
  ...jest.requireActual("../services/remoteLockService"),
  completeRemoteLockConnect: jest.fn(),
}));

const CODE = "one-time-code-xyz";
const STATE = "state-value-123";
const CALLBACK = "/hostdashboard/settings/home-automation/callback";

function Where() {
  const { pathname, search } = useLocation();
  return <span data-testid="where">{`${pathname}${search}`}</span>;
}

const renderCallback = (query = `?code=${CODE}&state=${STATE}`, { strict = false } = {}) => {
  const tree = (
    <LanguageContext.Provider value={{ language: "en" }}>
      <MemoryRouter initialEntries={[`${CALLBACK}${query}`]}>
        <Routes>
          <Route path={CALLBACK} element={<RemoteLockCallbackView />} />
          <Route path="/hostdashboard/settings/home-automation" element={<p>Home automation page</p>} />
        </Routes>
        <Where />
      </MemoryRouter>
    </LanguageContext.Provider>
  );
  return render(strict ? <React.StrictMode>{tree}</React.StrictMode> : tree);
};

describe("RemoteLockCallbackView", () => {
  let consoleError;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleError = jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => jest.restoreAllMocks());

  it("completes the connection once, then goes back to Home automation without a history entry for the callback", async () => {
    completeRemoteLockConnect.mockResolvedValue({ status: "CONNECTED", lastSyncAt: null });

    renderCallback();

    expect(await screen.findByText("Home automation page")).toBeInTheDocument();
    expect(completeRemoteLockConnect).toHaveBeenCalledTimes(1);
    expect(completeRemoteLockConnect).toHaveBeenCalledWith({ code: CODE, state: STATE });
    expect(screen.getByTestId("where")).toHaveTextContent("/hostdashboard/settings/home-automation");
  });

  it("calls complete exactly once even when React runs the effect twice", async () => {
    completeRemoteLockConnect.mockResolvedValue({ status: "CONNECTED", lastSyncAt: null });

    renderCallback(undefined, { strict: true });

    await screen.findByText("Home automation page");
    expect(completeRemoteLockConnect).toHaveBeenCalledTimes(1);
  });

  it("takes the code and the state out of the address bar while it works", async () => {
    completeRemoteLockConnect.mockReturnValue(new Promise(() => {}));

    renderCallback();

    expect(await screen.findByRole("status")).toHaveTextContent("Finishing the connection...");
    await waitFor(() => expect(screen.getByTestId("where")).toHaveTextContent(`${CALLBACK}`));
    expect(screen.getByTestId("where").textContent).toBe(CALLBACK);
  });

  it.each([
    ["STATE_INVALID", "The sign-in expired or was already used. Please start again."],
    ["STATE_EXPIRED", "The sign-in expired or was already used. Please start again."],
    ["CODE_REJECTED", "The sign-in expired or was already used. Please start again."],
    ["CONFIG_MISSING", "RemoteLock isn't available right now. Please contact support."],
    ["LEASE_UNAVAILABLE", "RemoteLock is busy. Please try again in a moment."],
    ["PROVIDER_UNAVAILABLE", "RemoteLock is busy. Please try again in a moment."],
    ["PROVIDER_ERROR", "RemoteLock reported a problem. Please try again later."],
    ["SOMETHING_NEW", "Something went wrong. Please try again."],
  ])("shows the message for %s, with a way back", async (code, message) => {
    completeRemoteLockConnect.mockRejectedValue(new RemoteLockRequestError({ status: 409, code }));

    renderCallback();

    expect(await screen.findByRole("alert")).toHaveTextContent(message);
    expect(screen.getByRole("link", { name: "Back to Home automation" })).toHaveAttribute(
      "href",
      "/hostdashboard/settings/home-automation"
    );
  });

  it.each([
    ["no code", `?state=${STATE}`],
    ["no state", `?code=${CODE}`],
    ["nothing", ""],
  ])("explains a callback with %s and does not call the backend", async (_label, query) => {
    renderCallback(query);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "This page needs a RemoteLock sign-in. Please start from Home automation."
    );
    expect(completeRemoteLockConnect).not.toHaveBeenCalled();
  });

  it("says the sign-in was cancelled when RemoteLock reports an error, without showing its description", async () => {
    renderCallback(`?error=access_denied&error_description=${CODE}`);

    expect(await screen.findByRole("alert")).toHaveTextContent("The RemoteLock sign-in was cancelled.");
    expect(completeRemoteLockConnect).not.toHaveBeenCalled();
    expect(document.body).not.toHaveTextContent(CODE);
  });

  it("never renders or logs the code or the state", async () => {
    completeRemoteLockConnect.mockRejectedValue(new RemoteLockRequestError({ status: 409, code: "STATE_INVALID" }));

    renderCallback();

    await screen.findByRole("alert");
    const logged = JSON.stringify(consoleError.mock.calls);
    expect(document.body.innerHTML).not.toMatch(new RegExp(`${CODE}|${STATE}`));
    expect(logged).not.toMatch(new RegExp(`${CODE}|${STATE}`));
  });
});
