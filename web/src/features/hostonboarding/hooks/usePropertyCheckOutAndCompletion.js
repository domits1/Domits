import useFormStore from "../stores/formStore";
import { shallow } from 'zustand/shallow';

export const useSummary = () => {
  const data = useFormStore(
      (state) => state.accommodationDetails,
      shallow
  );

  const toggleDrafted = useFormStore((state) => state.toggleDrafted);

  return { data, toggleDrafted };
};