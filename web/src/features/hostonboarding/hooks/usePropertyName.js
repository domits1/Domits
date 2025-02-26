import useFormStore from "../stores/formStore";

export const useAccommodationTitle = () => {
  const title = useFormStore((state) => state.accommodationDetails.title);
  const subtitle = useFormStore((state) => state.accommodationDetails.subtitle);
  const updateAccommodationDetail = useFormStore(
    (state) => state.updateAccommodationDetail
  );

  const handleInputChange = (key, value) => {
    updateAccommodationDetail(key, value);
  };

  return { title, subtitle, handleInputChange };
};