/** Open a fullscreen zoom modal. Call renderToBody(overlay) to add content. */
export function openZoomModal(renderToBody: (overlay: HTMLElement) => void): void {
  const overlay = document.createElement('div')
  overlay.className = 'zoom-modal-overlay'
  overlay.style.cursor = 'auto' // so clicks on canvas don't close

  overlay.innerHTML = `
    <button class="zoom-modal-close">
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" style="width:24px;height:24px;">
        <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
      </svg>
    </button>
  `
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.remove()
  })

  // Close button handler
  overlay.querySelector('.zoom-modal-close')!.addEventListener('click', (e) => {
    e.stopPropagation()
    overlay.remove()
  })

  // ESC key
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      overlay.remove()
      document.removeEventListener('keydown', onKey)
    }
  }
  document.addEventListener('keydown', onKey)

  // Render content INTO the overlay (before appending to body)
  renderToBody(overlay)

  // Now append overlay so everything is visible
  document.body.appendChild(overlay)
}
