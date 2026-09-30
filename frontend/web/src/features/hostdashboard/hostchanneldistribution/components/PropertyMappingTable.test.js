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
    render(
      <PropertyMappingTable
        properties={[{ ...baseProperty, mapping: { ready: true, missingMappings: [] } }]}
      />
    );

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
        properties={[
          { ...baseProperty, mapping: { ready: false, missingMappings: ["RATE_PLAN_MAPPING_MISSING"] } },
        ]}
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
});
