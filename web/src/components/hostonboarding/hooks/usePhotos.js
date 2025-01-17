import { useState } from "react";

export const usePhotos = () => {
  const [images, setImages] = useState({});

  const handleFileChange = (file, index) => {
    const reader = new FileReader();
    reader.onload = () => {
      setImages((prev) => ({
        ...prev,
        [`image${index + 1}`]: reader.result,
      }));
    };
    reader.readAsDataURL(file);
  };

  const deleteImage = (index) => {
    setImages((prev) => ({
      ...prev,
      [`image${index + 1}`]: null, // Replace the deleted image with null
    }));
  };

  return { images, handleFileChange, deleteImage };
};
