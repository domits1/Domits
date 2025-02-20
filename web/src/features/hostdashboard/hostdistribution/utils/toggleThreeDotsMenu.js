export const toggleThreeDotsMenu = (channelId, setActiveThreeDotsDropdown) => {
  setActiveThreeDotsDropdown(prev => (prev === channelId ? null : channelId))
}
