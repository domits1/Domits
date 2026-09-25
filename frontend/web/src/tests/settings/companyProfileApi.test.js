import {
    COMPANY_PROFILE_ENDPOINT,
    fetchCompanyProfile,
    saveCompanyProfile,
} from "../../components/settings/api/companyProfile";
import { Auth } from "aws-amplify";

jest.mock("aws-amplify", () => ({
    Auth: {
        currentSession: jest.fn(),
    },
}));

const mockSession = () => {
    Auth.currentSession.mockResolvedValue({
        getIdToken: () => ({
            getJwtToken: () => "id-token-1",
        }),
    });
};

const savedProfile = {
    companyName: "Acme Rentals",
    displayName: "Acme Guest Stays",
    logoUrl: "",
    description: "",
    website: "",
    publicEmail: "",
    publicPhone: "",
    country: "",
};

describe("companyProfile API", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockSession();
        global.fetch = jest.fn(async () => ({
            ok: true,
            json: async () => savedProfile,
        }));
    });

    test("GET uses the company profile endpoint with the Cognito authorizer token", async () => {
        await expect(fetchCompanyProfile()).resolves.toEqual(savedProfile);

        expect(global.fetch).toHaveBeenCalledWith(COMPANY_PROFILE_ENDPOINT, expect.objectContaining({
            method: "GET",
            cache: "no-store",
            headers: {
                "Content-Type": "application/json",
                Authorization: "Bearer id-token-1",
            },
        }));
    });

    test("PUT sends the profile payload as the request body", async () => {
        const attemptedProfile = { ...savedProfile, website: "https://acme-rentals.example" };

        await saveCompanyProfile(attemptedProfile);

        const [url, request] = global.fetch.mock.calls[0];
        const body = JSON.parse(request.body);

        expect(url).toBe(COMPANY_PROFILE_ENDPOINT);
        expect(request.method).toBe("PUT");
        expect(body).toEqual(attemptedProfile);
    });

    test("failed GET shows a safe user-facing error", async () => {
        global.fetch.mockResolvedValueOnce({
            ok: false,
            status: 500,
            json: async () => ({ message: "AWS stack trace" }),
        });

        await expect(fetchCompanyProfile()).rejects.toThrow(
            "We could not load your company information. Please try again."
        );
    });

    test("failed PUT shows a safe user-facing error", async () => {
        global.fetch.mockResolvedValueOnce({
            ok: false,
            status: 400,
            json: async () => ({ message: "Unknown company profile field: vatNumber." }),
        });

        await expect(saveCompanyProfile(savedProfile)).rejects.toThrow(
            "We could not save your company information. Please try again."
        );
    });
});
