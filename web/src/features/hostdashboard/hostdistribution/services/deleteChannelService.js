export const deleteChannelService = async (
  channelId,
  setChannelData,
  setCurrentPannel,
  setActiveThreeDotsDropdown,
) => {
  if (!window.confirm('Are you sure you want to delete this channel?')) return

  try {
    const response = await fetch(
      'https://9uv5o7aiz6.execute-api.eu-north-1.amazonaws.com/dev/Host-ChannelManagement-Production-Delete-Channel',
      {
        method: 'DELETE',
        body: JSON.stringify({
          id: channelId,
        }),
        headers: {
          'Content-type': 'application/json; charset=UTF-8',
        },
      },
    )

    const data = await response.json()

    if (data.statusCode === 200) {
      alert('Channel deleted successfully')
      setChannelData(prevData =>
        prevData.filter(channel => channel.id.S !== channelId),
      )
      setCurrentPannel(1)
      setActiveThreeDotsDropdown(null)
    } else {
      alert('Failed to delete channel')
    }
  } catch (error) {
    console.error('Failed to delete channel:', error)
  }
}
