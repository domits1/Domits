import { renderHook, act } from "@testing-library/react";
import "@testing-library/jest-dom";
import useCompanyLogoUpload from "../../hooks/useCompanyLogoUpload";
import * as companyLogoUpload from "../../components/settings/api/companyLogoUpload";
import { COMPANY_LOGO_MAX_SIZE } from "../../components/settings/constants";

jest.mock("../../components/settings/api/companyLogoUpload");

describe("useCompanyLogoUpload", () => {
    let onLogoChange;

    beforeEach(() => {
        onLogoChange = jest.fn();
        jest.clearAllMocks();
        globalThis.fetch = jest.fn();
    });

    test("initial state: logoError is empty and isUploadingLogo is false", () => {
        const { result } = renderHook(() => useCompanyLogoUpload(onLogoChange));
        expect(result.current.logoError).toBe("");
        expect(result.current.isUploadingLogo).toBe(false);
    });

    test("onLogoInputChange: does nothing when files array is empty", async () => {
        const { result } = renderHook(() => useCompanyLogoUpload(onLogoChange));
        await act(async () => {
            await result.current.onLogoInputChange({ target: { files: [] } });
        });
        expect(result.current.logoError).toBe("");
        expect(onLogoChange).not.toHaveBeenCalled();
    });

    test("onLogoInputChange: sets error for non-image MIME type", async () => {
        const { result } = renderHook(() => useCompanyLogoUpload(onLogoChange));
        const file = new File(["content"], "document.pdf", { type: "application/pdf" });
        await act(async () => {
            await result.current.onLogoInputChange({ target: { files: [file] } });
        });
        expect(result.current.logoError).toBe("Please select an image file.");
        expect(onLogoChange).not.toHaveBeenCalled();
    });

    test("onLogoInputChange: sets error when file size exceeds the 5MB limit", async () => {
        const { result } = renderHook(() => useCompanyLogoUpload(onLogoChange));
        const oversizedFile = new File(["x"], "big.png", { type: "image/png" });
        Object.defineProperty(oversizedFile, "size", { value: COMPANY_LOGO_MAX_SIZE + 1 });
        await act(async () => {
            await result.current.onLogoInputChange({ target: { files: [oversizedFile] } });
        });
        expect(result.current.logoError).toBe("Image must be 5MB or smaller.");
        expect(onLogoChange).not.toHaveBeenCalled();
    });

    test("onLogoInputChange: successful upload PUTs the file and reports the resulting URL", async () => {
        companyLogoUpload.getCompanyLogoUploadUrl.mockResolvedValue({
            uploadUrl: "https://s3.example.com/upload",
            fileUrl: "https://s3.example.com/company-logos/host-1/logo.png",
        });
        globalThis.fetch.mockResolvedValue({ ok: true });

        const { result } = renderHook(() => useCompanyLogoUpload(onLogoChange));
        const file = new File(["img-data"], "logo.png", { type: "image/png" });

        await act(async () => {
            await result.current.onLogoInputChange({ target: { files: [file] } });
        });

        expect(companyLogoUpload.getCompanyLogoUploadUrl).toHaveBeenCalledWith("image/png");
        expect(globalThis.fetch).toHaveBeenCalledWith(
            "https://s3.example.com/upload",
            expect.objectContaining({
                method: "PUT",
                headers: { "Content-Type": "image/png" },
                body: file,
            })
        );
        expect(onLogoChange).toHaveBeenCalledWith("https://s3.example.com/company-logos/host-1/logo.png");
        expect(result.current.logoError).toBe("");
        expect(result.current.isUploadingLogo).toBe(false);
    });

    test("onLogoInputChange: sets error when the presigned URL request fails", async () => {
        companyLogoUpload.getCompanyLogoUploadUrl.mockRejectedValue(new Error("Network error"));

        const { result } = renderHook(() => useCompanyLogoUpload(onLogoChange));
        const file = new File(["img"], "logo.png", { type: "image/png" });

        await act(async () => {
            await result.current.onLogoInputChange({ target: { files: [file] } });
        });

        expect(result.current.logoError).toBe("Failed to upload logo. Please try again.");
        expect(result.current.isUploadingLogo).toBe(false);
        expect(onLogoChange).not.toHaveBeenCalled();
    });

    test("onLogoInputChange: sets error when the S3 PUT returns a non-ok response", async () => {
        companyLogoUpload.getCompanyLogoUploadUrl.mockResolvedValue({
            uploadUrl: "https://s3.example.com/upload",
            fileUrl: "https://s3.example.com/logo.png",
        });
        globalThis.fetch.mockResolvedValue({ ok: false });

        const { result } = renderHook(() => useCompanyLogoUpload(onLogoChange));
        const file = new File(["img"], "logo.png", { type: "image/png" });

        await act(async () => {
            await result.current.onLogoInputChange({ target: { files: [file] } });
        });

        expect(result.current.logoError).toBe("Failed to upload logo. Please try again.");
        expect(onLogoChange).not.toHaveBeenCalled();
    });

    test("onLogoRemove: reports an empty URL", () => {
        const { result } = renderHook(() => useCompanyLogoUpload(onLogoChange));

        act(() => {
            result.current.onLogoRemove();
        });

        expect(onLogoChange).toHaveBeenCalledWith("");
    });
});
