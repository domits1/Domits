import React from "react";
import "@testing-library/jest-dom";
import { render, screen, fireEvent } from "@testing-library/react";
import { LanguageContext } from "../../../../context/LanguageContext.js";
import LocationSection from "../views/locationSection";

jest.mock("react-icons/fa", () => ({
  FaMapMarkerAlt: () => <span data-testid="icon-marker" />,
}));

const location = { city: "Amsterdam", country: "Netherlands" };
const locationWithStreet = { street: "Damstraat", houseNumber: "1", city: "Amsterdam", country: "Netherlands" };

const renderWithLanguage = (language, props = {}) =>
  render(
    <LanguageContext.Provider value={{ language, setLanguageAndStore: jest.fn() }}>
      <LocationSection {...props} />
    </LanguageContext.Provider>
  );

describe("LocationSection", () => {
  describe("translations", () => {
    test("renders English text by default", () => {
      renderWithLanguage("en", { location });
      expect(screen.getByText("Where you'll be")).toBeInTheDocument();
      expect(screen.getByText("Exact location is provided after booking.")).toBeInTheDocument();
    });

    test("renders Dutch text when language is nl", () => {
      renderWithLanguage("nl", { location });
      expect(screen.getByText("Waar je verblijft")).toBeInTheDocument();
      expect(screen.getByText("De exacte locatie wordt na boeking verstrekt.")).toBeInTheDocument();
    });

    test("renders German text when language is de", () => {
      renderWithLanguage("de", { location });
      expect(screen.getByText("Wo du sein wirst")).toBeInTheDocument();
      expect(screen.getByText("Der genaue Standort wird nach der Buchung mitgeteilt.")).toBeInTheDocument();
    });

    test("renders Spanish text when language is es", () => {
      renderWithLanguage("es", { location });
      expect(screen.getByText("Dónde estarás")).toBeInTheDocument();
      expect(screen.getByText("La ubicación exacta se facilita tras la reserva.")).toBeInTheDocument();
    });

    test("falls back to English for an unknown language", () => {
      renderWithLanguage("fr", { location });
      expect(screen.getByText("Where you'll be")).toBeInTheDocument();
    });
  });

  describe("location label", () => {
    test("shows city and country as subtitle", () => {
      renderWithLanguage("en", { location });
      expect(screen.getByText("Amsterdam, Netherlands")).toBeInTheDocument();
    });

    test("shows unavailable message when location is missing", () => {
      renderWithLanguage("en", { location: {} });
      expect(screen.getByText("Location information is not available.")).toBeInTheDocument();
    });

    test("shows unavailable message when location prop is omitted", () => {
      renderWithLanguage("en");
      expect(screen.getByText("Location information is not available.")).toBeInTheDocument();
    });
  });

  describe("map", () => {
    test("renders iframe with city and country only in the src", () => {
      renderWithLanguage("en", { location: locationWithStreet });
      const iframe = screen.getByTitle("Where you'll be");
      expect(iframe).toBeInTheDocument();
      expect(iframe.src).toContain("Amsterdam");
      expect(iframe.src).toContain("Netherlands");
      expect(iframe.src).not.toContain("Damstraat");
    });

    test("does not render iframe when location is unusable", () => {
      renderWithLanguage("en", { location: {} });
      expect(screen.queryByTitle("Where you'll be")).not.toBeInTheDocument();
    });
  });

  describe("reset button", () => {
    test("renders the reset button when location is available", () => {
      renderWithLanguage("en", { location });
      expect(screen.getByRole("button", { name: /reset map view/i })).toBeInTheDocument();
    });

    test("does not render the reset button when location is unavailable", () => {
      renderWithLanguage("en", { location: {} });
      expect(screen.queryByRole("button", { name: /reset map view/i })).not.toBeInTheDocument();
    });

    test("remounts the iframe when reset button is clicked", () => {
      renderWithLanguage("en", { location });
      const iframeBefore = screen.getByTitle("Where you'll be");
      fireEvent.click(screen.getByRole("button", { name: /reset map view/i }));
      const iframeAfter = screen.getByTitle("Where you'll be");
      expect(iframeAfter).not.toBe(iframeBefore);
    });
  });
});
