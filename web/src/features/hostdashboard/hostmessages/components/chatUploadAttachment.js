import React, { useState, useCallback, useEffect } from "react";
import { useUploadUrl } from "../hooks/useUploadURL";
import { FaImages } from 'react-icons/fa';

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

    const renderPreviews = () => {
        return files.map((file, index) => {

            if (file.type.startsWith("image")) {
                return (
                    <div key={index} className="file-preview">
                        <img src={file.url} alt={`Preview-${index}`} width="100" height="100" />
                    </div>
                );
            } else if (file.type.startsWith("video")) {
                return (
                    <div key={index} className="file-preview">
                        <video width="100" height="100" controls>
                            <source src={file.url} type={file.type} />
                            Your browser does not support the video tag.
                        </video>
                    </div>
                );
            } else {
                return (
                    <div key={index} className="file-preview">
                        <a href={file.url} target="_blank" rel="noopener noreferrer">{file.name}</a>
                    </div>
                );
            }
        });
    };

    return (
        <div className="add-attachment">
            <button
                onClick={handleAddAttachment}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                className="add-file-button"
            >
                <FaImages />
            </button>

            <input
                type="file"
                id="fileInput"
                multiple
                style={{ display: "none" }}
                onChange={handleFileInputChange}
            />
            {renderPreviews()}
        </div>


    )

}

export default ChatUploadAttachment;