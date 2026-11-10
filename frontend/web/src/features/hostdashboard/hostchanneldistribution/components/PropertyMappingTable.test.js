import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import PropertyMappingTable from "./PropertyMappingTable";

const baseProperty = {
  id: "property-1",
  title: "Canal View Loft",
  location: "Amsterdam",
  image: null,
  guests: 4,
  bedrooms: 2,
  bathrooms: 1,
  availableNights: 22,
  totalNights: 30,
  nightlyRate: 145,
};

describe("PropertyMappingTable", () => {
  test("renders a Mapped badge when the mapping is ready", () => {
    render(<PropertyMappingTable properties={[{ ...baseProperty, mapping: { ready: true, missingMappings: [] } }]} />);

    expect(screen.getByText("Mapped")).toBeInTheDocument();
  });

  test("renders a Not mapped badge when nothing is linked yet", () => {
    render(
      <PropertyMappingTable
        properties={[
          {
            ...baseProperty,
            mapping: {
              ready: false,
              missingMappings: ["PROPERTY_MAPPING_MISSING", "ROOM_TYPE_MAPPING_MISSING", "RATE_PLAN_MAPPING_MISSING"],
            },
          },
        ]}
      />
    );

    expect(screen.getByText("Not mapped")).toBeInTheDocument();
  });

  test("renders an Issue badge when the property is linked but a room type or rate plan is missing", () => {
    render(
      <PropertyMappingTable
        properties={[{ ...baseProperty, mapping: { ready: false, missingMappings: ["RATE_PLAN_MAPPING_MISSING"] } }]}
      />
    );

    expect(screen.getByText("Issue")).toBeInTheDocument();
  });

  test("renders the No image fallback when image is null", () => {
    render(
      <PropertyMappingTable
        properties={[{ ...baseProperty, image: null, mapping: { ready: true, missingMappings: [] } }]}
      />
    );

    expect(screen.getByText("No image")).toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  test("falls back to No image when a provided image URL fails to load", () => {
    render(
      <PropertyMappingTable
        properties={[
          {
            ...baseProperty,
            image: "https://example.com/broken.jpg",
            mapping: { ready: true, missingMappings: [] },
          },
        ]}
      />
    );

    const image = screen.getByRole("img", { name: `${baseProperty.title} thumbnail` });
    fireEvent.error(image);

    expect(screen.getByText("No image")).toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  const readyMapping = { ready: true, missingMappings: [] };

  describe("missing details", () => {
    test("leaves a missing guest, bedroom or bathroom count out of the meta line", () => {
      const { container } = render(
        <PropertyMappingTable
          properties={[{ ...baseProperty, guests: undefined, bathrooms: null, mapping: readyMapping }]}
        />
      );

      expect(screen.getByText("2 bedrooms")).toBeInTheDocument();
      expect(container).not.toHaveTextContent("undefined");
      expect(container).not.toHaveTextContent("null");
    });

    test("renders no meta line when every count is missing", () => {
      render(
        <PropertyMappingTable
          properties={[
            { ...baseProperty, guests: undefined, bedrooms: undefined, bathrooms: undefined, mapping: readyMapping },
          ]}
        />
      );

      expect(screen.getByText("Canal View Loft")).toBeInTheDocument();
      expect(screen.queryByText(/guest|bedroom|bathroom/)).not.toBeInTheDocument();
    });

    test("leaves the nights-free text out when either night count is missing", () => {
      const { container } = render(
        <PropertyMappingTable properties={[{ ...baseProperty, availableNights: undefined, mapping: readyMapping }]} />
      );

      expect(screen.queryByText(/nights free/)).not.toBeInTheDocument();
      expect(container).not.toHaveTextContent("undefined");
    });

    test("still renders the counts, nights and price when they are all present", () => {
      render(<PropertyMappingTable properties={[{ ...baseProperty, mapping: readyMapping }]} />);

      expect(screen.getByText("4 guests · 2 bedrooms · 1 bathroom")).toBeInTheDocument();
      expect(screen.getByText("22/30 nights free")).toBeInTheDocument();
      expect(screen.getByText("EUR 145")).toBeInTheDocument();
    });
  });

  describe("price", () => {
    // PropTypes warns for the wrong types below; that is the situation being tested.
    beforeEach(() => {
      jest.spyOn(console, "error").mockImplementation(() => {});
    });

    afterEach(() => {
      console.error.mockRestore();
    });

    test.each([
      ["undefined", undefined],
      ["null", null],
      ["NaN", Number.NaN],
      ["a string", "145"],
    ])("shows no price when the nightly rate is %s, not EUR 0", (_label, nightlyRate) => {
      render(<PropertyMappingTable properties={[{ ...baseProperty, nightlyRate, mapping: readyMapping }]} />);

      expect(screen.queryByText(/EUR/)).not.toBeInTheDocument();
    });

    test("still shows an explicit rate of 0", () => {
      render(<PropertyMappingTable properties={[{ ...baseProperty, nightlyRate: 0, mapping: readyMapping }]} />);

      expect(screen.getByText("EUR 0")).toBeInTheDocument();
    });
  });

  test("renders an empty-state line instead of an empty list when there are no properties", () => {
    const { container } = render(<PropertyMappingTable properties={[]} />);

    expect(screen.getByText("No properties to show yet.")).toBeInTheDocument();
    expect(container).toHaveTextContent(/^No properties to show yet\.$/);
  });
});
