import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { MemoryRouter } from "react-router-dom";
import { LanguageContext } from "../../context/LanguageContext";
import HostSettingsCompany from "../../features/hostdashboard/hostsettings/pages/HostSettingsCompany";
import { fetchCompanyProfile, saveCompanyProfile } from "../../components/settings/api/companyProfile";
import { getCompanyLogoUploadUrl } from "../../components/settings/api/companyLogoUpload";

jest.mock("../../components/settings/api/companyProfile", () => ({
    fetchCompanyProfile: jest.fn(),
    saveCompanyProfile: jest.fn(),
}));

jest.mock("../../components/settings/api/companyLogoUpload", () => ({
    getCompanyLogoUploadUrl: jest.fn(),
}));

const emptyProfile = {
    companyName: "",
    displayName: "",
    logoUrl: "",
    description: "",
    website: "",
    publicEmail: "",
    publicPhone: "",
    country: "",
};

const savedProfile = {
    companyName: "Acme Rentals",
    displayName: "Acme Guest Stays",
    logoUrl: "",
    description: "Boutique stays.",
    website: "https://acme-rentals.example",
    publicEmail: "hello@acme-rentals.example",
    publicPhone: "+31 6 12345678",
    country: "Netherlands",
};

const renderPage = () => render(
    <LanguageContext.Provider value={{ language: "en" }}>
        <MemoryRouter>
            <HostSettingsCompany />
        </MemoryRouter>
    </LanguageContext.Provider>
);

const waitForLoaded = async () => {
    await waitFor(() => expect(fetchCompanyProfile).toHaveBeenCalled());
    await waitFor(() => expect(screen.getByLabelText("Company name")).toHaveValue(""));
};

describe("HostSettingsCompany page", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        fetchCompanyProfile.mockResolvedValue(emptyProfile);
        saveCompanyProfile.mockResolvedValue(emptyProfile);
    });

    test("renders private and public section labels distinctly, not just by color", async () => {
        renderPage();
        await waitForLoaded();

        expect(screen.getByRole("heading", { name: "Private" })).toBeInTheDocument();
        expect(screen.getByText(/Only visible to you/i)).toBeInTheDocument();
        expect(screen.getByRole("heading", { name: "Public Information" })).toBeInTheDocument();
        expect(screen.getByText(/Visible to guests on your listings/i)).toBeInTheDocument();
    });

    test("loads and displays the saved profile fields", async () => {
        fetchCompanyProfile.mockResolvedValueOnce(savedProfile);

        renderPage();

        await waitFor(() => expect(screen.getByLabelText("Company name")).toHaveValue("Acme Rentals"));
        expect(screen.getByLabelText("Display name")).toHaveValue("Acme Guest Stays");
        expect(screen.getByLabelText("Website")).toHaveValue("https://acme-rentals.example");
        expect(screen.getByLabelText("Public email")).toHaveValue("hello@acme-rentals.example");
        expect(screen.getByLabelText("Public phone")).toHaveValue("+31 6 12345678");
        expect(screen.getByLabelText("Country")).toHaveValue("Netherlands");
    });

    test("editing a field and saving sends the full profile payload", async () => {
        renderPage();
        await waitForLoaded();

        fireEvent.change(screen.getByLabelText("Company name"), { target: { value: "Acme Rentals" } });
        fireEvent.change(screen.getByLabelText("Public email"), { target: { value: "hello@acme.example" } });

        saveCompanyProfile.mockResolvedValueOnce({
            ...emptyProfile,
            companyName: "Acme Rentals",
            publicEmail: "hello@acme.example",
        });

        fireEvent.click(screen.getByRole("button", { name: /save/i }));

        await waitFor(() => expect(saveCompanyProfile).toHaveBeenCalledWith({
            ...emptyProfile,
            companyName: "Acme Rentals",
            publicEmail: "hello@acme.example",
        }));
    });

    test("failed save shows a safe error and keeps the unsaved value", async () => {
        saveCompanyProfile.mockRejectedValueOnce(new Error("network failed"));

        renderPage();
        await waitForLoaded();

        fireEvent.change(screen.getByLabelText("Company name"), { target: { value: "Acme Rentals" } });
        fireEvent.click(screen.getByRole("button", { name: /save/i }));

        await waitFor(() => expect(
            screen.getByText("We could not save your company information. Your changes are still here.")
        ).toBeInTheDocument());
        expect(screen.getByLabelText("Company name")).toHaveValue("Acme Rentals");
    });

    test("uploading a logo PUTs the file and stores the returned URL for save", async () => {
        getCompanyLogoUploadUrl.mockResolvedValue({
            uploadUrl: "https://s3.example.com/upload",
            fileUrl: "https://s3.example.com/company-logos/host-1/logo.png",
        });
        globalThis.fetch = jest.fn().mockResolvedValue({ ok: true });

        renderPage();
        await waitForLoaded();

        fireEvent.change(screen.getByLabelText("Company name"), { target: { value: "Acme Rentals" } });

        const file = new File(["img"], "logo.png", { type: "image/png" });
        const logoInput = screen.getByLabelText("Upload logo", { selector: "input" });
        await waitFor(() => fireEvent.change(logoInput, { target: { files: [file] } }));

        await waitFor(() => expect(getCompanyLogoUploadUrl).toHaveBeenCalledWith("image/png"));
        expect(globalThis.fetch).toHaveBeenCalledWith("https://s3.example.com/upload", expect.objectContaining({
            method: "PUT",
        }));

        fireEvent.click(screen.getByRole("button", { name: /save/i }));

        await waitFor(() => expect(saveCompanyProfile).toHaveBeenCalledWith(expect.objectContaining({
            logoUrl: "https://s3.example.com/company-logos/host-1/logo.png",
        })));
    });
});
