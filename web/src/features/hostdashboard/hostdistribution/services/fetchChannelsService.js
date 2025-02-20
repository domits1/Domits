export const fetchChannels = async userId => {
  try {
    const response = await fetch(
      'https://9uv5o7aiz6.execute-api.eu-north-1.amazonaws.com/dev/Host-ChannelManagement-Production-Read-AllChannels',
      {
        method: 'POST',
        body: JSON.stringify({UserId: userId}),
        headers: {'Content-type': 'application/json; charset=UTF-8'},
      },
    )
    if (!response.ok) throw new Error('Failed to fetch')
    const data = await response.json()
    return JSON.parse(data.body) || []
  } catch (error) {
    console.error('Failed to fetch channel data:', error)
    return []
  }
}
