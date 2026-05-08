const ALLOWED_TAGS = new Set(['B', 'STRONG', 'I', 'EM', 'S', 'STRIKE', 'BR', 'P', 'DIV', 'SPAN', 'UL', 'OL', 'LI'])

export const htmlToPlainText = (html = '') => {
  if (typeof window === 'undefined' || !html) return String(html || '').replace(/<[^>]*>/g, ' ')
  const wrapper = document.createElement('div')
  wrapper.innerHTML = String(html)
  return (wrapper.textContent || wrapper.innerText || '').replace(/\s+/g, ' ').trim()
}

export const hasRichText = (value = '') => /<\/?[a-z][\s\S]*>/i.test(String(value || ''))

export const sanitizeRichHtml = (html = '') => {
  if (typeof window === 'undefined') return ''
  const template = document.createElement('template')
  template.innerHTML = String(html || '')

  const cleanNode = (node) => {
    if (node.nodeType === Node.TEXT_NODE) return node.cloneNode()
    if (node.nodeType !== Node.ELEMENT_NODE) return document.createTextNode('')

    if (!ALLOWED_TAGS.has(node.tagName)) {
      const fragment = document.createDocumentFragment()
      node.childNodes.forEach(child => fragment.appendChild(cleanNode(child)))
      return fragment
    }

    const clone = document.createElement(node.tagName.toLowerCase())
    node.childNodes.forEach(child => clone.appendChild(cleanNode(child)))
    return clone
  }

  const fragment = document.createDocumentFragment()
  template.content.childNodes.forEach(node => fragment.appendChild(cleanNode(node)))
  const wrapper = document.createElement('div')
  wrapper.appendChild(fragment)
  return wrapper.innerHTML
}
