interface DropZoneOptions {
  accept?: string
}

interface MultiDropZoneOptions {
  accept?: string
}

function buildDropZone(accept: string, multiple: boolean): HTMLElement {
  const container = document.createElement('div')
  container.className = 'drop-zone'
  container.dataset.dropParent = 'true'

  const content = document.createElement('div')
  content.className = 'drop-zone-content'

  // File-type specific info
  const acceptInfo = accept.includes('.png')
    ? 'PNG, JPG, JPEG'
    : 'PDF'

  content.innerHTML = `
    <div class="dz-upload-icon">
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
      </svg>
    </div>
    <div class="dz-title">Solte arquivos aqui</div>
    <p class="dz-sub">ou clique para selecionar</p>
    <button class="dz-select-btn" type="button">Selecionar arquivos</button>
    <p class="dz-formats">Formatos aceitos: ${acceptInfo}</p>
  `

  if (multiple) {
    const btn = content.querySelector('.dz-select-btn') as HTMLElement
    if (btn) btn.textContent = 'Selecionar arquivos'
  }

  container.appendChild(content)

  // Hidden file input
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = accept
  if (multiple) input.setAttribute('multiple', '')
  input.style.display = 'none'
  container.appendChild(input)

  // Click on button triggers file input
  content.querySelector('.dz-select-btn')!.addEventListener('click', (e) => {
    e.stopPropagation()
    input.click()
  })

  // Click on content area triggers file input
  content.addEventListener('click', (e) => {
    if ((e.target as HTMLElement).closest('.dz-select-btn')) return
    input.click()
  })

  // Drag & drop on container
  container.addEventListener('dragover', (e) => {
    e.preventDefault()
    container.classList.add('dragover')
  })
  container.addEventListener('dragleave', (e) => {
    e.preventDefault()
    container.classList.remove('dragover')
  })
  container.addEventListener('drop', (e) => {
    e.preventDefault()
    container.classList.remove('dragover')
    const files = e.dataTransfer!.files
    if (files.length > 0) {
      dispatchEvent(container, multiple, files)
    }
  })

  // File input change
  input.addEventListener('change', () => {
    if (input.files && input.files.length > 0) {
      dispatchEvent(container, multiple, input.files)
      input.value = ''
    }
  })

  return container
}

function dispatchEvent(container: HTMLElement, multiple: boolean, files: FileList): void {
  if (multiple) {
    container.dispatchEvent(new CustomEvent('files-selected', {
      detail: { files: Array.from(files) }
    }))
  } else {
    container.dispatchEvent(new CustomEvent('file-selected', {
      detail: { file: files[0] }
    }))
  }
}

export function DropZone({ accept = '*/*' }: DropZoneOptions): HTMLElement {
  return buildDropZone(accept, false)
}

export function MultiDropZone({ accept = '*' }: MultiDropZoneOptions): HTMLElement {
  return buildDropZone(accept, true)
}

export function hideDropZone(dz: HTMLElement): void {
  dz.style.display = 'none'
}

export function showDropZone(dz: HTMLElement): void {
  dz.style.display = ''
}

export function removeDropZone(dz: HTMLElement): void {
  dz.remove()
}
