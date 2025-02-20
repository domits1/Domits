export const handleAddChannelService = async (
  userId,
  selectedChannel,
  apiKey,
) => {
  if (selectedChannel === 'Select Channel' || apiKey.trim() === '') {
    alert('Please fill in all fields')
    return {success: false}
  }

  let id = crypto.randomUUID() // Using native UUID generator
  let ListedAccommodations = []
  let Status = false

  try {
    const response = await fetch(
      'https://9uv5o7aiz6.execute-api.eu-north-1.amazonaws.com/dev/Host-ChannelManagement-Production-Create-Channel',
      {
        method: 'POST',
        body: JSON.stringify({
          id,
          ChannelName: selectedChannel,
          APIKey: apiKey,
          UserId: userId,
          ListedAccommodations,
          Status,
        }),
        headers: {
          'Content-type': 'application/json; charset=UTF-8',
        },
      },
    )

    const data = await response.json()

    if (data.statusCode === 200) {
      return {success: true}
    } else {
      return {success: false, error: 'Failed to add channel'}
    }
  } catch (error) {
    console.error('Failed to add channel:', error)
    return {success: false, error}
  }
}
