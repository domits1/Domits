import { useState } from "react";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import useFormStoreHostOnboarding from "../stores/formStoreHostOnboarding";

export default function usePhotos() {
  const images = useFormStoreHostOnboarding((state) => state.accommodationDetails.imageList);
  const setImageList = useFormStoreHostOnboarding((state) => state.setImageList);
  const [isDragOver, setIsDragOver] = useState(false);

  const MIN_WIDTH = 500;
  const MIN_HEIGHT = 500;
  const MAX_TOTAL_SIZE = 500 * 1024;
  const allowedFormats = ["image/jpeg", "image/png", "image/webp"];
  const MAX_IMAGES = 10;

  const getDataUrlSize = (dataUrl) => {
    if (!dataUrl) return 0;
    const marker = "base64,";
    const idx = dataUrl.indexOf(marker);
    if (idx === -1) return 0;
    const base64 = dataUrl.slice(idx + marker.length);
    const padding = base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0;
    return Math.max(0, Math.floor((base64.length * 3) / 4) - padding);
  };

  const validateImage = (file, callback) => {
    if (!file) return;

    if (!allowedFormats.includes(file.type)) {
      toast.error("❌ Alleen JPG, PNG of WEBP toegestaan.");
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
    let totalSize = images.reduce((sum, image) => sum + getDataUrlSize(image), 0);

    Array.from(files).forEach((file) => {
      if (totalSize + file.size > MAX_TOTAL_SIZE) {
        toast.error("❌ Totaal bestandsgrootte mag niet groter zijn dan 500 KB.");
        return;
      }
      if (newImages.length < MAX_IMAGES) {
        validateImage(file, (validFile) => {
          const reader = new FileReader();
          reader.onload = () => {
            newImages = [...newImages, reader.result];
            totalSize += validFile.size;
            setImageList(newImages);
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
    const updatedImages = images.filter((_, i) => i !== index);
    setImageList(updatedImages);
    toast.info("🗑️ Afbeelding verwijderd.");
  };

  const reorderImages = (fromIndex, toIndex) => {
    const newImages = [...images];
    const [movedImage] = newImages.splice(fromIndex, 1);
    newImages.splice(toIndex, 0, movedImage);
    setImageList(newImages);
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
