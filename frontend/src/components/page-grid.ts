interface PageGridOptions {
  images: string[]
  onRotate: (idx: number) => void
  angleOverrides?: Record<number, number>
}

export function PageGrid({ images, onRotate, angleOverrides = {} }: PageGridOptions): HTMLElement {
  const grid = document.createElement('div')
  grid.className = 'page-grid'

  for (let i = 0; i < images.length; i++) {
    const card = document.createElement('div')
    card.className = 'page-card'
    card.style.position = 'relative'

    const angle = angleOverrides[i] || 0
    if (angle) {
      card.style.transition = 'transform 0.3s'
    }

    // Page number badge
    const badge = document.createElement('div')
    badge.className = 'badge'
    badge.textContent = String(i + 1)
    card.appendChild(badge)

    // Canvas or image
    if (images[i]) {
      const img = document.createElement('img')
      img.src = images[i]
      if (angle) img.style.transform = `rotate(${angle}deg)`
      card.appendChild(img)
    }

    // Actions
    const actions = document.createElement('div')
    actions.className = 'page-actions'

    const rotBtn = document.createElement('button')
    rotBtn.className = 'btn btn-secondary'
    rotBtn.style.fontSize = '13px'
    rotBtn.style.padding = '6px 16px'
    rotBtn.textContent = '\ud83d\udd04 Girar'
    rotBtn.addEventListener('click', () => onRotate(i))
    actions.appendChild(rotBtn)
    card.appendChild(actions)

    grid.appendChild(card)
  }

  return grid
}
