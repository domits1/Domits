import { accommodationData } from "../constants/propertyTypeData";

const { visibleTypes, icons } = accommodationData.accommodation;
const LUXURY_ICON_PATTERN = /^onboarding-type-(villa|home|residence)\.svg$/;

describe("accommodation type icons", () => {
  it.each(visibleTypes)("has an icon for %s", (type) => {
    expect(icons[type]).toBeTruthy();
  });

  it("uses one matching icon set for the three visible types", () => {
    const iconFiles = visibleTypes.map((type) => icons[type]);

    iconFiles.forEach((file) => expect(file).toMatch(LUXURY_ICON_PATTERN));
    expect(new Set(iconFiles).size).toBe(visibleTypes.length);
  });
});
