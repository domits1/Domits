import useFormStore from '../stores/formStore'

export const useSummary = () => {
  const data = useFormStore(state => state.accommodationDetails)
  const toggleDrafted = useFormStore(state => state.toggleDrafted)
  return {data, toggleDrafted}
}
