import { useState } from "react";

export default function usePhotos() {
  const [images, setImages] = useState({});
  const [isDragOver, setIsDragOver] = useState(false);

  const handleFileChange = (file, index) => {
    const reader = new FileReader();
    reader.onload = () => {
      const imageURL = reader.result; // Get the image data URL
      console.log(`Selected image ${index + 1}:`, imageURL); // Log image data URL
      setImages((prev) => {
        const updatedImages = {
          ...prev,
          [`image${index + 1}`]: imageURL, // Update state with image URL
        };
        console.log("Updated images:", updatedImages); // Log the updated images state
        return updatedImages;
      });
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
        const imageKey = `image${Object.keys(images).length + i + 1}`;
        const imageURL = reader.result;
        console.log(`Dropped image ${imageKey}:`, imageURL); // Log the dropped image data URL
        newImages[imageKey] = imageURL;
        setImages((prev) => {
          const updatedImages = {
            ...prev,
            ...newImages, // Add the new image(s) to the state
          };
          console.log("Updated images after drop:", updatedImages); // Log updated state
          return updatedImages;
        });
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
