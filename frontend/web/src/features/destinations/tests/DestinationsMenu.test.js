import React from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { LanguageContext } from "../../../context/LanguageContext";
import DestinationsMenu from "../components/DestinationsMenu";
import en from "../../../content/en.json";
import nl from "../../../content/nl.json";
import de from "../../../content/de.json";
import es from "../../../content/es.json";

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

const renderMenu = ({ language = "en", continents = MENU, onOpen = jest.fn() } = {}) => {
  render(
    <LanguageContext.Provider value={{ language }}>
      <DestinationsMenu continents={continents} onOpen={onOpen} />
    </LanguageContext.Provider>
  );
  return { onOpen };
};

const click = (name) => fireEvent.click(screen.getByRole("button", { name }));

describe("the destinations menu", () => {
  it("opens on the first continent, links every item to its page and switches continent", () => {
    const { onOpen } = renderMenu();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();

    click("Destinations");

    expect(onOpen).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "Destinations" })).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("link", { name: "All destinations in Europe" })).toHaveAttribute(
      "href",
      "/destinations/europe"
    );
    expect(screen.getByRole("link", { name: "Spain" })).toHaveAttribute("href", "/destinations/europe/spain");
    expect(screen.getByRole("link", { name: "Marbella" })).toHaveAttribute(
      "href",
      "/destinations/europe/spain/marbella"
    );
    expect(screen.queryByRole("link", { name: "Thailand" })).not.toBeInTheDocument();

    click("Asia 1");
    expect(screen.getByRole("link", { name: "Thailand" })).toHaveAttribute("href", "/destinations/asia/thailand");
    expect(screen.queryByRole("link", { name: "Spain" })).not.toBeInTheDocument();

    click("Destinations");
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it("works from the keyboard: arrows move between continents, Escape closes and returns focus", () => {
    renderMenu();
    click("Destinations");

    const europe = screen.getByRole("button", { name: "Europe 3" });
    const asia = screen.getByRole("button", { name: "Asia 1" });
    expect(europe).toHaveAttribute("tabindex", "0");
    expect(asia).toHaveAttribute("tabindex", "-1");
    act(() => europe.focus());
    fireEvent.keyDown(europe, { key: "ArrowDown" });
    expect(asia).toHaveFocus();
    expect(asia).toHaveAttribute("tabindex", "0");
    expect(screen.getByRole("link", { name: "Thailand" })).toBeInTheDocument();
    fireEvent.keyDown(asia, { key: "ArrowDown" });
    expect(europe).toHaveFocus();

    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Destinations" })).toHaveFocus();
    expect(screen.getByRole("button", { name: "Destinations" })).toHaveAttribute("aria-expanded", "false");
  });

  it("closes on a click outside", async () => {
    renderMenu();
    click("Destinations");
    fireEvent.mouseDown(document.body);
    await waitFor(() => expect(screen.queryByRole("link")).not.toBeInTheDocument());
  });

  it("speaks the language of the page", () => {
    renderMenu({ language: "nl" });
    click("Bestemmingen");
    expect(screen.getByRole("link", { name: "Alle bestemmingen in Europe" })).toBeInTheDocument();
  });

  it("falls back to English for a language without copy", () => {
    renderMenu({ language: "fr" });
    expect(screen.getByRole("button", { name: "Destinations" })).toBeInTheDocument();
  });

  it("renders nothing without continents", () => {
    const { container } = render(
      <LanguageContext.Provider value={{ language: "en" }}>
        <DestinationsMenu continents={[]} />
      </LanguageContext.Provider>
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("has the same, filled in copy in all four languages", () => {
    const copies = [en, nl, de, es].map((content) => content.component.destinations);
    for (const copy of copies) {
      expect(Object.keys(copy).sort()).toEqual(["allIn", "title"]);
      expect(Object.values(copy).every((text) => typeof text === "string" && text.trim().length > 0)).toBe(true);
    }
  });
});
