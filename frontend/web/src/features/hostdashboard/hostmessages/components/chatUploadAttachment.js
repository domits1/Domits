import React, { useState} from "react";
import { useUploadUrl } from "../hooks/useUploadURL";

const ChatUploadAttachment = ({ onUploadComplete }) => {
    const [files, setFiles] = useState([]);
    const { getUploadUrl } = useUploadUrl();

    const handleAddAttachment = async () => {
        document.getElementById('fileInput').click();
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

    const handleAttachments = async (droppedFiles) => {
        const file = droppedFiles[0];
        const response = await getUploadUrl(file.type);

        if (!response.uploadUrl || !response.fields) {
            console.error("Failed to retrieve an upload URL");
            return;
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
            console.error("Failed to upload file", await uploadResponse.text());
        } else {
            const uploadedFile = {
                name: file.name,
                type: file.type,
                url: response.fileUrl,
            };
            setFiles((prev) => [...prev, uploadedFile]);
            onUploadComplete(response.fileUrl);
        }
    };



    const handleFileInputChange = (e) => {
        const selectedFiles = e.target.files;
        if (selectedFiles.length > 0) {
            handleAttachments(selectedFiles);
        }
    };

    // Previews are rendered in ChatScreen; this component only handles selection & upload

    return (
        <div className="add-attachment">
            <button
                onClick={handleAddAttachment}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                className="add-file-button"
            >
                +
            </button>

            <input
                type="file"
                id="fileInput"
                multiple
                style={{ display: "none" }}
                onChange={handleFileInputChange}
            />
        </div>


    )

}

export default ChatUploadAttachment;