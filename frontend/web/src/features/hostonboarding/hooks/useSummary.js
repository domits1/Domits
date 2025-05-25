import useFormStoreHostOnboarding from "../stores/formStoreHostOnboarding"

export const useSummary = () => {
  const data = useFormStoreHostOnboarding((state) => state.accommodationDetails)
  const toggleDrafted = useFormStoreHostOnboarding(
    (state) => state.toggleDrafted,
  )
  return { data, toggleDrafted }
}
