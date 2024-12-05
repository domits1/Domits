import useFormStore from "../stores/formStore";

export const usePhotos = () => {
  const images = useFormStore((state) => state.accommodationDetails.images);
  const updateImage = useFormStore((state) => state.updateImage);
  const deleteImage = useFormStore((state) => state.deleteImage);

  const handleFileChange = (file, index) => {
    const fileURL = URL.createObjectURL(file);
    updateImage(index, fileURL);
  };

  return { images, handleFileChange, deleteImage };
};
