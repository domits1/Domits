/**
 * @jest-environment jsdom
 */

import React from "react";
import "@testing-library/jest-dom";
import { render, waitFor } from "@testing-library/react";
import ListingPanel from "./ListingPanel";
import { getAccommodationByPropertyId } from "../../features/hostdashboard/hostmessages/services/messagingService";
import { getAccessToken } from "../../services/getAccessToken";

jest.mock("../../features/hostdashboard/hostmessages/context/AuthContext", () => ({
  useUser: () => ({ accessToken: "id-token-value" }),
}));

jest.mock("../../services/getAccessToken", () => ({
  getAccessToken: jest.fn(),
}));

jest.mock("../../features/hostdashboard/hostmessages/services/messagingService", () => ({
  getAccommodationByPropertyId: jest.fn(),
}));

describe("ListingPanel authentication token", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getAccessToken.mockReturnValue("access-token-value");
    getAccommodationByPropertyId.mockResolvedValue({});
  });

  test("host listing panel authenticates with the real access token, not the ID token", async () => {
    render(<ListingPanel dashboardType="host" propertyId="property-1" />);

    await waitFor(() => {
      expect(getAccommodationByPropertyId).toHaveBeenCalledWith(
        "hostDashboard/single",
        "property-1",
        "access-token-value"
      );
    });
  });

  test("guest listing panel does not send a token", async () => {
    render(<ListingPanel dashboardType="guest" propertyId="property-1" />);

    await waitFor(() => {
      expect(getAccommodationByPropertyId).toHaveBeenCalledWith(
        "bookingEngine/listingDetails",
        "property-1",
        null
      );
    });
  });
});
