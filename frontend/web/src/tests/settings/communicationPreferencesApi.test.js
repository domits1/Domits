import {
    COMMUNICATION_PREFERENCES_ENDPOINT,
    buildCommunicationPreferencesUrl,
    fetchCommunicationPreferences,
    normalizeCommunicationPreferencesPersona,
    saveCommunicationPreferences,
    buildHostNotificationPreferencesUrl,
    fetchHostNotificationEventPreferences,
    saveHostNotificationEventPreferences,
} from "../../components/settings/api/communicationPreferences";
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

const savedPreferences = {
    reservation: { email: true, sms: true, push: false },
    cancellation: { email: true, sms: false, push: true },
    messages: { email: false, sms: true, push: false },
};

describe("communicationPreferences API", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockSession();
        global.fetch = jest.fn(async () => ({
            ok: true,
            json: async () => savedPreferences,
        }));
    });

    test("normalizes allowed personas", () => {
        expect(normalizeCommunicationPreferencesPersona("host")).toBe("host");
        expect(normalizeCommunicationPreferencesPersona("GUEST")).toBe("guest");
    });

    test("rejects invalid persona before calling the API", async () => {
        await expect(fetchCommunicationPreferences("admin")).rejects.toThrow("Communication preferences persona must be host or guest.");
        expect(global.fetch).not.toHaveBeenCalled();
    });

    test("builds the same current-user endpoint with persona query", () => {
        expect(buildCommunicationPreferencesUrl("host")).toBe(`${COMMUNICATION_PREFERENCES_ENDPOINT}?persona=host`);
        expect(buildCommunicationPreferencesUrl("guest")).toBe(`${COMMUNICATION_PREFERENCES_ENDPOINT}?persona=guest`);
    });

    test("GET Host uses persona=host with Cognito authorizer token", async () => {
        await expect(fetchCommunicationPreferences("host")).resolves.toEqual(savedPreferences);

        expect(global.fetch).toHaveBeenCalledWith(`${COMMUNICATION_PREFERENCES_ENDPOINT}?persona=host`, expect.objectContaining({
            method: "GET",
            cache: "no-store",
            headers: {
                "Content-Type": "application/json",
                Authorization: "Bearer id-token-1",
            },
        }));
    });

    test("GET Guest uses persona=guest with the same endpoint", async () => {
        await fetchCommunicationPreferences("guest");

        expect(global.fetch).toHaveBeenCalledWith(`${COMMUNICATION_PREFERENCES_ENDPOINT}?persona=guest`, expect.objectContaining({
            method: "GET",
        }));
    });

    test("PUT sends persona and complete matrix without user identity fields", async () => {
        const attemptedPreferences = {
            reservation: { email: false, sms: true, push: false },
            cancellation: { email: false, sms: false, push: true },
            messages: { email: false, sms: true, push: false },
        };

        await saveCommunicationPreferences("guest", attemptedPreferences);

        const [url, request] = global.fetch.mock.calls[0];
        const body = JSON.parse(request.body);

        expect(url).toBe(`${COMMUNICATION_PREFERENCES_ENDPOINT}?persona=guest`);
        expect(request.method).toBe("PUT");
        expect(body).toEqual({
            reservation: { email: true, sms: true, push: false },
            cancellation: { email: true, sms: false, push: true },
            messages: { email: false, sms: true, push: false },
        });
        expect(body.userId).toBeUndefined();
        expect(body.user_id).toBeUndefined();
        expect(body.hostId).toBeUndefined();
        expect(body.guestId).toBeUndefined();
    });

    test("failed requests show a safe user-facing error", async () => {
        global.fetch.mockResolvedValueOnce({
            ok: false,
            status: 500,
            json: async () => ({ message: "AWS stack trace" }),
        });

        await expect(fetchCommunicationPreferences("host")).rejects.toThrow(
            "We could not load your communication preferences. Please try again."
        );
    });
});


describe("host notification event preferences API", () => {
    const hostEventPreferences = {
        manager_new_booking: { inApp: true, email: false, sms: true },
        finance_chargeback: { inApp: false, email: true, sms: false },
    };
    const hostEventCatalog = {
        categories: [{ key: "propertyManager", labelKey: "propertyManager", events: [{ key: "manager_new_booking", event: "New booking" }] }],
        preferences: hostEventPreferences,
    };

    beforeEach(() => {
        jest.clearAllMocks();
        mockSession();
        global.fetch = jest.fn(async () => ({
            ok: true,
            json: async () => hostEventCatalog,
        }));
    });

    test("builds the host-only event preferences URL", () => {
        expect(buildHostNotificationPreferencesUrl()).toBe(
            `${COMMUNICATION_PREFERENCES_ENDPOINT}?persona=host&view=host-events`
        );
    });

    test("GET reads the event catalog and preferences using the authenticated endpoint", async () => {
        global.fetch.mockResolvedValueOnce({
            ok: true,
            json: async () => hostEventCatalog,
        });

        await expect(fetchHostNotificationEventPreferences()).resolves.toEqual(hostEventCatalog);

        expect(global.fetch).toHaveBeenCalledWith(
            `${COMMUNICATION_PREFERENCES_ENDPOINT}?persona=host&view=host-events`,
            expect.objectContaining({
                method: "GET",
                cache: "no-store",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: "Bearer id-token-1",
                },
            })
        );
    });

    test("PUT saves the complete host event preferences matrix", async () => {
        global.fetch.mockResolvedValueOnce({
            ok: true,
            json: async () => hostEventPreferences,
        });

        await saveHostNotificationEventPreferences(hostEventPreferences);

        const [url, request] = global.fetch.mock.calls[0];
        expect(url).toBe(`${COMMUNICATION_PREFERENCES_ENDPOINT}?persona=host&view=host-events`);
        expect(request.method).toBe("PUT");
        expect(JSON.parse(request.body)).toEqual(hostEventPreferences);
    });
});
