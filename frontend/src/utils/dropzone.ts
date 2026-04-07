function createDropZoneElement(accept: string): HTMLElement {
  const dz = document.createElement('div')
  dz.className = 'drop-zone'
  dz.innerHTML = `
    <span class="dz-icon">📁</span>
    <div class="dz-title">Arraste e solte aqui</div>
    <p class="dz-sub">ou clique para selecionar</p>
  `
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = accept
  input.style.cssText = 'position:absolute;inset:0;opacity:0;cursor:pointer;'
  dz.appendChild(input)
  return dz
}

interface DropZoneOptions {
  label?: string
  accept?: string
}

interface MultiDropZoneOptions {
  accept?: string
}

export function DropZone({ accept = '*/*' }: DropZoneOptions): HTMLElement {
  const container = document.createElement('div')
  const dz = createDropZoneElement(accept)
  container.appendChild(dz)

  dz.addEventListener('dragover', (e) => { e.preventDefault(); dz.classList.add('dragover'); })
  dz.addEventListener('dragleave', () => dz.classList.remove('dragover'))
  dz.addEventListener('drop', (e) => {
    e.preventDefault()
    dz.classList.remove('dragover')
    const files = e.dataTransfer!.files
    if (files.length > 0) {
      container.dispatchEvent(new CustomEvent('file-selected', { detail: { file: files[0] } }))
    }
  })

  dz.querySelector('input')?.addEventListener('change', (e) => {
    const files = (e.target as HTMLInputElement).files
    if (files && files.length > 0) {
      container.dispatchEvent(new CustomEvent('file-selected', { detail: { file: files[0] } }))
    }
  })

  return container
}

export function MultiDropZone({ accept = '*' }: MultiDropZoneOptions): HTMLElement {
  const container = document.createElement('div')
  const dz = createDropZoneElement(accept)
  dz.querySelector('input')?.setAttribute('multiple', '')
  const sub = dz.querySelector('.dz-sub')
  if (sub) sub.textContent = 'ou clique para selecionar (vários)'
  container.appendChild(dz)

  dz.addEventListener('dragover', (e) => { e.preventDefault(); dz.classList.add('dragover'); })
  dz.addEventListener('dragleave', () => dz.classList.remove('dragover'))
  dz.addEventListener('drop', (e) => {
    e.preventDefault()
    dz.classList.remove('dragover')
    const files = e.dataTransfer!.files
    if (files.length > 0) {
      container.dispatchEvent(new CustomEvent('files-selected', { detail: { files: Array.from(files) } }))
    }
  })

  dz.querySelector('input')?.addEventListener('change', (e) => {
    const files = (e.target as HTMLInputElement).files
    if (files && files.length > 0) {
      container.dispatchEvent(new CustomEvent('files-selected', { detail: { files: Array.from(files) } }))
    }
  })

  return container
}
