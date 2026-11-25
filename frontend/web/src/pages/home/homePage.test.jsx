import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { Auth } from "aws-amplify";
import Homepage from "./homePage";
import { FetchAllPropertyTypes } from "./services/fetchProperties";
import { LanguageContext } from "../../context/LanguageContext";
import FlowContext from "../../services/FlowContext";
import en from "../../content/en.json";

jest.mock("aws-amplify", () => ({ Auth: { currentAuthenticatedUser: jest.fn() } }));

jest.mock("../../components/base/SearchBar", () => ({ SearchBar: () => null }));

jest.mock("./AccommodationCard", () => () => null);

jest.mock("swiper/css", () => ({}), { virtual: true });
jest.mock("swiper/css/pagination", () => ({}), { virtual: true });
jest.mock("swiper/css/effect-fade", () => ({}), { virtual: true });

jest.mock("./services/fetchProperties", () => ({ FetchAllPropertyTypes: jest.fn() }));

const renderHomepage = async () => {
  render(
    <MemoryRouter>
      <LanguageContext.Provider value={{ language: "en" }}>
        <FlowContext.Provider value={{ flowState: { isHost: false }, setFlowState: jest.fn() }}>
          <Homepage />
        </FlowContext.Provider>
      </LanguageContext.Provider>
    </MemoryRouter>
  );
  await screen.findByRole("button", { name: en.hostSection.button });
};

describe("Homepage host section", () => {
  beforeAll(() => {
    global.IntersectionObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  });

  beforeEach(() => {
    Auth.currentAuthenticatedUser.mockRejectedValue(new Error("not signed in"));
    FetchAllPropertyTypes.mockResolvedValue({ properties: [], lastEvaluatedKey: null });
  });

  test("shows the host section without the unverified metrics", async () => {
    await renderHomepage();

    expect(screen.getByText(en.hostSection.title)).toBeInTheDocument();
    for (const { value, label } of Object.values(en.hostSection.stats)) {
      expect(screen.queryByText(value)).not.toBeInTheDocument();
      expect(screen.queryByText(label)).not.toBeInTheDocument();
    }
  });
});
