import React from "react";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PlatformCardsSection from "./PlatformCardsSection";
import {
  createConnectSession,
  enableDistribution,
  getHostListings,
  refreshChannels,
} from "../services/hostDistributionApi";

jest.mock("../services/hostDistributionApi");

const channel = (otaCode, displayState, extra = {}) => ({ channelId: `c-${otaCode}`, otaCode, displayState, ...extra });
const listing = (propertyId, title, overrides = {}) => ({
  propertyId,
  title,
  readiness: { ready: true, missing: [] },
  distribution: { status: "READY" },
  channels: [],
  ...overrides,
});

const LIVE_LISTING = listing("p1", "Canal House", {
  channels: [channel("BookingCom", "LIVE"), channel("Airbnb", "SYNCING")],
});

// A promise the test settles by hand, so "while the request is pending" can be asserted.
const deferred = () => {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

const cardFor = (name) => screen.getByText(name).closest(".chdist-card");

describe("PlatformCardsSection", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    jest.spyOn(console, "error").mockImplementation(() => {});
    getHostListings.mockResolvedValue({ listings: [LIVE_LISTING] });
  });

  test("shows a loading sentence, then the three OTA cards in a fixed order", async () => {
    const pending = deferred();
    getHostListings.mockReturnValue(pending.promise);

    render(<PlatformCardsSection />);
    expect(screen.getByText("Loading your listings…").tagName).toBe("OUTPUT");

    pending.resolve({ listings: [LIVE_LISTING] });
    await screen.findByText("Booking.com");

    expect(screen.queryByText("Loading your listings…")).not.toBeInTheDocument();
    const names = screen.getAllByRole("switch").map((control) => control.getAttribute("aria-label"));
    expect(names).toEqual(["Booking.com distribution", "Airbnb distribution", "Vrbo distribution"]);
  });

  test("shows each card's own state", async () => {
    render(<PlatformCardsSection />);
    await screen.findByText("Booking.com");

    expect(within(cardFor("Booking.com")).getByText("Live")).toBeInTheDocument();
    expect(within(cardFor("Airbnb")).getByText("Syncing…")).toBeInTheDocument();
    expect(within(cardFor("Vrbo")).getByText("Not connected")).toBeInTheDocument();
  });

  describe("connect flow", () => {
    const URL_OK = "https://staging.channex.io/mock-connect?token=mock";
    const switchOf = (name) => screen.getByRole("switch", { name: `${name} distribution` });

    const openChecklist = async (user) => {
      render(<PlatformCardsSection />);
      await screen.findByText("Booking.com");
      await user.click(switchOf("Vrbo"));
    };
    const tickAll = async (user) => {
      for (const box of screen.getAllByRole("checkbox")) await user.click(box);
    };
    const openIframe = async (user) => {
      createConnectSession.mockResolvedValue({ url: URL_OK });
      refreshChannels.mockResolvedValue({ listing: LIVE_LISTING });
      await openChecklist(user);
      await tickAll(user);
      await user.click(screen.getByRole("button", { name: "Continue" }));
      await screen.findByTitle("Connect Vrbo through Channex");
    };

    test("on a ready listing only the switches that are off are usable, the ones that are on stay disabled", async () => {
      render(<PlatformCardsSection />);
      await screen.findByText("Booking.com");

      expect(switchOf("Booking.com")).toBeDisabled();
      expect(switchOf("Airbnb")).toBeDisabled();
      expect(switchOf("Vrbo")).toBeEnabled();
    });

    describe("a listing that is not turned on", () => {
      const NOT_ENABLED = listing("p2", "City Loft", { distribution: { status: "NOT_ENABLED" } });
      const NEEDS_TIMEZONE = listing("p3", "Ubud Retreat", {
        distribution: { status: "NOT_ENABLED" },
        timezone: { required: true, options: ["Asia/Jakarta", "Asia/Makassar"] },
      });
      const ENABLED = listing("p2", "City Loft");

      const openChecklistFor = async (user, notEnabledListing) => {
        getHostListings.mockResolvedValue({ listings: [notEnabledListing] });
        render(<PlatformCardsSection />);
        await screen.findByText("Booking.com");
        await user.click(switchOf("Vrbo"));
      };

      test("has usable switches, and a switch starts the checklist without any request", async () => {
        const user = userEvent.setup();

        await openChecklistFor(user, NOT_ENABLED);

        expect(screen.getByRole("dialog", { name: "Connect Vrbo" })).toBeInTheDocument();
        expect(enableDistribution).not.toHaveBeenCalled();
        expect(createConnectSession).not.toHaveBeenCalled();
      });

      test("Continue turns it on with the listing id only, and only then asks for the session", async () => {
        const user = userEvent.setup();
        enableDistribution.mockResolvedValue({ listing: ENABLED });
        createConnectSession.mockResolvedValue({ url: URL_OK });
        await openChecklistFor(user, NOT_ENABLED);
        await tickAll(user);

        await user.click(screen.getByRole("button", { name: "Continue" }));

        await screen.findByTitle("Connect Vrbo through Channex");
        expect(enableDistribution).toHaveBeenCalledTimes(1);
        expect(enableDistribution).toHaveBeenCalledWith({ propertyId: "p2" });
        expect(createConnectSession).toHaveBeenCalledWith({ propertyId: "p2" });
        expect(enableDistribution.mock.invocationCallOrder[0]).toBeLessThan(
          createConnectSession.mock.invocationCallOrder[0]
        );
      });

      test("says it is setting up while the request is pending, with all switches locked", async () => {
        const user = userEvent.setup();
        enableDistribution.mockReturnValue(deferred().promise);
        await openChecklistFor(user, NOT_ENABLED);
        await tickAll(user);

        await user.click(screen.getByRole("button", { name: "Continue" }));

        expect(screen.getByText("Setting up your listing…").tagName).toBe("OUTPUT");
        screen.getAllByRole("switch").forEach((control) => expect(control).toBeDisabled());
      });

      test("stops at the card's Setting up when the answer is not READY, with no Channex screen", async () => {
        const user = userEvent.setup();
        enableDistribution.mockResolvedValue({
          listing: listing("p2", "City Loft", { distribution: { status: "PROVISIONING" } }),
        });
        await openChecklistFor(user, NOT_ENABLED);
        await tickAll(user);

        await user.click(screen.getByRole("button", { name: "Continue" }));

        await waitFor(() => expect(within(cardFor("Vrbo")).getByText("Setting up…")).toBeInTheDocument());
        expect(createConnectSession).not.toHaveBeenCalled();
        expect(screen.queryByTitle("Connect Vrbo through Channex")).not.toBeInTheDocument();
        screen.getAllByRole("switch").forEach((control) => expect(control).toBeDisabled());
      });

      test("asks for the timezone after the checklist, without enabling, and enables with the picked zone", async () => {
        const user = userEvent.setup();
        enableDistribution.mockResolvedValue({ listing: listing("p3", "Ubud Retreat") });
        createConnectSession.mockResolvedValue({ url: URL_OK });
        await openChecklistFor(user, NEEDS_TIMEZONE);
        await tickAll(user);

        await user.click(screen.getByRole("button", { name: "Continue" }));

        expect(screen.getByRole("dialog", { name: "Choose a timezone" })).toBeInTheDocument();
        expect(enableDistribution).not.toHaveBeenCalled();
        expect(screen.getByRole("button", { name: "Continue" })).toBeDisabled();

        await user.selectOptions(screen.getByRole("combobox", { name: "Timezone" }), "Asia/Makassar");
        await user.click(screen.getByRole("button", { name: "Continue" }));

        await screen.findByTitle("Connect Vrbo through Channex");
        expect(enableDistribution).toHaveBeenCalledWith({ propertyId: "p3", timezone: "Asia/Makassar" });
      });

      test("cancelling the timezone modal sends nothing and changes nothing", async () => {
        const user = userEvent.setup();
        await openChecklistFor(user, NEEDS_TIMEZONE);
        await tickAll(user);
        await user.click(screen.getByRole("button", { name: "Continue" }));

        await user.click(screen.getByRole("button", { name: "Cancel" }));

        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
        expect(enableDistribution).not.toHaveBeenCalled();
        expect(createConnectSession).not.toHaveBeenCalled();
        expect(refreshChannels).not.toHaveBeenCalled();
        expect(switchOf("Vrbo")).toBeEnabled();
      });

      test("keeps the switches of a listing that is still setting up disabled", async () => {
        getHostListings.mockResolvedValue({
          listings: [listing("p4", "Lighthouse Cabin", { distribution: { status: "PROVISIONING" } })],
        });

        render(<PlatformCardsSection />);
        await screen.findByText("Booking.com");

        screen.getAllByRole("switch").forEach((control) => expect(control).toBeDisabled());
      });
    });

    describe("when turning a listing on fails", () => {
      const NOT_ENABLED = listing("p2", "City Loft", { distribution: { status: "NOT_ENABLED" } });
      const requestError = (status, errorCode) =>
        Object.assign(new Error("failed"), { status, responseBody: { errorCode } });

      // Opens the checklist for the not-turned-on listing and presses Continue, so enable is called.
      const turnOn = async (user) => {
        getHostListings.mockResolvedValue({ listings: [NOT_ENABLED] });
        render(<PlatformCardsSection />);
        await screen.findByText("Booking.com");
        await user.click(switchOf("Vrbo"));
        await tickAll(user);
        await user.click(screen.getByRole("button", { name: "Continue" }));
      };

      test("a 409 reads the listing again and the card says Setting up, and Refresh then finishes it", async () => {
        const user = userEvent.setup();
        enableDistribution.mockRejectedValue(requestError(409, "PROVISIONING_IN_PROGRESS"));
        refreshChannels.mockResolvedValueOnce({
          listing: listing("p2", "City Loft", { distribution: { status: "PROVISIONING" } }),
        });
        refreshChannels.mockResolvedValueOnce({ listing: listing("p2", "City Loft") });

        await turnOn(user);

        await waitFor(() => expect(within(cardFor("Vrbo")).getByText("Setting up…")).toBeInTheDocument());
        expect(refreshChannels).toHaveBeenCalledTimes(1);
        expect(refreshChannels).toHaveBeenCalledWith({ propertyId: "p2" });
        expect(screen.queryByRole("alert")).not.toBeInTheDocument();
        expect(createConnectSession).not.toHaveBeenCalled();

        await user.click(screen.getByRole("button", { name: "Refresh" }));

        await waitFor(() => expect(within(cardFor("Vrbo")).getByText("Not connected")).toBeInTheDocument());
        expect(switchOf("Vrbo")).toBeEnabled();
      });

      test("a 422 reads the listing again and shows what is missing instead of the cards", async () => {
        const user = userEvent.setup();
        enableDistribution.mockRejectedValue(requestError(422, "LISTING_NOT_READY"));
        refreshChannels.mockResolvedValue({
          listing: listing("p2", "City Loft", { readiness: { ready: false, missing: ["PRICE_MISSING"] } }),
        });

        await turnOn(user);

        expect(await screen.findByText("Add a price")).toBeInTheDocument();
        expect(screen.queryByRole("switch")).not.toBeInTheDocument();
        expect(refreshChannels).toHaveBeenCalledTimes(1);
        expect(createConnectSession).not.toHaveBeenCalled();
      });

      test("a 400 timezone required says so, and the next try asks for the timezone", async () => {
        const user = userEvent.setup();
        enableDistribution.mockRejectedValue(requestError(400, "TIMEZONE_REQUIRED"));
        refreshChannels.mockResolvedValue({
          listing: listing("p2", "City Loft", {
            distribution: { status: "NOT_ENABLED" },
            timezone: { required: true, options: ["Asia/Jakarta"] },
          }),
        });

        await turnOn(user);

        expect(await screen.findByRole("alert")).toHaveTextContent("Choose a timezone to continue.");
        await waitFor(() => expect(switchOf("Vrbo")).toBeEnabled());

        await user.click(switchOf("Vrbo"));
        await tickAll(user);
        await user.click(screen.getByRole("button", { name: "Continue" }));

        expect(screen.getByRole("dialog", { name: "Choose a timezone" })).toBeInTheDocument();
      });

      test("a failed setup that the backend stored shows the setup-failed notice once, not two alerts", async () => {
        const user = userEvent.setup();
        enableDistribution.mockRejectedValue(requestError(500, "PROVISIONING_FAILED"));
        refreshChannels.mockResolvedValue({
          listing: listing("p2", "City Loft", { distribution: { status: "PROVISIONING_FAILED" } }),
        });

        await turnOn(user);

        await waitFor(() => expect(screen.queryByRole("switch")).not.toBeInTheDocument());
        expect(screen.getAllByRole("alert")).toHaveLength(1);
        expect(screen.getByRole("alert")).toHaveTextContent("Something went wrong while setting up. Try again.");
        expect(createConnectSession).not.toHaveBeenCalled();
      });

      test("a failed setup that was not stored says so on the cards, so the host is never left without a message", async () => {
        const user = userEvent.setup();
        enableDistribution.mockRejectedValue(requestError(500, "PROVISIONING_FAILED"));
        refreshChannels.mockResolvedValue({ listing: NOT_ENABLED });

        await turnOn(user);

        expect(await screen.findByRole("alert")).toHaveTextContent("We couldn't set up this listing. Try again.");
        await waitFor(() => expect(switchOf("Vrbo")).toBeEnabled());
      });

      test("a network error alerts and leaves the cards as they were, with no refresh", async () => {
        const user = userEvent.setup();
        enableDistribution.mockRejectedValue(new Error("Failed to fetch"));

        await turnOn(user);

        expect(await screen.findByRole("alert")).toHaveTextContent("We couldn't set up this listing. Try again.");
        expect(refreshChannels).not.toHaveBeenCalled();
        expect(createConnectSession).not.toHaveBeenCalled();
        await waitFor(() => expect(switchOf("Vrbo")).toBeEnabled());
      });
    });

    test("a listing that is already READY never calls enable, from the first click to the Channex screen", async () => {
      const user = userEvent.setup();
      createConnectSession.mockResolvedValue({ url: URL_OK });
      await openChecklist(user);
      await tickAll(user);

      await user.click(screen.getByRole("button", { name: "Continue" }));

      await screen.findByTitle("Connect Vrbo through Channex");
      expect(enableDistribution).not.toHaveBeenCalled();
    });

    test("turning a switch on opens the checklist for that platform without any request", async () => {
      const user = userEvent.setup();

      await openChecklist(user);

      expect(screen.getByRole("dialog", { name: "Connect Vrbo" })).toBeInTheDocument();
      expect(createConnectSession).not.toHaveBeenCalled();
      expect(refreshChannels).not.toHaveBeenCalled();
    });

    test("cancelling the checklist closes it with no request and no refresh", async () => {
      const user = userEvent.setup();
      await openChecklist(user);

      await user.click(screen.getByRole("button", { name: "Cancel" }));

      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      expect(createConnectSession).not.toHaveBeenCalled();
      expect(refreshChannels).not.toHaveBeenCalled();
    });

    test("Continue asks for a session with the listing id only and opens the Channex screen", async () => {
      const user = userEvent.setup();
      createConnectSession.mockResolvedValue({ url: URL_OK });
      await openChecklist(user);
      await tickAll(user);

      await user.click(screen.getByRole("button", { name: "Continue" }));

      const frame = await screen.findByTitle("Connect Vrbo through Channex");
      expect(frame).toHaveAttribute("src", URL_OK);
      expect(createConnectSession).toHaveBeenCalledTimes(1);
      expect(createConnectSession).toHaveBeenCalledWith({ propertyId: "p1" });
    });

    test("a failed session shows an alert and never opens the Channex screen", async () => {
      const user = userEvent.setup();
      createConnectSession.mockRejectedValue(new Error("boom"));
      await openChecklist(user);
      await tickAll(user);

      await user.click(screen.getByRole("button", { name: "Continue" }));

      expect(await screen.findByRole("alert")).toHaveTextContent("We couldn't start the connection. Try again.");
      expect(screen.queryByTitle("Connect Vrbo through Channex")).not.toBeInTheDocument();
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      expect(refreshChannels).not.toHaveBeenCalled();
    });

    test.each([
      ["the X button", (user) => user.click(screen.getByRole("button", { name: "Close" }))],
      ["Escape", (user) => user.keyboard("{Escape}")],
      ["the backdrop", (user) => user.click(screen.getByRole("button", { name: "Close backdrop" }))],
      ["the Done button", (user) => user.click(screen.getByRole("button", { name: "Done" }))],
    ])("closing the Channex screen with %s refreshes the listing exactly once", async (_name, dismiss) => {
      const user = userEvent.setup();
      await openIframe(user);

      await dismiss(user);

      await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
      await waitFor(() => expect(screenSwitchesSettled()).toBe(true));
      expect(refreshChannels).toHaveBeenCalledTimes(1);
      expect(refreshChannels).toHaveBeenCalledWith({ propertyId: "p1" });
    });

    // Refresh puts the "Refreshing…" sentence up while it runs; once it is gone the close has finished.
    const screenSwitchesSettled = () => screen.queryByText("Refreshing…") === null;

    test("locks all three switches while the checklist is open", async () => {
      const user = userEvent.setup();
      await openChecklist(user);

      screen.getAllByRole("switch").forEach((control) => expect(control).toBeDisabled());
    });

    test("locks all three switches while connecting", async () => {
      const user = userEvent.setup();
      createConnectSession.mockReturnValue(deferred().promise);
      await openChecklist(user);
      await tickAll(user);

      await user.click(screen.getByRole("button", { name: "Continue" }));

      expect(screen.getByText("Connecting…").tagName).toBe("OUTPUT");
      screen.getAllByRole("switch").forEach((control) => expect(control).toBeDisabled());
    });

    test("locks the property picker while connecting, so the flow cannot end up under another listing", async () => {
      const user = userEvent.setup();
      getHostListings.mockResolvedValue({
        listings: [LIVE_LISTING, listing("p2", "Beach Apartment", { readiness: { ready: false, missing: [] } })],
      });
      createConnectSession.mockReturnValue(deferred().promise);
      render(<PlatformCardsSection />);
      await screen.findByText("Booking.com");
      await user.click(switchOf("Vrbo"));
      await tickAll(user);

      await user.click(screen.getByRole("button", { name: "Continue" }));

      expect(screen.getByRole("combobox", { name: "Property" })).toBeDisabled();
    });

    test("locks all three switches while the Channex screen is open, and unlocks them after it closes", async () => {
      const user = userEvent.setup();
      await openIframe(user);
      screen.getAllByRole("switch").forEach((control) => expect(control).toBeDisabled());

      await user.click(screen.getByRole("button", { name: "Done" }));

      await waitFor(() => expect(switchOf("Vrbo")).toBeEnabled());
    });
  });

  test("shows an error with Retry when the listings cannot be loaded, and Retry fetches again", async () => {
    const user = userEvent.setup();
    getHostListings.mockRejectedValueOnce(new Error("boom"));

    render(<PlatformCardsSection />);

    expect(await screen.findByRole("alert")).toHaveTextContent("We couldn't load your listings.");
    expect(console.error).toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Retry" }));

    expect(await screen.findByText("Booking.com")).toBeInTheDocument();
    expect(getHostListings).toHaveBeenCalledTimes(2);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  test("says so when the host has no listings", async () => {
    getHostListings.mockResolvedValue({ listings: [] });

    render(<PlatformCardsSection />);

    expect(await screen.findByText("You have no listings yet.")).toBeInTheDocument();
    expect(screen.queryByRole("switch")).not.toBeInTheDocument();
  });

  test("shows only the notice, without cards or Refresh, for a listing that is not ready", async () => {
    getHostListings.mockResolvedValue({
      listings: [
        listing("p2", "Beach Apartment", {
          readiness: { ready: false, missing: ["LOCATION_MISSING", "PRICE_MISSING"] },
        }),
      ],
    });

    render(<PlatformCardsSection />);

    expect(await screen.findByText("Add the address")).toBeInTheDocument();
    expect(screen.getByText("Add a price")).toBeInTheDocument();
    expect(screen.queryByRole("switch")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Refresh" })).not.toBeInTheDocument();
  });

  test("shows only the setup-failed alert for a listing whose setup failed halfway", async () => {
    getHostListings.mockResolvedValue({
      listings: [listing("p3", "Windmill Cottage", { distribution: { status: "PROVISIONING_FAILED" } })],
    });

    render(<PlatformCardsSection />);

    expect(await screen.findByRole("alert")).toHaveTextContent("Something went wrong while setting up. Try again.");
    expect(screen.queryByRole("switch")).not.toBeInTheDocument();
  });

  test("offers a picker only for several listings, and shows the picked listing's cards", async () => {
    const user = userEvent.setup();
    getHostListings.mockResolvedValue({
      listings: [LIVE_LISTING, listing("p2", "Beach Apartment", { channels: [channel("Vrbo", "NEEDS_ATTENTION")] })],
    });

    render(<PlatformCardsSection />);
    await screen.findByText("Booking.com");
    expect(within(cardFor("Vrbo")).getByText("Not connected")).toBeInTheDocument();

    await user.selectOptions(screen.getByRole("combobox", { name: "Property" }), "p2");

    expect(within(cardFor("Vrbo")).getByText("Needs attention")).toBeInTheDocument();
    expect(within(cardFor("Booking.com")).getByText("Not connected")).toBeInTheDocument();
  });

  test("has no picker for a single listing", async () => {
    render(<PlatformCardsSection />);
    await screen.findByText("Booking.com");

    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
  });

  test("Refresh asks for the picked listing's channels and updates its cards", async () => {
    const user = userEvent.setup();
    refreshChannels.mockResolvedValue({
      listing: { ...LIVE_LISTING, channels: [channel("BookingCom", "LIVE"), channel("Airbnb", "LIVE")] },
    });

    render(<PlatformCardsSection />);
    await screen.findByText("Booking.com");
    await user.click(screen.getByRole("button", { name: "Refresh" }));

    await waitFor(() => expect(within(cardFor("Airbnb")).getByText("Live")).toBeInTheDocument());
    expect(refreshChannels).toHaveBeenCalledWith({ propertyId: "p1" });
  });

  test("while refreshing, Refresh is disabled and a sentence says so", async () => {
    const user = userEvent.setup();
    const pending = deferred();
    refreshChannels.mockReturnValue(pending.promise);

    render(<PlatformCardsSection />);
    await screen.findByText("Booking.com");
    await user.click(screen.getByRole("button", { name: "Refresh" }));

    expect(screen.getByRole("button", { name: "Refresh" })).toBeDisabled();
    expect(screen.getByText("Refreshing…").tagName).toBe("OUTPUT");

    pending.resolve({ listing: LIVE_LISTING });
    await waitFor(() => expect(screen.getByRole("button", { name: "Refresh" })).toBeEnabled());
    expect(screen.queryByText("Refreshing…")).not.toBeInTheDocument();
  });

  test("a refresh answer without a usable listing counts as a failed refresh and keeps the cards", async () => {
    const user = userEvent.setup();
    refreshChannels.mockResolvedValue({});

    render(<PlatformCardsSection />);
    await screen.findByText("Booking.com");
    await user.click(screen.getByRole("button", { name: "Refresh" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("We couldn't refresh your connections.");
    expect(within(cardFor("Booking.com")).getByText("Live")).toBeInTheDocument();
  });

  test("the refresh error belongs to the listing it failed for, not to the next one picked", async () => {
    const user = userEvent.setup();
    getHostListings.mockResolvedValue({ listings: [LIVE_LISTING, listing("p2", "Beach Apartment")] });
    refreshChannels.mockRejectedValue(new Error("boom"));

    render(<PlatformCardsSection />);
    await screen.findByText("Booking.com");
    await user.click(screen.getByRole("button", { name: "Refresh" }));
    expect(await screen.findByRole("alert")).toBeInTheDocument();

    await user.selectOptions(screen.getByRole("combobox", { name: "Property" }), "p2");

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  test("a failed refresh keeps the cards, says so, and the next successful refresh clears the message", async () => {
    const user = userEvent.setup();
    refreshChannels.mockRejectedValueOnce(new Error("boom"));
    refreshChannels.mockResolvedValue({ listing: LIVE_LISTING });

    render(<PlatformCardsSection />);
    await screen.findByText("Booking.com");
    await user.click(screen.getByRole("button", { name: "Refresh" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("We couldn't refresh your connections.");
    expect(within(cardFor("Booking.com")).getByText("Live")).toBeInTheDocument();
    expect(console.error).toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Refresh" }));
    await waitFor(() => expect(screen.queryByRole("alert")).not.toBeInTheDocument());
  });
});
