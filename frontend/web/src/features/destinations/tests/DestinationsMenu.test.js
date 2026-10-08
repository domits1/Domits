import React from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { LanguageContext } from "../../../context/LanguageContext";
import DestinationsMenu, { isDestinationsMenuEnabled } from "../components/DestinationsMenu";
import { fetchDestinationMenu } from "../services/destinationMenuService";

jest.mock("../services/destinationMenuService", () => ({ fetchDestinationMenu: jest.fn() }));

const MENU = [
  {
    name: "Europe",
    path: "/destinations/europe",
    activeListings: 3,
    countries: [
      {
        name: "Spain",
        path: "/destinations/europe/spain",
        activeListings: 3,
        cities: [{ name: "Marbella", path: "/destinations/europe/spain/marbella", activeListings: 2 }],
      },
    ],
  },
  {
    name: "Asia",
    path: "/destinations/asia",
    activeListings: 1,
    countries: [{ name: "Thailand", path: "/destinations/asia/thailand", activeListings: 1, cities: [] }],
  },
];

const onOpen = jest.fn();

const renderMenu = (language = "en") =>
  render(
    <LanguageContext.Provider value={{ language }}>
      <DestinationsMenu onOpen={onOpen} />
    </LanguageContext.Provider>
  );

const click = (name) => act(async () => fireEvent.click(screen.getByRole("button", { name })));
const openMenu = (name = "Destinations") => click(name);

describe("the destinations menu", () => {
  beforeEach(() => {
    process.env.REACT_APP_DESTINATIONS_MENU = "true";
  });

  it("loads the destinations only when it opens, once, and links every item to its page", async () => {
    let answer;
    fetchDestinationMenu.mockReturnValue(new Promise((resolve) => (answer = resolve)));
    renderMenu();
    expect(fetchDestinationMenu).not.toHaveBeenCalled();

    await openMenu();
    expect(onOpen).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("status")).toHaveTextContent("Loading destinations…");
    await act(async () => answer(MENU));
    expect(screen.getByRole("link", { name: "Spain" })).toHaveAttribute("href", "/destinations/europe/spain");
    expect(screen.getByRole("link", { name: "Marbella" })).toHaveAttribute(
      "href",
      "/destinations/europe/spain/marbella"
    );
    expect(screen.getByRole("link", { name: "All destinations in Europe" })).toHaveAttribute(
      "href",
      "/destinations/europe"
    );
    expect(screen.queryByRole("link", { name: "Thailand" })).not.toBeInTheDocument();

    await click("Asia 1");
    expect(screen.getByRole("link", { name: "Thailand" })).toHaveAttribute("href", "/destinations/asia/thailand");
    expect(screen.queryByRole("link", { name: "Spain" })).not.toBeInTheDocument();

    await openMenu();
    await openMenu();
    expect(screen.getByRole("link", { name: "Thailand" })).toBeInTheDocument();
    expect(fetchDestinationMenu).toHaveBeenCalledTimes(1);
  });

  it("keeps the header usable when the data fails, retries on request, and again on the next open", async () => {
    fetchDestinationMenu.mockRejectedValue(new Error("offline"));
    renderMenu("nl");

    await openMenu("Bestemmingen");
    expect(await screen.findByRole("alert")).toHaveTextContent("Bestemmingen zijn nu niet beschikbaar.");
    expect(screen.getByRole("button", { name: "Bestemmingen" })).toHaveAttribute("aria-expanded", "true");

    await click("Opnieuw proberen");
    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(fetchDestinationMenu).toHaveBeenCalledTimes(2);

    fetchDestinationMenu.mockResolvedValue(MENU);
    await openMenu("Bestemmingen");
    await openMenu("Bestemmingen");
    expect(await screen.findByRole("link", { name: "Spain" })).toBeInTheDocument();
    expect(fetchDestinationMenu).toHaveBeenCalledTimes(3);
  });

  it("is only mounted by the header when the build flag says so", () => {
    expect(isDestinationsMenuEnabled()).toBe(true);
    process.env.REACT_APP_DESTINATIONS_MENU = "TRUE";
    expect(isDestinationsMenuEnabled()).toBe(false);
    delete process.env.REACT_APP_DESTINATIONS_MENU;
    expect(isDestinationsMenuEnabled()).toBe(false);
  });

  it("says so when there are no destinations yet", async () => {
    fetchDestinationMenu.mockResolvedValue([]);
    renderMenu();

    await openMenu();
    expect(await screen.findByText("No destinations yet.")).toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("works from the keyboard: arrows move between continents, Escape closes and returns focus", async () => {
    fetchDestinationMenu.mockResolvedValue(MENU);
    renderMenu();

    await openMenu();
    const europe = await screen.findByRole("button", { name: "Europe 3" });
    const asia = screen.getByRole("button", { name: "Asia 1" });
    expect(europe).toHaveAttribute("tabindex", "0");
    expect(asia).toHaveAttribute("tabindex", "-1");
    act(() => europe.focus());
    fireEvent.keyDown(europe, { key: "ArrowDown" });
    expect(asia).toHaveFocus();
    expect(asia).toHaveAttribute("tabindex", "0");
    expect(europe).toHaveAttribute("tabindex", "-1");
    expect(screen.getByRole("link", { name: "Thailand" })).toBeInTheDocument();

    fireEvent.keyDown(document, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("link", { name: "Thailand" })).not.toBeInTheDocument());
    expect(screen.getByRole("button", { name: "Destinations" })).toHaveFocus();
    expect(screen.getByRole("button", { name: "Destinations" })).toHaveAttribute("aria-expanded", "false");
  });

  it("closes on a click outside", async () => {
    fetchDestinationMenu.mockResolvedValue(MENU);
    renderMenu();

    await openMenu();
    await screen.findByRole("link", { name: "Spain" });
    fireEvent.mouseDown(document.body);
    await waitFor(() => expect(screen.queryByRole("link", { name: "Spain" })).not.toBeInTheDocument());
  });
});
