import { useState } from "react";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

// Define constants outside the hook for clarity
const MIN_WIDTH = 500;
const MIN_HEIGHT = 500;
const MIN_SIZE_KB = 50; // In KB for easier reading
const MIN_SIZE = MIN_SIZE_KB * 1024; // In bytes
const ALLOWED_FORMATS = ["image/jpeg", "image/png", "image/webp"];
const MAX_IMAGES = 10; // Allow up to 10 images

export { MAX_IMAGES }; // Export MAX_IMAGES so the view can use it

export default function usePhotos() {
  const [images, setImages] = useState([]);
  // This state is specifically for the initial drop zone visual feedback
  const [isInitialDragOver, setIsInitialDragOver] = useState(false);

  const validateImage = (file) => {
    return new Promise((resolve, reject) => {
      if (!file) return reject("No file provided.");

      if (!ALLOWED_FORMATS.includes(file.type)) {
        return reject(`❌ Invalid format. Only JPG, PNG, WEBP allowed.`);
      }

      if (file.size < MIN_SIZE) {
        return reject(`❌ Image too small (min. ${MIN_SIZE_KB} KB).`);
      }

      const img = new Image();
      img.src = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(img.src); // Clean up object URL
        if (img.width < MIN_WIDTH || img.height < MIN_HEIGHT) {
          reject(`❌ Image dimensions too small (min. ${MIN_WIDTH}x${MIN_HEIGHT}px).`);
        } else {
          resolve(file); // Image is valid
        }
      };
      img.onerror = () => {
        URL.revokeObjectURL(img.src); // Clean up object URL
        reject("❌ Invalid image file.");
      };
    });
  };

  const handleFileChange = async (files) => {
    const fileList = Array.from(files);
    let addedCount = 0;
    let currentImageCount = images.length;

    // Use a temporary array to batch updates
    const newImagesData = [];

    for (const file of fileList) {
      if (currentImageCount + newImagesData.length >= MAX_IMAGES) {
        toast.warn(`⚠️ Max ${MAX_IMAGES} images allowed. Some files were not added.`);
        break; // Stop processing if max is reached
      }

      try {
        const validFile = await validateImage(file);
        // Read valid files concurrently
        const reader = new FileReader();
        const readPromise = new Promise((resolve, reject) => {
          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(validFile);
        });
        newImagesData.push(readPromise);
        addedCount++;
      } catch (error) {
        toast.error(error); // Display validation error
      }
    }

    // Wait for all valid files to be read
    if (newImagesData.length > 0) {
      try {
        const results = await Promise.all(newImagesData);
        setImages(prev => [...prev, ...results]);
        if (addedCount > 0) {
          toast.success(`✅ ${addedCount} image${addedCount > 1 ? 's' : ''} added!`);
        }
      } catch (error) {
        toast.error("❌ Error reading files.");
      }
    }
  };


  const deleteImage = (index) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
    toast.info("🗑️ Image removed.");
  };

  const reorderImages = (fromIndex, toIndex) => {
    // Prevent unnecessary reorder if indices are the same
    if (fromIndex === toIndex) return;

    setImages((prev) => {
      const newImages = [...prev];
      const [movedImage] = newImages.splice(fromIndex, 1);
      newImages.splice(toIndex, 0, movedImage);
      return newImages;
    });
    toast.info("🔄 Images reordered.");
  };

  return {
    images,
    handleFileChange,
    deleteImage,
    reorderImages,
    isInitialDragOver, // For the initial placeholder D&D area
    setIsInitialDragOver,
    // MAX_IMAGES is exported directly, no need to return it here
  };
}