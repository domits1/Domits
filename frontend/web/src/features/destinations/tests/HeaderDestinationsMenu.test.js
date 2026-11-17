import React from "react";
import { act, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Header from "../../../components/base/Header";
import FlowContext from "../../../services/FlowContext";
import { LanguageContext } from "../../../context/LanguageContext";
import { DESTINATION_MENU_TIMEOUT_MS, forgetDestinationMenu } from "../services/destinationMenuService";

jest.mock("aws-amplify", () => ({
  Auth: {
    currentAuthenticatedUser: jest.fn(() => Promise.reject(new Error("The user is not signed in."))),
    signOut: jest.fn(),
  },
}));

const MENU = {
  continents: [
    {
      name: "Europe",
      path: "/destinations/europe",
      activeListings: 2,
      countries: [{ name: "Spain", path: "/destinations/europe/spain", activeListings: 2, cities: [] }],
    },
  ],
};

const jsonResponse = (body, status = 200) => ({ ok: status < 400, status, json: async () => body });

const renderHeader = () =>
  render(
    <MemoryRouter initialEntries={["/"]}>
      <FlowContext.Provider value={{ setFlowState: jest.fn() }}>
        <LanguageContext.Provider value={{ language: "en", setLanguage: jest.fn() }}>
          <Header setSearchResults={jest.fn()} setLoading={jest.fn()} />
        </LanguageContext.Provider>
      </FlowContext.Provider>
    </MemoryRouter>
  );

const settle = () => act(async () => {});

const destinationsButton = () => screen.queryByRole("button", { name: "Destinations" });

describe("the destinations menu in the header", () => {
  beforeEach(() => {
    forgetDestinationMenu();
    globalThis.fetch = jest.fn();
    globalThis.ResizeObserver = class {
      observe() {}
      disconnect() {}
    };
    jest.spyOn(console, "error").mockImplementation(() => {});
    jest.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it("renders the header at once and adds the menu when it has destinations", async () => {
    let answer;
    globalThis.fetch.mockReturnValue(new Promise((resolve) => (answer = resolve)));

    renderHeader();

    expect(screen.getByAltText("Logo")).toBeInTheDocument();
    expect(destinationsButton()).not.toBeInTheDocument();
    expect(document.querySelector(".header-nav")).not.toHaveClass("has-destinations");

    await act(async () => answer(jsonResponse(MENU)));

    expect(destinationsButton()).toBeInTheDocument();
    expect(document.querySelector(".header-nav")).toHaveClass("has-destinations");
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });

  it("shows no menu while the destination pages are switched off", async () => {
    globalThis.fetch.mockResolvedValue(jsonResponse({ continents: [] }));

    renderHeader();
    await settle();

    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    expect(destinationsButton()).not.toBeInTheDocument();
    expect(document.querySelector(".header-nav")).not.toHaveClass("has-destinations");
    expect(screen.getByAltText("Logo")).toBeInTheDocument();
  });

  it.each([
    ["answers 503", () => Promise.resolve(jsonResponse({ message: "later" }, 503))],
    ["is not reachable", () => Promise.reject(new TypeError("Failed to fetch"))],
  ])("keeps the header as it is and shows no menu when the menu %s", async (_, failure) => {
    globalThis.fetch.mockImplementation(failure);

    renderHeader();
    await settle();

    expect(destinationsButton()).not.toBeInTheDocument();
    expect(screen.getByAltText("Logo")).toBeInTheDocument();
    expect(screen.getByAltText("Profile Icon")).toBeInTheDocument();
  });

  it("keeps the header as it is when the menu does not answer in time", async () => {
    jest.useFakeTimers();
    globalThis.fetch.mockImplementation(
      (_, { signal }) =>
        new Promise((_resolve, reject) => {
          signal.addEventListener("abort", () => reject(Object.assign(new Error("aborted"), { name: "AbortError" })));
        })
    );

    renderHeader();
    expect(screen.getByAltText("Logo")).toBeInTheDocument();
    await act(async () => {
      jest.advanceTimersByTime(DESTINATION_MENU_TIMEOUT_MS);
    });

    expect(globalThis.fetch.mock.calls[0][1].signal.aborted).toBe(true);
    expect(destinationsButton()).not.toBeInTheDocument();
    expect(screen.getByAltText("Logo")).toBeInTheDocument();
  });

  it("asks once for a header that renders again", async () => {
    globalThis.fetch.mockResolvedValue(jsonResponse(MENU));

    const { unmount } = renderHeader();
    await settle();
    unmount();
    renderHeader();
    await settle();

    expect(destinationsButton()).toBeInTheDocument();
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });
});
