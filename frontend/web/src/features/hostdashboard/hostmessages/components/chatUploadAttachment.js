import React, { useState, useCallback, useEffect } from "react";
import { useUploadUrl } from "../hooks/useUploadURL";


const ChatUploadAttachment = () => {
    const [files, setFiles] = useState([]);
    const { uploadUrl, fileUrl, loading, error, getUploadUrl } = useUploadUrl();

    useEffect(() => {
        if (uploadUrl) {
            console.log(uploadUrl)
            console.log(fileUrl)
            // delete when finished
        }
    }, [uploadUrl]);


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
        const { uploadUrl, fileUrl } = await getUploadUrl(file.type);
    
        await fetch(uploadUrl, {
          method: 'PUT',
          headers: {
            'Content-Type': file.type,
          },
          body: file,
        });
    
        // if (onUploadComplete) {
        //   onUploadComplete(fileUrl);
        // }
      };
    

    const handleFileInputChange = (e) => {
        const selectedFiles = e.target.files;
        if (selectedFiles.length > 0) {
            handleAttachments(selectedFiles);
        }
    };

    const renderPreviews = () => {
        return files.map((file, index) => {
            const fileUrl = URL.createObjectURL(file);

            if (file.type.startsWith("image")) {
                return (
                    <div key={index} className="file-preview">
                        <img src={fileUrl} alt={`Preview-${index}`} width="100" height="100" />
                    </div>
                );
            } else if (file.type.startsWith("video")) {
                return (
                    <div key={index} className="file-preview">
                        <video width="100" height="100" controls>
                            <source src={fileUrl} type={file.type} />
                            Your browser does not support the video tag.
                        </video>
                    </div>
                );
            } else {
                return (
                    <div key={index} className="file-preview">
                        <p>{file.name}</p>
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
                disabled
            >
                Add files
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