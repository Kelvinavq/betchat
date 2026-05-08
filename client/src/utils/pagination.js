const range = (start, end) => {
  if (end < start) return []
  return Array.from({ length: end - start + 1 }, (_, index) => start + index)
}

export const getPaginationItems = ({
  currentPage = 1,
  totalPages = 1,
  siblingCount = 1,
  boundaryCount = 1,
} = {}) => {
  const total = Math.max(1, Number(totalPages) || 1)
  const current = Math.min(Math.max(1, Number(currentPage) || 1), total)
  const visibleSlots = boundaryCount * 2 + siblingCount * 2 + 3

  if (total <= visibleSlots + 2) {
    return range(1, total).map(page => ({ type: 'page', page, key: `page-${page}` }))
  }

  const startPages = range(1, Math.min(boundaryCount, total))
  const endPages = range(Math.max(total - boundaryCount + 1, boundaryCount + 1), total)
  const siblingsStart = Math.max(
    Math.min(current - siblingCount, total - boundaryCount - siblingCount * 2 - 1),
    boundaryCount + 2
  )
  const siblingsEnd = Math.min(
    Math.max(current + siblingCount, boundaryCount + siblingCount * 2 + 2),
    endPages[0] - 2
  )

  const items = [
    ...startPages.map(page => ({ type: 'page', page, key: `page-${page}` })),
  ]

  if (siblingsStart > boundaryCount + 2) {
    items.push({ type: 'ellipsis', key: 'ellipsis-start' })
  } else if (boundaryCount + 1 < endPages[0]) {
    items.push({ type: 'page', page: boundaryCount + 1, key: `page-${boundaryCount + 1}` })
  }

  items.push(...range(siblingsStart, siblingsEnd).map(page => ({ type: 'page', page, key: `page-${page}` })))

  if (siblingsEnd < endPages[0] - 2) {
    items.push({ type: 'ellipsis', key: 'ellipsis-end' })
  } else if (endPages[0] - 1 > boundaryCount) {
    items.push({ type: 'page', page: endPages[0] - 1, key: `page-${endPages[0] - 1}` })
  }

  items.push(...endPages.map(page => ({ type: 'page', page, key: `page-${page}` })))

  return items
}
