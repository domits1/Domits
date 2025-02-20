export const toggleChannelManageMenu = (
  channelId,
  activeManageDropdown,
  setActiveManageDropdown,
  setDropdownAddChannelsVisible,
  setActiveThreeDotsDropdown,
  setActiveAddAccommodationsView,
  setActiveRemoveAccommodationsView,
) => {
  if (activeManageDropdown === channelId) {
    setActiveManageDropdown(null)
    setDropdownAddChannelsVisible(false)
    setActiveThreeDotsDropdown(null)
    setActiveAddAccommodationsView(null)
    setActiveRemoveAccommodationsView(null)
  } else {
    setActiveManageDropdown(channelId)
    setDropdownAddChannelsVisible(false)
    setActiveThreeDotsDropdown(null)
    setActiveAddAccommodationsView(null)
    setActiveRemoveAccommodationsView(null)
  }
}
