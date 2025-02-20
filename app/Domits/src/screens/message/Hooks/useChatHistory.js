import {Alert} from 'react-native'
import RNFS from 'react-native-fs'
import Share from 'react-native-share'

const useChatHistory = messages => {
  const saveChatHistory = async () => {
    try {
      const chatText = messages
        .map(
          message =>
            `${message.sender === 'bot' ? 'Bot' : 'User'}: ${message.text}`,
        )
        .join('\n\n')

      const path =
        Platform.OS === 'android'
          ? `${RNFS.DownloadDirectoryPath}/chat_history.txt` // Save to Downloads folder
          : `${RNFS.DocumentDirectoryPath}/chat_history.txt`

      await RNFS.writeFile(path, chatText, 'utf8')
      return path
    } catch (error) {
      // Alert.alert('Error', 'Failed to save chat history.');
      return null
    }
  }

  const downloadChatHistory = async () => {
    const path = await saveChatHistory()
    if (!path) return

    Alert.alert('Success', `Chat history saved to: ${path}`)
  }

  const shareChatHistory = async () => {
    const path = await saveChatHistory()
    if (!path) return

    try {
      await Share.open({
        url: `file://${path}`,
        type: 'text/plain',
        title: 'Chat History',
      })
    } catch (error) {
      // Alert.alert('Error', 'Failed to share chat history.');
    }
  }

  return {downloadChatHistory, shareChatHistory}
}

export default useChatHistory
