import { savePropertyChanges } from "./hostPropertyApi";
import {
  HOUSE_NUMBER_FORMAT_MESSAGE,
  HOUSE_NUMBER_TOO_LARGE_MESSAGE,
  MAX_HOUSE_NUMBER,
} from "../../../../utils/houseNumber";

jest.mock("../../../../services/getAccessToken", () => ({
  getAccessToken: jest.fn(() => "test-token"),
}));

const ADDRESS = {
  street: "Damrak",
  houseNumber: "12A",
  postalCode: "1012 LG",
  city: "Amsterdam",
  country: "Netherlands",
};

const EMPTY_ADDRESS = { street: "", houseNumber: "", postalCode: "", city: "", country: "" };

const buildSaveInput = (address, selectedTab = "Overview") => ({
  selectedTab,
  propertyId: "property-1",
  form: { title: "Canal house", subtitle: "", description: "Two floors by the water." },
  capacity: { propertyType: "Entire house", guests: 4, bedrooms: 2, beds: 2, bathrooms: 1 },
  address,
  selectedAmenityIds: [],
  policyRules: {},
  bookingType: "direct",
});

const sentBody = () => JSON.parse(global.fetch.mock.calls[0][1].body);

describe("savePropertyChanges house number", () => {
  beforeEach(() => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200, text: async () => "{}", json: async () => ({}) });
  });

  it("sends a house number with a letter suffix as a number and an extension", async () => {
    await savePropertyChanges(buildSaveInput(ADDRESS));

    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(sentBody().location).toEqual({
      street: "Damrak",
      houseNumber: 12,
      houseNumberExtension: "A",
      postalCode: "1012 LG",
      city: "Amsterdam",
      country: "Netherlands",
    });
  });

  it("refuses to save a house number that does not start with a number, instead of dropping the location", async () => {
    await expect(savePropertyChanges(buildSaveInput({ ...ADDRESS, houseNumber: "A12" }))).rejects.toThrow(
      HOUSE_NUMBER_FORMAT_MESSAGE
    );

    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("refuses to save a house number that does not fit the INTEGER column", async () => {
    const tooLarge = String(MAX_HOUSE_NUMBER + 1);

    await expect(savePropertyChanges(buildSaveInput({ ...ADDRESS, houseNumber: tooLarge }))).rejects.toThrow(
      HOUSE_NUMBER_TOO_LARGE_MESSAGE
    );

    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("refuses the save from any tab, because every save sends the location", async () => {
    await expect(
      savePropertyChanges(buildSaveInput({ ...ADDRESS, houseNumber: "A12" }, "Amenities"))
    ).rejects.toThrow(HOUSE_NUMBER_FORMAT_MESSAGE);

    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("still saves the rest, without a location, when the whole address is empty", async () => {
    await expect(savePropertyChanges(buildSaveInput(EMPTY_ADDRESS))).resolves.toBeDefined();

    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(sentBody()).not.toHaveProperty("location");
  });
});
