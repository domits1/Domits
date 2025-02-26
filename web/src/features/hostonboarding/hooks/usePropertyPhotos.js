import { useState } from "react";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import useFormStore from "../stores/formStore.js"; // Import the form store

//Add usefromstore to the import statement
export default function usePhotos() {
  const { accommodationDetails, updateImage, deleteImage } = useFormStore(); // Get state and update function
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
    const imageCount = Object.keys(accommodationDetails.images || {}).length;
    
    if (imageCount >= MAX_IMAGES) {
      toast.error(`❌ Je kunt maximaal ${MAX_IMAGES} afbeeldingen uploaden.`);
      return;
    }

    Array.from(files).forEach((file, index) => {
      if (imageCount + index < MAX_IMAGES) {
        validateImage(file, (validFile) => {
          const reader = new FileReader();
          reader.onload = () => {
            const imageUrl = reader.result;
            updateImage(imageCount + index, imageUrl); // Save to form store
            toast.success("✅ Afbeelding toegevoegd!");
          };
          reader.readAsDataURL(validFile);
        });
      } else {
        toast.error(`❌ Maximaal ${MAX_IMAGES} afbeeldingen toegestaan.`);
      }
    });
  };

  const removeImage = (index) => {
    deleteImage(index);
    toast.info("🗑️ Afbeelding verwijderd.");
  };

  return {
    images: accommodationDetails.images,
    handleFileChange,
    removeImage,
    isDragOver,
    setIsDragOver,
  };
}
