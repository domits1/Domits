import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export default function usePhotos() {
  const [images, setImages] = useState(() => {
    const savedImages = sessionStorage.getItem("images");
    return savedImages ? JSON.parse(savedImages) : [];
  });

  const [isDragOver, setIsDragOver] = useState(false);

  const MIN_WIDTH = 500;
  const MIN_HEIGHT = 500;
  const MIN_SIZE = 50000;
  const allowedFormats = ["image/jpeg", "image/png", "image/webp"];
  const MAX_IMAGES = 5;

  useEffect(() => {
    sessionStorage.setItem("images", JSON.stringify(images));
  }, [images]);

  const validateImage = (file, callback) => {
    if (!file) return;

    console.log("validating file:", file);

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
        console.log("image validated:", file);
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

    console.log("files received:", files);

    let newImages = [...images];

    Array.from(files).forEach((file) => {
      if (newImages.length < MAX_IMAGES) {
        validateImage(file, (validFile) => {
          const reader = new FileReader();
          reader.onload = () => {
            newImages = [...newImages, reader.result];
            setImages(newImages);

            console.log("new images array:", newImages);

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

    console.log("deleting image at index:", index);

    setImages((prev) => {
      const updatedImages = prev.filter((_, i) => i !== index);

      console.log("updated images array after deletion:", updatedImages);

      return updatedImages;
    });
    toast.info("🗑️ Afbeelding verwijderd.");
  };

  const reorderImages = (fromIndex, toIndex) => {

    console.log("reordering images from:", fromIndex, "to:", toIndex);

    setImages((prev) => {
      const newImages = [...prev];
      const [movedImage] = newImages.splice(fromIndex, 1);
      newImages.splice(toIndex, 0, movedImage);

      console.log("updated images array after reordering:", newImages);

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
