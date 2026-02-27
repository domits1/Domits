import {useRef, useState} from "react";
import {Auth} from "aws-amplify";
import {PROFILE_PHOTO_MAX_SIZE} from "../components/settings/constants";
import {getProfileUploadUrl} from "../components/settings/api/profileUpload";

export default function usePhotoUpload(setUser) {
    const [photoError, setPhotoError] = useState("");
    const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
    const photoInputRef = useRef(null);

    const handlePhotoButtonClick = () => {
        if (photoInputRef.current) {
            photoInputRef.current.value = "";
            photoInputRef.current.click();
        }
    };

    const handlePhotoInputChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith("image/")) {
            setPhotoError("Please select an image file.");
            return;
        }

        if (file.size > PROFILE_PHOTO_MAX_SIZE) {
            setPhotoError("Image must be 5MB or smaller.");
            return;
        }

        setIsUploadingPhoto(true);
        setPhotoError("");

        try {
            const uploadData = await getProfileUploadUrl(file.type);

            if (!uploadData.uploadUrl || !uploadData.fields || !uploadData.fileUrl) {
                throw new Error("Invalid upload response.");
            }

            const formData = new FormData();
            Object.entries(uploadData.fields).forEach(([key, value]) => {
                formData.append(key, value);
            });
            formData.append("file", file);

            const uploadResponse = await fetch(uploadData.uploadUrl, {
                method: "POST",
                body: formData,
            });

            if (!uploadResponse.ok) {
                throw new Error("Failed to upload image.");
            }

            const currentUser = await Auth.currentAuthenticatedUser();
            await Auth.updateUserAttributes(currentUser, {picture: uploadData.fileUrl});
            setUser((prevState) => ({...prevState, picture: uploadData.fileUrl}));
        } catch (error) {
            console.error("Error uploading profile photo:", error);
            setPhotoError("Failed to upload photo. Please try again.");
        } finally {
            setIsUploadingPhoto(false);
            if (photoInputRef.current) {
                photoInputRef.current.value = "";
            }
        }
    };

    const handlePhotoRemove = async () => {
        setIsUploadingPhoto(true);
        setPhotoError("");

        try {
            const currentUser = await Auth.currentAuthenticatedUser();
            await Auth.updateUserAttributes(currentUser, {picture: ""});
            setUser((prevState) => ({...prevState, picture: ""}));
        } catch (error) {
            console.error("Error removing profile photo:", error);
            setPhotoError("Failed to remove photo. Please try again.");
        } finally {
            setIsUploadingPhoto(false);
        }
    };

    return {
        photoError,
        isUploadingPhoto,
        photoInputRef,
        onPhotoButtonClick: handlePhotoButtonClick,
        onPhotoInputChange: handlePhotoInputChange,
        onPhotoRemove: handlePhotoRemove,
    };
}
