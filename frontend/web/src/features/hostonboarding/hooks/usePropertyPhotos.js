import { useState } from "react";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import useFormStoreHostOnboarding from "../stores/formStoreHostOnboarding";

export default function usePhotos() {
  const images = useFormStoreHostOnboarding((state) => state.accommodationDetails.imageList);
  const setImageList = useFormStoreHostOnboarding((state) => state.setImageList);
  const [isDragOver, setIsDragOver] = useState(false);

  const MIN_WIDTH = 1024;
  const MIN_HEIGHT = 683;
  const MAX_PER_IMAGE = 5 * 1024 * 1024;
  const MAX_TOTAL_SIZE = 5 * 1024 * 1024 * 30;
  const allowedFormats = ["image/jpeg", "image/png", "image/webp"];
  const MAX_IMAGES = 30;

  const validateImage = (file, callback) => {
    if (!file) return;

    if (!allowedFormats.includes(file.type)) {
      toast.error("Alleen JPG, PNG of WEBP toegestaan.");
      return;
    }
    if (file.size > MAX_PER_IMAGE) {
      toast.error("Afbeelding mag maximaal 5 MB zijn.");
      return;
    }

    const img = new Image();
    img.src = URL.createObjectURL(file);
    img.onload = () => {
      if (img.width < MIN_WIDTH || img.height < MIN_HEIGHT) {
        toast.error(`Afbeelding moet minimaal ${MIN_WIDTH}x${MIN_HEIGHT} pixels zijn.`);
      } else {
        callback(file);
      }
    };
    img.onerror = () => {
      toast.error("Ongeldige afbeelding.");
    };
  };

  const handleFileChange = (files) => {
    if (images.length >= MAX_IMAGES) {
      toast.error(`Je kunt maximaal ${MAX_IMAGES} afbeeldingen uploaden.`);
      return;
    }

    let newImages = [...images];
    let totalSize = images.reduce((sum, image) => sum + (image?.size || 0), 0);

    Array.from(files).forEach((file) => {
      if (totalSize + file.size > MAX_TOTAL_SIZE) {
        toast.error("Totaal bestandsgrootte is te groot.");
        return;
      }
      if (newImages.length < MAX_IMAGES) {
        validateImage(file, (validFile) => {
          const reader = new FileReader();
          reader.onload = () => {
            newImages = [
              ...newImages,
              {
                preview: reader.result,
                file: validFile,
                size: validFile.size,
                contentType: validFile.type,
              },
            ];
            totalSize += validFile.size;
            setImageList(newImages);
            toast.success("Afbeelding toegevoegd.");
          };
          reader.readAsDataURL(validFile);
        });
      } else {
        toast.error(`Maximaal ${MAX_IMAGES} afbeeldingen toegestaan.`);
      }
    });
  };

  const deleteImage = (index) => {
    const updatedImages = images.filter((_, i) => i !== index);
    setImageList(updatedImages);
    toast.info("Afbeelding verwijderd.");
  };

  const reorderImages = (fromIndex, toIndex) => {
    const newImages = [...images];
    const [movedImage] = newImages.splice(fromIndex, 1);
    newImages.splice(toIndex, 0, movedImage);
    setImageList(newImages);
    toast.info("Afbeeldingen opnieuw gerangschikt.");
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
