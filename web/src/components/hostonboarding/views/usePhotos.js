import { useState } from "react";

export default function usePhotos() {
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
    setImages((prev) => {
      const updated = { ...prev };
      delete updated[`image${index + 1}`];
      return updated;
    });
  };

  // Handle image reordering during drag-and-drop
  const reorderImages = (fromIndex, toIndex) => {
    setImages((prev) => {
      // Convert state object to entries for easier manipulation
      const entries = Object.entries(prev);

      // Find and remove the dragged image
      const [movedImage] = entries.splice(fromIndex, 1);

      // Insert the image at the new position
      entries.splice(toIndex, 0, movedImage);

      // Rebuild the object with correct keys
      const reorderedImages = {};
      entries.forEach(([_, value], i) => {
        reorderedImages[`image${i + 1}`] = value;
      });

      return reorderedImages;
    });
  };

  return { images, handleFileChange, deleteImage, reorderImages };
}
