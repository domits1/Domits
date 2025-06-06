import {beforeEach, describe, expect, it} from "@jest/globals";
import {render, screen, waitFor} from "@testing-library/react-native";
import PropertyDetailsScreen from "../screens/propertyDetailsScreen";
import i18n from "i18next";
import {initReactI18next} from "react-i18next";
import {LanguageReferences} from "../../../features/translation/services/Languages";
import mockDetails from "../../../services/property/test/listingDetails.json";
import React from "react";

jest.mock(
    'react-native/Libraries/Components/ToastAndroid/ToastAndroid',
    () => ({
        show: jest.fn(),
        SHORT: 'short',
        LONG: 'long',
    }),
);

jest.mock('@aws-amplify/core', () => ({
    fetchAuthSession: jest.fn().mockResolvedValue({
        tokens: {
            accessToken: {
                toString: () => 'mock-access-token',
            },
        },
    }),
}));

describe("Property details", () => {
    beforeEach(async () => {
        await i18n.use(initReactI18next).init({
            lng: 'en',
            fallbackLng: 'en',
            resources: LanguageReferences,
        });
    });

    it("should initially render a loading screen", async () => {
        render(<PropertyDetailsScreen route={{params: {property: {property: {id: mockDetails.property.id}}}}}/>);

        expect(screen.queryByTestId("loadingScreen")).toBeTruthy();
    });

    it("should display basic details", async () => {
        render(<PropertyDetailsScreen route={{params: {property: {property: {id: mockDetails.property.id}}}}}/>);

        await waitFor(() => {
            expect(screen.getByTestId("loadingScreen")).toBeNull()
        })

        await waitFor(() => {
            expect(screen.getByTestId("propertyDetailsTitle")).toBeTruthy()
        });

        expect(screen.getByTestId("propertyDetailsTitle").props.children).toContain(mockDetails.property.title);
        expect(screen.getByTestId("propertyDetailsSubtitle").props.children).toContain(mockDetails.property.subtitle);
        expect(screen.getByTestId("propertyDetailsRoomRate").props.children).toContain("0.00");
        expect(screen.getByTestId("propertyDetailsCleaning").props.children).toContain(
            Number(mockDetails.pricing.cleaning).toFixed(2)
        );
        expect(screen.getByTestId("propertyDetailsService").props.children).toContain(
            Number(mockDetails.pricing.service).toFixed(2)
        );
        expect(screen.getByTestId("propertyDetailsTotalCost").props.children).toContain(
            (
                mockDetails.pricing.cleaning +
                mockDetails.pricing.service
            ).toFixed(2)
        );
    });
});
