/**
 * @jest-environment jsdom
 */

import React, { useEffect } from "react";
import PropTypes from "prop-types";
import "@testing-library/jest-dom";
import { render, screen, waitFor } from "@testing-library/react";
import { WebSocketContext } from "../context/webSocketContext";
import useFetchMessages from "./useFetchMessages";
import { getAccessToken } from "../../../../services/getAccessToken";

jest.mock("../../../../services/getAccessToken", () => ({
  getAccessToken: jest.fn(),
}));

const Harness = ({ accessToken = null }) => {
  const { fetchMessages, error } = useFetchMessages("guest-1");

  useEffect(() => {
    fetchMessages("host-1", null, { accessToken, bookingId: "booking-1" });
  }, [accessToken, fetchMessages]);

  return <div data-testid="state" data-error={error?.message || ""} />;
};

Harness.propTypes = {
  accessToken: PropTypes.string,
};

const renderHarness = (accessToken = null) =>
  render(
    <WebSocketContext.Provider value={{ messages: [] }}>
      <Harness accessToken={accessToken} />
    </WebSocketContext.Provider>
  );

describe("useFetchMessages protected REST calls", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    globalThis.fetch = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("does not call protected endpoints when token retrieval fails", async () => {
    getAccessToken.mockReturnValue(null);

    renderHarness(null);

    await waitFor(() => {
      expect(screen.getByTestId("state")).toHaveAttribute("data-error", "Authentication token is required.");
    });
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  test("does not fetch /messages when /threads rejects authorization", async () => {
    getAccessToken.mockReturnValue("access-token-1");
    globalThis.fetch.mockResolvedValue({
      ok: false,
      status: 403,
      text: async () => "Forbidden",
    });

    renderHarness("access-token-1");

    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    });

    expect(globalThis.fetch.mock.calls[0][0]).toContain("/threads");
    expect(globalThis.fetch.mock.calls[0][1].headers.Authorization).toBe("Bearer access-token-1");
  });
});
