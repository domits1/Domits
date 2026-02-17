import useFormStoreHostOnboarding from "../stores/formStoreHostOnboarding"

export const useSummary = () => {
  const data = useFormStoreHostOnboarding((state) => state.accommodationDetails)
  return { data }
}
