export const handlePageRange = (channelLength, itemsPerPage, currentPannel) => {
  const totalPages = Math.ceil(channelLength / itemsPerPage)
  let startPage = currentPannel - 2

  if (startPage < 1) {
    startPage = 1
  }

  let endPage = startPage + 4
  if (endPage > totalPages) {
    endPage = totalPages
    startPage = Math.max(endPage - 4, 1)
  }

  return {startPage, endPage}
}
