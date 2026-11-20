import React from "react";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PlatformCardsSection from "./PlatformCardsSection";
import { DISMISS_ACTIONS } from "./modalTestHelpers";
import {
  createConnectSession,
  disconnectChannel,
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

    test("on a ready listing every switch is usable, the ones that are on can be turned off", async () => {
      render(<PlatformCardsSection />);
      await screen.findByText("Booking.com");

      expect(switchOf("Booking.com")).toBeEnabled();
      expect(switchOf("Airbnb")).toBeEnabled();
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

  describe("turning a switch off", () => {
    const TURN_OFF_LISTING = listing("p1", "Canal House", {
      channels: [
        channel("BookingCom", "LIVE", { upcomingBookingCount: 2 }),
        channel("Airbnb", "SYNCING", { upcomingBookingCount: 1 }),
      ],
    });
    const DISCONNECTING_LISTING = {
      ...TURN_OFF_LISTING,
      channels: [channel("BookingCom", "DISCONNECTING", { upcomingBookingCount: 2 }), TURN_OFF_LISTING.channels[1]],
    };
    const requestError = (status, errorCode) =>
      Object.assign(new Error("failed"), { status, responseBody: { errorCode } });
    const switchOf = (name) => screen.getByRole("switch", { name: `${name} distribution` });

    const renderListings = async (listings = [TURN_OFF_LISTING]) => {
      getHostListings.mockResolvedValue({ listings });
      render(<PlatformCardsSection />);
      await screen.findByText("Booking.com");
    };
    const openConfirm = async (user, name = "Booking.com", listings) => {
      await renderListings(listings);
      await user.click(switchOf(name));
    };
    const confirmTurnOff = (user) => user.click(screen.getByRole("button", { name: "Turn off" }));

    test("turning a switch that is on off opens the confirm for that platform, and requests nothing", async () => {
      const user = userEvent.setup();

      await openConfirm(user);

      expect(screen.getByRole("dialog", { name: "Turn off Booking.com?" })).toBeInTheDocument();
      expect(screen.getByText("You have 2 upcoming bookings from Booking.com.")).toBeInTheDocument();
      expect(disconnectChannel).not.toHaveBeenCalled();
      expect(refreshChannels).not.toHaveBeenCalled();
    });

    test("one upcoming booking reads in the singular", async () => {
      const user = userEvent.setup();

      await openConfirm(user, "Airbnb");

      expect(screen.getByText("You have 1 upcoming booking from Airbnb.")).toBeInTheDocument();
    });

    test("no upcoming bookings, no such line", async () => {
      const user = userEvent.setup();
      await openConfirm(user, "Booking.com", [
        listing("p1", "Canal House", { channels: [channel("BookingCom", "LIVE", { upcomingBookingCount: 0 })] }),
      ]);

      expect(screen.queryByText(/upcoming/)).not.toBeInTheDocument();
    });

    test.each(DISMISS_ACTIONS)(
      "%s leaves the connection alone: no request, no refresh, the switch still on",
      async (_name, dismiss) => {
        const user = userEvent.setup();
        await openConfirm(user);

        await dismiss(user);

        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
        expect(disconnectChannel).not.toHaveBeenCalled();
        expect(refreshChannels).not.toHaveBeenCalled();
        expect(switchOf("Booking.com")).toBeChecked();
      }
    );

    test("a channel that was disconnected outside Domits gets its own confirm text, and a failing one the usual text", async () => {
      const user = userEvent.setup();
      await openConfirm(user, "Vrbo", [
        listing("p1", "Canal House", {
          channels: [
            channel("Vrbo", "NEEDS_ATTENTION", { disconnectedOutsideDomits: true }),
            channel("Airbnb", "NEEDS_ATTENTION"),
          ],
        }),
      ]);

      expect(screen.getByText(/already disconnected outside Domits/)).toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: "Cancel" }));
      await user.click(switchOf("Airbnb"));

      expect(screen.getByText(/Airbnb will be disconnected/)).toBeInTheDocument();
    });

    test("Turn off asks for the channel by its id only, and while it runs the card says Turning off…", async () => {
      const user = userEvent.setup();
      disconnectChannel.mockReturnValue(deferred().promise);
      await openConfirm(user);

      await confirmTurnOff(user);

      expect(disconnectChannel).toHaveBeenCalledTimes(1);
      expect(disconnectChannel).toHaveBeenCalledWith({ channelId: "c-BookingCom" });
      expect(within(cardFor("Booking.com")).getByText("Turning off…")).toBeInTheDocument();
      expect(switchOf("Booking.com")).not.toBeChecked();
      expect(screen.getByText("Turning off Booking.com…").tagName).toBe("OUTPUT");
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    test("while it runs all three switches, the picker and Refresh are locked", async () => {
      const user = userEvent.setup();
      disconnectChannel.mockReturnValue(deferred().promise);
      await openConfirm(user, "Booking.com", [TURN_OFF_LISTING, listing("p2", "Beach Apartment")]);

      await confirmTurnOff(user);

      screen.getAllByRole("switch").forEach((control) => expect(control).toBeDisabled());
      expect(screen.getByRole("combobox", { name: "Property" })).toBeDisabled();
      expect(screen.getByRole("button", { name: "Refresh" })).toBeDisabled();
    });

    test("an answer is applied as it is, without another request: the card says Disconnecting… with the hint, and the rest unlocks", async () => {
      const user = userEvent.setup();
      disconnectChannel.mockResolvedValue({ listing: DISCONNECTING_LISTING });
      await openConfirm(user);

      await confirmTurnOff(user);

      await waitFor(() => expect(within(cardFor("Booking.com")).getByText("Disconnecting…")).toBeInTheDocument());
      expect(
        within(cardFor("Booking.com")).getByText("This takes about a minute. Click Refresh to see the result.")
      ).toBeInTheDocument();
      expect(refreshChannels).not.toHaveBeenCalled();
      expect(switchOf("Booking.com")).toBeDisabled();
      expect(switchOf("Airbnb")).toBeEnabled();
      expect(screen.getByRole("button", { name: "Refresh" })).toBeEnabled();
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });

    test("Refresh afterwards shows the channel Disconnected and its switch usable again", async () => {
      const user = userEvent.setup();
      disconnectChannel.mockResolvedValue({ listing: DISCONNECTING_LISTING });
      refreshChannels.mockResolvedValue({
        listing: {
          ...TURN_OFF_LISTING,
          channels: [channel("BookingCom", "DISCONNECTED"), TURN_OFF_LISTING.channels[1]],
        },
      });
      await openConfirm(user);
      await confirmTurnOff(user);
      await screen.findByText("Disconnecting…");

      await user.click(screen.getByRole("button", { name: "Refresh" }));

      await waitFor(() => expect(within(cardFor("Booking.com")).getByText("Disconnected")).toBeInTheDocument());
      expect(switchOf("Booking.com")).toBeEnabled();
    });

    test("a listing that is already disconnecting shows the hint when the tab opens", async () => {
      await renderListings([DISCONNECTING_LISTING]);

      expect(screen.getByText("This takes about a minute. Click Refresh to see the result.")).toBeInTheDocument();
      expect(switchOf("Booking.com")).toBeDisabled();
    });

    describe("when it fails", () => {
      test("a 409 reads the listing again, and the card says Disconnecting… with no alert", async () => {
        const user = userEvent.setup();
        disconnectChannel.mockRejectedValue(requestError(409, "DISCONNECT_IN_PROGRESS"));
        refreshChannels.mockResolvedValue({ listing: DISCONNECTING_LISTING });
        await openConfirm(user);

        await confirmTurnOff(user);

        await waitFor(() => expect(within(cardFor("Booking.com")).getByText("Disconnecting…")).toBeInTheDocument());
        expect(refreshChannels).toHaveBeenCalledTimes(1);
        expect(refreshChannels).toHaveBeenCalledWith({ propertyId: "p1" });
        expect(screen.queryByRole("alert")).not.toBeInTheDocument();
      });

      test("a 404 reads the listing again, and the channel that is gone reads Not connected, with no alert", async () => {
        const user = userEvent.setup();
        disconnectChannel.mockRejectedValue(requestError(404, "CHANNEL_NOT_FOUND"));
        refreshChannels.mockResolvedValue({ listing: listing("p1", "Canal House") });
        await openConfirm(user);

        await confirmTurnOff(user);

        await waitFor(() => expect(within(cardFor("Booking.com")).getByText("Not connected")).toBeInTheDocument());
        expect(screen.queryByRole("alert")).not.toBeInTheDocument();
      });

      test("a 500 says so with a single alert, reads the listing again, and the card shows what is left", async () => {
        const user = userEvent.setup();
        disconnectChannel.mockRejectedValue(requestError(500, "DISCONNECT_FAILED"));
        refreshChannels.mockResolvedValue({
          listing: listing("p1", "Canal House", { channels: [channel("BookingCom", "NEEDS_ATTENTION")] }),
        });
        await openConfirm(user);

        await confirmTurnOff(user);

        await waitFor(() => expect(within(cardFor("Booking.com")).getByText("Needs attention")).toBeInTheDocument());
        expect(screen.getAllByRole("alert")).toHaveLength(1);
        expect(screen.getByRole("alert")).toHaveTextContent("We couldn't turn this off. Try again.");
        expect(refreshChannels).toHaveBeenCalledTimes(1);
        expect(switchOf("Booking.com")).toBeEnabled();
      });

      test("a network error alerts, leaves the card as it was, and requests no refresh", async () => {
        const user = userEvent.setup();
        disconnectChannel.mockRejectedValue(new Error("Failed to fetch"));
        await openConfirm(user);

        await confirmTurnOff(user);

        expect(await screen.findByRole("alert")).toHaveTextContent("We couldn't turn this off. Try again.");
        expect(refreshChannels).not.toHaveBeenCalled();
        expect(within(cardFor("Booking.com")).getByText("Live")).toBeInTheDocument();
        await waitFor(() => expect(switchOf("Booking.com")).toBeEnabled());
        expect(switchOf("Booking.com")).toBeChecked();
      });
    });

    describe("a connect and a disconnect never run at the same time", () => {
      test("while the confirm is open, the other switches cannot start a connect", async () => {
        const user = userEvent.setup();
        await openConfirm(user);

        screen.getAllByRole("switch").forEach((control) => expect(control).toBeDisabled());
      });

      test("while the connect checklist is open, no switch can start a turn off, and Refresh is locked", async () => {
        const user = userEvent.setup();
        await renderListings();
        await user.click(switchOf("Vrbo"));

        screen.getAllByRole("switch").forEach((control) => expect(control).toBeDisabled());
        expect(screen.getByRole("button", { name: "Refresh" })).toBeDisabled();
      });

      test("a connect message does not stay on screen next to a turn off, and the other way round", async () => {
        const user = userEvent.setup();
        createConnectSession.mockRejectedValue(new Error("boom"));
        disconnectChannel.mockRejectedValue(new Error("Failed to fetch"));
        await renderListings();

        await user.click(switchOf("Vrbo"));
        for (const box of screen.getAllByRole("checkbox")) await user.click(box);
        await user.click(screen.getByRole("button", { name: "Continue" }));
        expect(await screen.findByRole("alert")).toHaveTextContent("We couldn't start the connection. Try again.");

        await user.click(switchOf("Booking.com"));
        expect(screen.queryByRole("alert")).not.toBeInTheDocument();
        await confirmTurnOff(user);
        expect(await screen.findByRole("alert")).toHaveTextContent("We couldn't turn this off. Try again.");
        expect(screen.getAllByRole("alert")).toHaveLength(1);

        await user.click(switchOf("Vrbo"));
        expect(screen.queryByRole("alert")).not.toBeInTheDocument();
      });
    });
  });

  describe("Retry on a setup that failed halfway", () => {
    const FAILED = listing("p3", "Windmill Cottage", { distribution: { status: "PROVISIONING_FAILED" } });
    const requestError = (status, errorCode) =>
      Object.assign(new Error("failed"), { status, responseBody: { errorCode } });

    const renderFailed = async (failedListing = FAILED) => {
      getHostListings.mockResolvedValue({ listings: [failedListing] });
      render(<PlatformCardsSection />);
      await screen.findByRole("button", { name: "Retry" });
    };

    test("runs enable again with the listing id, with no checklist and no Channex screen, and then the cards show", async () => {
      const user = userEvent.setup();
      enableDistribution.mockResolvedValue({ listing: listing("p3", "Windmill Cottage") });
      await renderFailed();

      await user.click(screen.getByRole("button", { name: "Retry" }));

      expect(await screen.findByText("Booking.com")).toBeInTheDocument();
      expect(enableDistribution).toHaveBeenCalledTimes(1);
      expect(enableDistribution).toHaveBeenCalledWith({ propertyId: "p3" });
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      expect(createConnectSession).not.toHaveBeenCalled();
      expect(screen.queryByRole("button", { name: "Retry" })).not.toBeInTheDocument();
    });

    test("is disabled and says it is setting up while the request runs", async () => {
      const user = userEvent.setup();
      enableDistribution.mockReturnValue(deferred().promise);
      await renderFailed();

      await user.click(screen.getByRole("button", { name: "Retry" }));

      expect(screen.getByRole("button", { name: "Retry" })).toBeDisabled();
      expect(screen.getByText("Setting up your listing…").tagName).toBe("OUTPUT");
    });

    test("asks for the timezone first where the listing requires one, and enables with the picked zone", async () => {
      const user = userEvent.setup();
      enableDistribution.mockResolvedValue({ listing: listing("p3", "Windmill Cottage") });
      await renderFailed({
        ...FAILED,
        timezone: { required: true, options: ["Asia/Jakarta", "Asia/Makassar"] },
      });

      await user.click(screen.getByRole("button", { name: "Retry" }));

      expect(screen.getByRole("dialog", { name: "Choose a timezone" })).toBeInTheDocument();
      expect(enableDistribution).not.toHaveBeenCalled();

      await user.selectOptions(screen.getByRole("combobox", { name: "Timezone" }), "Asia/Jakarta");
      await user.click(screen.getByRole("button", { name: "Continue" }));

      expect(await screen.findByText("Booking.com")).toBeInTheDocument();
      expect(enableDistribution).toHaveBeenCalledWith({ propertyId: "p3", timezone: "Asia/Jakarta" });
    });

    test("cancelling the timezone modal sends nothing and leaves the notice", async () => {
      const user = userEvent.setup();
      await renderFailed({ ...FAILED, timezone: { required: true, options: ["Asia/Jakarta"] } });
      await user.click(screen.getByRole("button", { name: "Retry" }));

      await user.click(screen.getByRole("button", { name: "Cancel" }));

      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      expect(enableDistribution).not.toHaveBeenCalled();
      expect(screen.getByRole("button", { name: "Retry" })).toBeEnabled();
    });

    test("a failure that is stored again keeps the notice with a single alert, and Retry works again", async () => {
      const user = userEvent.setup();
      enableDistribution.mockRejectedValueOnce(requestError(500, "PROVISIONING_FAILED"));
      enableDistribution.mockResolvedValue({ listing: listing("p3", "Windmill Cottage") });
      refreshChannels.mockResolvedValue({ listing: FAILED });
      await renderFailed();

      await user.click(screen.getByRole("button", { name: "Retry" }));

      await waitFor(() => expect(refreshChannels).toHaveBeenCalledWith({ propertyId: "p3" }));
      await waitFor(() => expect(screen.getByRole("button", { name: "Retry" })).toBeEnabled());
      expect(screen.getAllByRole("alert")).toHaveLength(1);

      await user.click(screen.getByRole("button", { name: "Retry" }));

      expect(await screen.findByText("Booking.com")).toBeInTheDocument();
    });

    test("a network error keeps the notice, with no refresh, and Retry is enabled again", async () => {
      const user = userEvent.setup();
      enableDistribution.mockRejectedValue(new Error("Failed to fetch"));
      await renderFailed();

      await user.click(screen.getByRole("button", { name: "Retry" }));

      await waitFor(() => expect(screen.getByRole("button", { name: "Retry" })).toBeEnabled());
      expect(refreshChannels).not.toHaveBeenCalled();
      expect(screen.getAllByRole("alert")).toHaveLength(1);
      expect(screen.getByRole("alert")).toHaveTextContent("Something went wrong while setting up. Try again.");
    });
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
