import {useRef, useState} from "react";
import {Auth} from "aws-amplify";
import {PROFILE_PHOTO_MAX_SIZE} from "../components/settings/constants";
import {uploadProfilePhoto} from "../components/settings/api/profileUpload";

const readFileAsDataUrl = (file) =>
    new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
    });

const PHOTO_SUCCESS_DISPLAY_MS = 2500;

export default function usePhotoUpload(setUser) {
    const [photoError, setPhotoError] = useState("");
    const [photoSuccess, setPhotoSuccess] = useState("");
    const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
    const [isRemovingPhoto, setIsRemovingPhoto] = useState(false);
    const photoInputRef = useRef(null);

    const showPhotoSuccess = (kind) => {
        setPhotoSuccess(kind);
        setTimeout(() => setPhotoSuccess(""), PHOTO_SUCCESS_DISPLAY_MS);
    };

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
        setPhotoSuccess("");

        try {
            const session = await Auth.currentSession();
            const accessToken = session.getAccessToken().getJwtToken();

            const imageDataUrl = await readFileAsDataUrl(file);
            const {fileUrl} = await uploadProfilePhoto(accessToken, imageDataUrl);

            if (!fileUrl) {
                throw new Error("Invalid upload response.");
            }

            const currentUser = await Auth.currentAuthenticatedUser();
            await Auth.updateUserAttributes(currentUser, {picture: fileUrl});
            setUser((prevState) => ({...prevState, picture: fileUrl}));
            showPhotoSuccess("uploaded");
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
        setIsRemovingPhoto(true);
        setPhotoError("");
        setPhotoSuccess("");

        try {
            const currentUser = await Auth.currentAuthenticatedUser();
            await Auth.updateUserAttributes(currentUser, {picture: ""});
            setUser((prevState) => ({...prevState, picture: ""}));
            showPhotoSuccess("removed");
        } catch (error) {
            console.error("Error removing profile photo:", error);
            setPhotoError("Failed to remove photo. Please try again.");
        } finally {
            setIsRemovingPhoto(false);
        }
    };

    return {
        photoError,
        photoSuccess,
        isUploadingPhoto,
        isRemovingPhoto,
        photoInputRef,
        onPhotoButtonClick: handlePhotoButtonClick,
        onPhotoInputChange: handlePhotoInputChange,
        onPhotoRemove: handlePhotoRemove,
    };
}
