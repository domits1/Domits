import useFormStore from "../stores/formStore";

export const usePricing = () => {
  const pricing = useFormStore((state) => state.accommodationDetails);
  const updatePricing = useFormStore((state) => state.updatePricing);
  const calculateServiceFee = useFormStore((state) => state.calculateServiceFee);

  return { pricing, updatePricing, calculateServiceFee };
};
