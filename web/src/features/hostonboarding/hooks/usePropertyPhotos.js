// --- START OF FILE usePropertyPhotos.js ---

import { useState, useCallback } from "react"; // Added useCallback
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

// Constants
export const MAX_IMAGES = 5; // Max number of images allowed
export const MIN_IMAGES_REQUIRED = 5; // Min number for proceeding
export const ALLOWED_FORMATS = ["image/jpeg", "image/png", "image/webp"];
export const MIN_WIDTH = 500;
export const MIN_HEIGHT = 500;
const MIN_SIZE_BYTES = 50000; // 50 KB

export default function usePhotos() {
  const [images, setImages] = useState([]); // Array of base64 image strings

  // --- Image Validation ---
  const validateImage = useCallback((file, onSuccess) => {
    if (!file) return;

    // Type Check
    if (!ALLOWED_FORMATS.includes(file.type)) {
      toast.error(`❌ Invalid format. Allowed: JPG, PNG, WEBP.`);
      return;
    }

    // Size Check (Bytes)
    if (file.size < MIN_SIZE_BYTES) {
      toast.error(`❌ Image too small (min. ${MIN_SIZE_BYTES / 1000} KB).`);
      return;
    }

    // Dimension Check
    const img = new Image();
    const objectUrl = URL.createObjectURL(file); // Create temporary URL

    img.onload = () => {
      URL.revokeObjectURL(objectUrl); // Clean up temporary URL
      if (img.width < MIN_WIDTH || img.height < MIN_HEIGHT) {
        toast.error(`❌ Image dimensions too small (min. ${MIN_WIDTH}x${MIN_HEIGHT}px).`);
      } else {
        onSuccess(file); // Validation passed
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl); // Clean up on error too
      toast.error("❌ Could not read image file.");
    };
    img.src = objectUrl;
  }, []); // Empty dependency array as constants are stable

  // --- Handle Adding Files ---
  const handleFileChange = useCallback((files) => {
    const filesToProcess = Array.from(files);
    let currentImageCount = images.length; // Use state directly inside callback if needed via function form of setState

    filesToProcess.forEach((file) => {
      if (currentImageCount >= MAX_IMAGES) {
        toast.warn(`⚠️ Maximum ${MAX_IMAGES} images allowed. Some files ignored.`);
        return; // Stop processing if max reached
      }

      validateImage(file, (validFile) => {
        // Check count *again* inside async callback before adding
        setImages(prevImages => {
          if (prevImages.length < MAX_IMAGES) {
            const reader = new FileReader();
            reader.onload = () => {
              // Update state functionally to ensure we have the latest count
              setImages(current => [...current, reader.result]);
              toast.success("✅ Image added!");
            };
            reader.readAsDataURL(validFile);
            currentImageCount++; // Increment count after deciding to process
            return prevImages; // Return previous state until reader loads
          } else {
            // This case should be rare due to outer check, but belt-and-suspenders
            toast.warn(`⚠️ Maximum ${MAX_IMAGES} images reached.`);
            return prevImages;
          }
        });

      });
    });
  }, [validateImage, images.length]); // Dependency: validateImage, images.length (outer check)

  // --- Delete Image ---
  const deleteImage = useCallback((indexToDelete) => {
    setImages((prev) => prev.filter((_, i) => i !== indexToDelete));
    toast.info("🗑️ Image removed.");
  }, []); // Empty dependency array

  // --- Reorder Images ---
  const reorderImages = useCallback((dragIndex, hoverIndex) => {
    setImages((prev) => {
      const updatedImages = [...prev];
      const draggedImage = updatedImages[dragIndex];
      // Remove dragged item and insert at hover position
      updatedImages.splice(dragIndex, 1);
      updatedImages.splice(hoverIndex, 0, draggedImage);
      return updatedImages;
    });
    // Optional: Toast notification for reorder can be annoying, maybe remove
    // toast.info("🔄 Images reordered.");
  }, []); // Empty dependency array

  return {
    images,
    handleFileChange,
    deleteImage,
    reorderImages,
    // No drag state needed from hook
  };
}
// --- END OF FILE usePropertyPhotos.js ---