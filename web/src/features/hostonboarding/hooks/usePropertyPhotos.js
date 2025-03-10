import { useState } from "react";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export default function usePhotos() {
  const [images, setImages] = useState([]);
  const [isDragOver, setIsDragOver] = useState(false);

  const MIN_WIDTH = 500;
  const MIN_HEIGHT = 500;
  const MIN_SIZE = 50000;
  const allowedFormats = ["image/jpeg", "image/png", "image/webp"];
  const MAX_IMAGES = 5;

  const validateImage = (file, callback) => {
    if (!file) return;

    if (!allowedFormats.includes(file.type)) {
      toast.error("❌ Alleen JPG, PNG of WEBP toegestaan.");
      return;
    }

    if (file.size < MIN_SIZE) {
      toast.error("❌ Afbeelding is te klein (min. 50 KB).");
      return;
    }

    const img = new Image();
    img.src = URL.createObjectURL(file);
    img.onload = () => {
      if (img.width < MIN_WIDTH || img.height < MIN_HEIGHT) {
        toast.error(`❌ Afbeelding moet minimaal ${MIN_WIDTH}x${MIN_HEIGHT} pixels zijn.`);
      } else {
        callback(file);
      }
    };
    img.onerror = () => {
      toast.error("❌ Ongeldige afbeelding.");
    };
  };

  const handleFileChange = (files) => {
    if (images.length >= MAX_IMAGES) {
      toast.error(`❌ Je kunt maximaal ${MAX_IMAGES} afbeeldingen uploaden.`);
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
            toast.success("✅ Afbeelding toegevoegd!");
          };
          reader.readAsDataURL(validFile);
        });
      } else {
        toast.error(`❌ Maximaal ${MAX_IMAGES} afbeeldingen toegestaan.`);
      }
    });
  };
  

  const deleteImage = (index) => {
    setImages((prev) => {
      const updatedImages = prev.filter((_, i) => i !== index);
      return updatedImages;
    });
    toast.info("🗑️ Afbeelding verwijderd.");
  };

  const reorderImages = (fromIndex, toIndex) => {
    setImages((prev) => {
      const newImages = [...prev];
      const [movedImage] = newImages.splice(fromIndex, 1);
      newImages.splice(toIndex, 0, movedImage);
      return newImages;
    });
    toast.info("🔄 Afbeeldingen opnieuw gerangschikt.");
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
