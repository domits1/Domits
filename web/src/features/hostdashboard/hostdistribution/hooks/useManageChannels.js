import {useState, useEffect} from 'react'
import useFetchChannels from './useFetchChannels'
import {fetchChannels} from '../services/fetchChannelsService.js'

const useManageChannels = userId => {
  const fetchedChannels = useFetchChannels(userId)
  const [channelData, setChannelData] = useState([])

  useEffect(() => {
    setChannelData(fetchedChannels)
  }, [fetchedChannels])

  const refreshChannels = async () => {
    const updatedChannels = await fetchChannels(userId)
    setChannelData(updatedChannels)
  }

  return {channelData, setChannelData, refreshChannels}
}

export default useManageChannels
