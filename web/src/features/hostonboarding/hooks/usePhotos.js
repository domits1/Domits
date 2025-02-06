import { useState } from "react";

export default function usePhotos() {
  const [images, setImages] = useState({});
  const [isDragOver, setIsDragOver] = useState(false);

  const handleFileChange = (file, index) => {
    const reader = new FileReader();
    console.log(`Selected image ${index + 1}:`, reader.result);
    reader.onload = () => {
      setImages((prev) => ({
        ...prev,
        [`image${index + 1}`]: reader.result,
      }));
    };
    reader.readAsDataURL(file);
  };

  const deleteImage = (index) => {
    setImages((prev) => {
      const updated = { ...prev };
      delete updated[`image${index + 1}`];
      return updated;
    });
  };

  const reorderImages = (fromIndex, toIndex) => {
    setImages((prev) => {
      const entries = Object.entries(prev);
      const [movedImage] = entries.splice(fromIndex, 1);
      entries.splice(toIndex, 0, movedImage);
      const reorderedImages = {};
      entries.forEach(([_, value], i) => {
        reorderedImages[`image${i + 1}`] = value;
      });
      return reorderedImages;
    });
  };

  const handleDropFiles = (files) => {
    const newImages = {};
    Array.from(files).forEach((file, i) => {
      const reader = new FileReader();
      reader.onload = () => {
        newImages[`image${Object.keys(images).length + i + 1}`] = reader.result;
        setImages((prev) => ({
          ...prev,
          ...newImages,
        }));
      };
      reader.readAsDataURL(file);
    });
  };

  return {
    images,
    handleFileChange,
    deleteImage,
    reorderImages,
    isDragOver,
    setIsDragOver,
    handleDropFiles,
  };
}
