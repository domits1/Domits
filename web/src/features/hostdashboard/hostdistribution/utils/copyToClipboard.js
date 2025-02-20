export const copyToClipboard = text => {
  navigator.clipboard
    .writeText(text)
    .then(() => alert('The URL has been copied to your clipboard: ' + text))
    .catch(err => console.error('Could not copy text: ', err))
}
