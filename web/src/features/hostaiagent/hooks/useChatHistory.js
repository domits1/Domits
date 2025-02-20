const useChatHistory = messages => {
  const downloadChatHistory = () => {
    const chatText = messages
      .map(
        message =>
          `${message.sender === 'bot' ? 'Bot' : 'User'}: ${message.text}`,
      )
      .join('\n\n')
    const blob = new Blob([chatText], {type: 'text/plain'})
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'chat_history.txt'
    link.click()
    URL.revokeObjectURL(url)
  }

  const printChatHistory = () => {
    const printableContent = messages
      .map(
        message =>
          `<p><strong>${message.sender === 'bot' ? 'Bot' : 'User'}:</strong> ${message.text}</p>`,
      )
      .join('')
    const newWindow = window.open('', '', 'width=600,height=400')
    newWindow.document.write(`
      <html>
        <head>
          <title>Chat History</title>
        </head>
        <body>
          <h2>Chat History</h2>
          ${printableContent}
        </body>
      </html>
    `)
    newWindow.document.close()
    newWindow.print()
  }

  return {downloadChatHistory, printChatHistory}
}

export default useChatHistory
