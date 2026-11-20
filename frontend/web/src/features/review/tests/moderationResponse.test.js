import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import ReviewModerationQueue from "../components/ReviewModerationQueue";
import { getReviewFlags } from "../services/reviewAPI";

jest.mock("../../../services/getAccessToken", () => ({ getIdToken: jest.fn().mockResolvedValue("token") }));

const originalFetch = global.fetch;
const respond = (payload) => ({ ok: true, status: 200, text: async () => JSON.stringify(payload) });
beforeEach(() => { global.fetch = jest.fn(); });
afterEach(() => { global.fetch = originalFetch; });

test.each([
  null, {}, { flags: null, next_offset: null }, { flags: {}, next_offset: null },
  { flags: [null], next_offset: null }, { flags: [] },
  ...[-1, 1.5, "8", Number.MAX_SAFE_INTEGER + 1].map((next_offset) => ({ flags: [], next_offset })),
])("rejects malformed successful moderation response %#", async (payload) => {
  global.fetch.mockResolvedValue(respond(payload));
  await expect(getReviewFlags({})).rejects.toThrow("unexpected response");
});

test.each([null, 0, 8])("accepts valid continuation offset %s", async (next_offset) => {
  const payload = { flags: [], next_offset };
  global.fetch.mockResolvedValue(respond(payload));
  await expect(getReviewFlags({})).resolves.toEqual(payload);
});

test("malformed success shows an error and retry recovers to the empty queue", async () => {
  global.fetch.mockResolvedValueOnce(respond({}))
    .mockResolvedValueOnce(respond({ flags: [], next_offset: null }));
  render(<ReviewModerationQueue />);
  expect(await screen.findByRole("alert")).toHaveTextContent("unexpected response");
  fireEvent.click(screen.getByRole("button", { name: "Retry" }));
  expect(await screen.findByText("No pending review flags.")).toBeInTheDocument();
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  expect(global.fetch).toHaveBeenCalledTimes(2);
});
