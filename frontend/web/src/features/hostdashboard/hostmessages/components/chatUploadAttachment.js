import React, { useRef, useState} from "react";
import Icon from "@mdi/react";
import { mdiLoading, mdiPaperclip } from "@mdi/js";
import { useUploadUrl } from "../hooks/useUploadURL";

const ChatUploadAttachment = ({ onUploadComplete, onUploadError }) => {
    const [files, setFiles] = useState([]);
    const [uploading, setUploading] = useState(false);
    const uploadingRef = useRef(false);
    const fileInputRef = useRef(null);
    const { getUploadUrl } = useUploadUrl();

    const handleAddAttachment = async () => {
        fileInputRef.current?.click();
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();

        const droppedFiles = e.dataTransfer.files;
        if (droppedFiles.length > 0) {
            handleAttachments(droppedFiles);
        }
    };

    const uploadFile = async (file) => {
        const response = await getUploadUrl(file.type);

        if (!response.uploadUrl || !response.fields) {
            throw new Error("Failed to retrieve an upload URL");
        }

        const formData = new FormData();
        Object.entries(response.fields).forEach(([key, value]) => {
            formData.append(key, value);
        });
        formData.append("file", file);

        const uploadResponse = await fetch(response.uploadUrl, {
            method: 'POST',
            body: formData,
        });

        if (!uploadResponse.ok) {
            throw new Error("Failed to upload file");
        }

        const uploadedFile = {
            name: file.name,
            type: file.type,
            url: response.fileUrl,
        };
        setFiles((prev) => [...prev, uploadedFile]);
        onUploadComplete(response.fileUrl);
    };

    const handleAttachments = async (droppedFiles) => {
        if (uploadingRef.current) {
            return;
        }

        uploadingRef.current = true;
        setUploading(true);
        try {
            await uploadFile(droppedFiles[0]);
        } catch {
            onUploadError?.();
        } finally {
            uploadingRef.current = false;
            setUploading(false);
        }
    };



    const handleFileInputChange = (e) => {
        const selectedFiles = e.target.files;
        if (selectedFiles.length > 0) {
            handleAttachments(selectedFiles);
        }
    };

    return (
        <div className="add-attachment">
            <button
                type="button"
                aria-label="Attach file"
                title="Attach file"
                disabled={uploading}
                aria-busy={uploading}
                onClick={handleAddAttachment}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                className="add-file-button"
            >
                <Icon path={uploading ? mdiLoading : mdiPaperclip} size={1} spin={uploading} />
            </button>

            <input
                type="file"
                ref={fileInputRef}
                multiple
                style={{ display: "none" }}
                onChange={handleFileInputChange}
            />
        </div>


    )

}

export default ChatUploadAttachment;
