import { getAccessToken } from "../../services/getAccessToken";
import { PROPERTY_API_BASE } from "../../features/hostdashboard/hostproperty/constants";
import {
    ComplianceApiError,
    fetchCompliancePropertyOptions,
    saveRegistrationNumber,
} from "../../features/hostdashboard/hostsettings/services/complianceApi";
import hostDashboardAll from "./fixtures/hostDashboardAll.json";

jest.mock("../../services/getAccessToken", () => ({
    getAccessToken: jest.fn(),
    getCognitoUserId: jest.fn(),
}));

const okResponse = (body) => ({ ok: true, status: 200, json: jest.fn().mockResolvedValue(body) });
const errorResponse = (status) => ({ ok: false, status, json: jest.fn().mockResolvedValue({}) });

const VILLA_ID = "11111111-1111-4111-8111-111111111111";
const VILLA_PLACEHOLDER = `AUTO-${VILLA_ID}`;

const MISSING = Symbol("missing");

// Copies the real-shaped fixture and replaces (or removes) the registration number of the first listing.
const fixtureWithRegistration = (value) => {
    const listings = JSON.parse(JSON.stringify(hostDashboardAll));
    if (value === MISSING) {
        delete listings[0].property.registrationNumber;
    } else {
        listings[0].property.registrationNumber = value;
    }
    return listings;
};

const villaOption = (options) => options.find((option) => option.id === VILLA_ID);

describe("complianceApi", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        getAccessToken.mockReturnValue("access-token");
        global.fetch = jest.fn();
        jest.spyOn(console, "warn").mockImplementation(() => {});
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe("fetchCompliancePropertyOptions", () => {
        it("requests the host dashboard listings with the raw access token", async () => {
            global.fetch.mockResolvedValue(okResponse([]));

            await fetchCompliancePropertyOptions();

            expect(global.fetch).toHaveBeenCalledWith(`${PROPERTY_API_BASE}/hostDashboard/all`, {
                method: "GET",
                headers: { Authorization: "access-token" },
            });
        });

        it("maps the real response shape to options, trimmed and sorted by title, without archived listings", async () => {
            global.fetch.mockResolvedValue(okResponse(hostDashboardAll));

            await expect(fetchCompliancePropertyOptions()).resolves.toEqual([
                {
                    id: "66666666-6666-4666-8666-666666666666",
                    title: "Casa do Mar",
                    city: "Lagos",
                    status: "ACTIVE",
                    registrationNumber: "PT-AL-2024-0042",
                    registrationNumberAvailable: true,
                },
                {
                    id: VILLA_ID,
                    title: "Test Villa",
                    city: "Algarve",
                    status: "INACTIVE",
                    registrationNumber: VILLA_PLACEHOLDER,
                    registrationNumberAvailable: true,
                },
            ]);
        });

        it.each([
            ["a real number", "PT-AL-2024-0042"],
            ["the generated placeholder", VILLA_PLACEHOLDER],
            ["a number that only looks like the prefix", "Auto-1234"],
            ["an empty string", ""],
        ])("keeps %s available without warning", async (_label, value) => {
            global.fetch.mockResolvedValue(okResponse(fixtureWithRegistration(value)));

            const option = villaOption(await fetchCompliancePropertyOptions());

            expect(option.registrationNumber).toBe(value);
            expect(option.registrationNumberAvailable).toBe(true);
            expect(console.warn).not.toHaveBeenCalled();
        });

        it.each([
            ["null", null],
            ["a missing key", MISSING],
            ["a non-string value", 1234],
        ])("marks %s as unavailable and warns with the listing id", async (_label, value) => {
            global.fetch.mockResolvedValue(okResponse(fixtureWithRegistration(value)));

            const option = villaOption(await fetchCompliancePropertyOptions());

            expect(option.registrationNumberAvailable).toBe(false);
            expect(console.warn).toHaveBeenCalledTimes(1);
            expect(console.warn).toHaveBeenCalledWith(expect.stringContaining(VILLA_ID));
        });

        it("treats a 404 (host without listings) as an empty list", async () => {
            global.fetch.mockResolvedValue(errorResponse(404));

            await expect(fetchCompliancePropertyOptions()).resolves.toEqual([]);
        });

        it("throws a ComplianceApiError carrying the status for other failures", async () => {
            global.fetch.mockResolvedValue(errorResponse(500));

            await expect(fetchCompliancePropertyOptions()).rejects.toMatchObject({
                name: "ComplianceApiError",
                status: 500,
            });
        });

        it("throws a 401 ComplianceApiError without calling the API when there is no token", async () => {
            getAccessToken.mockReturnValue(null);

            await expect(fetchCompliancePropertyOptions()).rejects.toMatchObject({ status: 401 });
            expect(global.fetch).not.toHaveBeenCalled();
        });
    });

    describe("saveRegistrationNumber", () => {
        it("PATCHes /property/registration with the property id and number and returns the stored value", async () => {
            global.fetch.mockResolvedValue(okResponse({ propertyId: "p-1", registrationNumber: "NL-9" }));

            const saved = await saveRegistrationNumber("p-1", "NL-9");

            expect(global.fetch).toHaveBeenCalledWith(`${PROPERTY_API_BASE}/registration`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json", Authorization: "access-token" },
                body: JSON.stringify({ propertyId: "p-1", registrationNumber: "NL-9" }),
            });
            expect(saved).toEqual({ propertyId: "p-1", registrationNumber: "NL-9" });
        });

        it.each([400, 403, 409, 500])("rejects with a ComplianceApiError carrying status %i", async (status) => {
            global.fetch.mockResolvedValue(errorResponse(status));

            const failure = saveRegistrationNumber("p-1", "NL-9");

            await expect(failure).rejects.toBeInstanceOf(ComplianceApiError);
            await expect(failure).rejects.toMatchObject({ status });
        });

        it("counts a 200 without the stored registrationNumber as a failed save", async () => {
            global.fetch.mockResolvedValue(okResponse({ propertyId: "p-1" }));

            await expect(saveRegistrationNumber("p-1", "NL-9")).rejects.toMatchObject({ status: 500 });
        });
    });
});
