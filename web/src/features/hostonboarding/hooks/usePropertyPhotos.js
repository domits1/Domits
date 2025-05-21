import { useState } from "react";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export default function usePhotos() {
  const [images, setImages] = useState([]);
  const [isDragOver, setIsDragOver] = useState(false);

  const MIN_WIDTH = 500;
  const MIN_HEIGHT = 500;
  const MIN_SIZE = 50000; // 50 KB
  const allowedFormats = ["image/jpeg", "image/png", "image/webp"];
  const MAX_IMAGES = 30;

  const validateImage = (file, callback) => {
    if (!file) return;

    if (!allowedFormats.includes(file.type)) {
      toast.error("❌ Only JPG, PNG or WEBP files are allowed.");
      return;
    }

    if (file.size < MIN_SIZE) {
      toast.error("❌ Image is too small (min. 50 KB).");
      return;
    }

    const img = new Image();
    img.src = URL.createObjectURL(file);
    img.onload = () => {
      if (img.width < MIN_WIDTH || img.height < MIN_HEIGHT) {
        toast.error(`❌ Image must be at least ${MIN_WIDTH}×${MIN_HEIGHT} pixels.`);
      } else {
        callback(file);
      }
    };
    img.onerror = () => {
      toast.error("❌ Invalid image.");
    };
  };

  const handleFileChange = (files) => {
    if (images.length >= MAX_IMAGES) {
      toast.error(`❌ You can upload a maximum of ${MAX_IMAGES} images.`);
      return;
    }

    let newImages = [...images];

    Array.from(files).forEach((file) => {
      if (newImages.length < MAX_IMAGES) {
        validateImage(file, (validFile) => {
          const reader = new FileReader();
          reader.onload = () => {
            newImages = [...newImages, reader.result];
            setImages(newImages);
            toast.success("✅ Image added!");
          };
          reader.readAsDataURL(validFile);
        });
      } else {
        toast.error(`❌ Maximum of ${MAX_IMAGES} images allowed.`);
      }
    });
  };

  const deleteImage = (index) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
    toast.info("🗑️ Image deleted.");
  };

  const reorderImages = (fromIndex, toIndex) => {
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
    isDragOver,
    setIsDragOver,
  };
}
