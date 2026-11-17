jest.mock("database", () => ({
    __esModule: true,
    default: { getInstance: jest.fn(async () => ({})) },
}));

const mockGetSettings = jest.fn();
const mockUpsertSettings = jest.fn();

jest.mock("../../functions/host-settings/data/repository.js", () => ({
    Repository: jest.fn().mockImplementation(() => ({
        getSettings: (...args) => mockGetSettings(...args),
        upsertSettings: (...args) => mockUpsertSettings(...args),
    })),
}));

const { Service } = require("../../functions/host-settings/business/service/service.js");

describe("the due soon email setting", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockGetSettings.mockResolvedValue(null);
        mockUpsertSettings.mockResolvedValue();
    });

    it("is on for someone who has never saved settings", async () => {
        const settings = await new Service().getSettings("user-1");

        expect(settings.notif_email_due_soon).toBe(true);
    });

    it("is saved when the user turns it off", async () => {
        await new Service().updateSettings("user-1", { notif_email_due_soon: false });

        expect(mockUpsertSettings).toHaveBeenCalledWith(
            expect.anything(),
            expect.objectContaining({ host_id: "user-1", notif_email_due_soon: false })
        );
    });

    it("stays off when a later save changes some other setting", async () => {
        mockGetSettings.mockResolvedValue({ notif_email_due_soon: false });

        await new Service().updateSettings("user-1", { default_priority: "High" });

        expect(mockUpsertSettings).toHaveBeenCalledWith(
            expect.anything(),
            expect.objectContaining({ notif_email_due_soon: false, default_priority: "High" })
        );
    });

    it("is on for someone whose saved settings predate it, so they keep getting the email", async () => {
        mockGetSettings.mockResolvedValue({ notif_email_overdue: false });

        await new Service().updateSettings("user-1", { default_priority: "High" });

        expect(mockUpsertSettings).toHaveBeenCalledWith(
            expect.anything(),
            expect.objectContaining({ notif_email_due_soon: true, notif_email_overdue: false })
        );
    });
});
