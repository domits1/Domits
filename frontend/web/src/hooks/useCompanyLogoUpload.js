import { useRef, useState } from "react";
import { COMPANY_LOGO_MAX_SIZE } from "../components/settings/constants";
import { getCompanyLogoUploadUrl } from "../components/settings/api/companyLogoUpload";

export default function useCompanyLogoUpload(onLogoChange) {
    const [logoError, setLogoError] = useState("");
    const [isUploadingLogo, setIsUploadingLogo] = useState(false);
    const logoInputRef = useRef(null);

    const handleLogoButtonClick = () => {
        if (logoInputRef.current) {
            logoInputRef.current.value = "";
            logoInputRef.current.click();
        }
    };

    const handleLogoInputChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith("image/")) {
            setLogoError("Please select an image file.");
            return;
        }

        if (file.size > COMPANY_LOGO_MAX_SIZE) {
            setLogoError("Image must be 5MB or smaller.");
            return;
        }

        setIsUploadingLogo(true);
        setLogoError("");

        try {
            const uploadData = await getCompanyLogoUploadUrl(file.type);

            if (!uploadData.uploadUrl || !uploadData.fileUrl) {
                throw new Error("Invalid upload response.");
            }

            const uploadResponse = await fetch(uploadData.uploadUrl, {
                method: "PUT",
                headers: { "Content-Type": file.type },
                body: file,
            });

            if (!uploadResponse.ok) {
                throw new Error("Failed to upload image.");
            }

            onLogoChange(uploadData.fileUrl);
        } catch (error) {
            console.error("Error uploading company logo:", error);
            setLogoError("Failed to upload logo. Please try again.");
        } finally {
            setIsUploadingLogo(false);
            if (logoInputRef.current) {
                logoInputRef.current.value = "";
            }
        }
    };

    const handleLogoRemove = () => {
        onLogoChange("");
    };

    return {
        logoError,
        isUploadingLogo,
        logoInputRef,
        onLogoButtonClick: handleLogoButtonClick,
        onLogoInputChange: handleLogoInputChange,
        onLogoRemove: handleLogoRemove,
    };
}
