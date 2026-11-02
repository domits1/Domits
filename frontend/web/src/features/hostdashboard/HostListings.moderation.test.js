import React from "react";
import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { toast } from "react-toastify";

import HostListings from "./HostListings";
import { updatePropertyLifecycleStatus } from "./hostproperty/services/hostPropertyApi";

const mockNavigate = jest.fn();
const mockFetchVerificationStatus = jest.fn();
let mockLiveEligibility = true;

jest.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
}));

jest.mock("react-toastify", () => ({
  toast: { success: jest.fn(), error: jest.fn(), info: jest.fn() },
}));

jest.mock("../../hooks/useEffectiveHostId", () => ({
  __esModule: true,
  default: () => ({ effectiveHostId: "host-1", ownId: "host-1", managedHostId: null, isPurelyPOM: false }),
}));

jest.mock("./hooks/useSetLiveEligibility", () => ({
  useSetLiveEligibility: () => ({
    liveEligibility: mockLiveEligibility,
    liveEligibilityError: "",
    liveEligibilityLoading: false,
    fetchVerificationStatus: mockFetchVerificationStatus,
  }),
}));

jest.mock("../../services/getAccessToken.js", () => ({
  getAccessToken: jest.fn(() => "test-token"),
}));

jest.mock("./hostproperty/services/hostPropertyApi", () => ({
  updatePropertyLifecycleStatus: jest.fn(),
}));

const buildListing = (id, status) => ({
  property: { id, title: `Listing ${id}`, status, createdAt: 1700000000000 },
  location: { city: "Amsterdam" },
  images: [],
});

let mockListings = [];

const renderListings = async () => {
  render(<HostListings />);
  await screen.findByRole("button", { name: /Live listings/ });
};

const openTab = async (name) => {
  fireEvent.click(await screen.findByRole("button", { name }));
};

describe("HostListings moderation statuses", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLiveEligibility = true;
    mockListings = [
      buildListing("draft-1", "INACTIVE"),
      buildListing("pending-1", "PENDING_REVIEW"),
      buildListing("rejected-1", "REJECTED"),
    ];
    global.fetch = jest.fn(async () => ({ ok: true, json: async () => mockListings }));
  });

  it("groups pending and rejected listings into their own tabs with their actions", async () => {
    await renderListings();

    await openTab(/Pending review \(1\)/);
    expect(screen.getByText("Listing pending-1")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Withdraw" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Edit" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Resubmit" })).not.toBeInTheDocument();

    await openTab(/Rejected \(1\)/);
    expect(screen.getByText("Listing rejected-1")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Resubmit" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Withdraw" })).not.toBeInTheDocument();
  });

  it("announces the submission and follows the listing to the pending tab when the API returns PENDING_REVIEW", async () => {
    updatePropertyLifecycleStatus.mockImplementation(async () => {
      mockListings = [buildListing("draft-1", "PENDING_REVIEW")];
      return { status: "PENDING_REVIEW" };
    });
    await renderListings();

    await openTab(/Drafted listings \(1\)/);
    fireEvent.click(screen.getByRole("button", { name: "Submit for review" }));

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Submitted for review."));
    expect(updatePropertyLifecycleStatus).toHaveBeenCalledWith({ propertyId: "draft-1", status: "ACTIVE" });
    expect(await screen.findByRole("button", { name: "Withdraw" })).toBeInTheDocument();
  });

  it("keeps the old message when an older deploy publishes straight to ACTIVE", async () => {
    updatePropertyLifecycleStatus.mockResolvedValue({ status: "ACTIVE" });
    await renderListings();

    await openTab(/Drafted listings \(1\)/);
    fireEvent.click(screen.getByRole("button", { name: "Submit for review" }));

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Listing set to Live."));
    expect(toast.success).not.toHaveBeenCalledWith("Submitted for review.");
  });

  it("withdraws a pending listing back to draft", async () => {
    updatePropertyLifecycleStatus.mockResolvedValue({ status: "INACTIVE" });
    await renderListings();

    await openTab(/Pending review \(1\)/);
    fireEvent.click(screen.getByRole("button", { name: "Withdraw" }));

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Submission withdrawn."));
    expect(updatePropertyLifecycleStatus).toHaveBeenCalledWith({ propertyId: "pending-1", status: "INACTIVE" });
  });

  it("resubmits a rejected listing through the live eligibility check", async () => {
    updatePropertyLifecycleStatus.mockResolvedValue({ status: "PENDING_REVIEW" });
    await renderListings();

    await openTab(/Rejected \(1\)/);
    fireEvent.click(screen.getByRole("button", { name: "Resubmit" }));

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Submitted for review."));
    expect(updatePropertyLifecycleStatus).toHaveBeenCalledWith({ propertyId: "rejected-1", status: "ACTIVE" });
  });

  it("blocks a resubmit when the host is not verified", async () => {
    mockLiveEligibility = false;
    await renderListings();

    await openTab(/Rejected \(1\)/);
    fireEvent.click(screen.getByRole("button", { name: "Resubmit" }));

    expect(updatePropertyLifecycleStatus).not.toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith("/hostdashboard/finance");
  });
});
