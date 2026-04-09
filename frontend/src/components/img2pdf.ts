import { PDFDocument } from 'pdf-lib'
import { MultiDropZone, hideDropZone } from '../utils/dropzone'
import { showToast, downloadBlob } from '../utils/helpers'
import { setGlobalDropTarget } from '../utils/globalDropzone'

/** Convert any browser-supported image to a PNG ArrayBuffer for pdf-lib */
async function imageToPng(file: File): Promise<ArrayBuffer | null> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const c = document.createElement('canvas')
      c.width = img.naturalWidth
      c.height = img.naturalHeight
      c.getContext('2d')!.drawImage(img, 0, 0)
      c.toBlob((blob) => {
        if (!blob) { resolve(null); return }
        blob.arrayBuffer().then(resolve)
      }, 'image/png')
    }
    img.onerror = () => resolve(null)
    img.src = URL.createObjectURL(file)
  })
}

export function Img2PdfView(): HTMLElement {
  const container = document.createElement('div')

  // Header
  const header = document.createElement('div')
  header.className = 'tool-header tool-header-with-action'
  header.innerHTML = `
    <div class="tool-header-title"><h2>\ud83d\uddbc\ufe0f Imagens para PDF</h2></div>
    <p>Converta suas imagens para um arquivo PDF</p>
    <button class="finish-btn finish-btn-inline">Terminar</button>
  `
  container.appendChild(header)

  const finishBtn = header.querySelector('.finish-btn-inline') as HTMLButtonElement
  finishBtn.disabled = true

  const EXTENSIONS = '.png,.jpg,.jpeg,.webp,.gif,.bmp,.avif'

  const dz = MultiDropZone({ accept: EXTENSIONS })
  container.appendChild(dz)

  const pageGrid = document.createElement('div')
  pageGrid.className = 'page-grid'
  pageGrid.style.display = 'none'
  container.appendChild(pageGrid)

  // Hidden add input
  const addInput = document.createElement('input')
  addInput.type = 'file'
  addInput.accept = EXTENSIONS
  addInput.multiple = true
  addInput.style.display = 'none'
  container.appendChild(addInput)
  addInput.addEventListener('change', () => {
    if (addInput.files?.length) { addFiles(Array.from(addInput.files)); addInput.value = '' }
  })

  // Rename dialog
  const renameSection = document.createElement('div')
  renameSection.className = 'rename-section'
  renameSection.style.display = 'none'
  renameSection.innerHTML = `
    <h3>\ud83d\uddbc\ufe0f Nome do arquivo</h3><p>Escolha um nome para o PDF final</p>
    <input type="text" class="rename-input" placeholder="nome-do-arquivo" value="imagens" />
    <div class="rename-actions">
      <button class="btn btn-secondary cancel-rename">Cancelar</button>
      <button class="btn btn-primary confirm-rename">Salvar e Baixar</button>
    </div>
  `
  container.appendChild(renameSection)

  const renameInput = renameSection.querySelector('.rename-input') as HTMLInputElement
  const cancelBtn = renameSection.querySelector('.cancel-rename') as HTMLButtonElement
  const confirmBtn = renameSection.querySelector('.confirm-rename') as HTMLButtonElement

  let files: File[] = []
  let blobUrls: string[] = []

  dz.addEventListener('files-selected', ((e: Event) => {
    files = (e as CustomEvent).detail.files as File[]
    renderPreviews()
  }) as EventListener)

  setGlobalDropTarget('image', (dropped) => {
    for (const f of dropped) {
      if (!files.some(x => x.name === f.name && x.size === f.size)) files.push(f)
    }
    renderPreviews()
  })

  function addFiles(newFiles: File[]) {
    for (const f of newFiles) {
      if (!files.some(x => x.name === f.name && x.size === f.size)) files.push(f)
    }
    renderPreviews()
  }

  function renderPreviews() {
    pageGrid.innerHTML = ''

    // Revoke stale blob URLs from files that were removed
    for (let i = 0; i < blobUrls.length; i++) {
      URL.revokeObjectURL(blobUrls[i])
    }
    blobUrls = []

    if (files.length > 0) {
      hideDropZone(dz)
      pageGrid.style.display = ''
      const grid = document.createElement('div')
      grid.className = 'page-grid'
      pageGrid.appendChild(grid)

      for (let i = 0; i < files.length; i++) {
        createImgCard(i, grid)
      }

      // Add file card
      const addCard = document.createElement('div')
      addCard.className = 'add-file-card'
      addCard.innerHTML = `<span class="add-icon">+</span> Adicionar`
      addCard.addEventListener('click', () => addInput.click())
      grid.appendChild(addCard)

      finishBtn.disabled = false
    } else {
      pageGrid.style.display = 'none'
      dz.style.display = ''
      finishBtn.disabled = true
    }
  }

  function createImgCard(i: number, grid: HTMLElement) {
    const file = files[i]
    const card = document.createElement('div')
    card.className = 'page-card'

    const url = URL.createObjectURL(file)
    blobUrls.push(url)

    const thumb = document.createElement('div')
    thumb.className = 'page-thumb'
    const img = document.createElement('img')
    img.src = url
    thumb.appendChild(img)
    card.appendChild(thumb)

    // Badge
    const badge = document.createElement('div')
    badge.className = 'badge'
    badge.textContent = String(i + 1)
    card.appendChild(badge)

    // Action buttons
    const actions = document.createElement('div')
    actions.className = 'page-card-actions'

    // Zoom
    const zoomBtn = document.createElement('button')
    zoomBtn.className = 'page-icon-btn zoom'
    zoomBtn.title = 'Visualizar'
    zoomBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
    </svg>`
    zoomBtn.addEventListener('click', (e) => {
      e.stopPropagation()
      openZoom(i, img.cloneNode() as HTMLImageElement)
    })
    actions.appendChild(zoomBtn)

    // Remove
    const removeBtn = document.createElement('button')
    removeBtn.className = 'page-icon-btn remove'
    removeBtn.title = 'Remover'
    removeBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
    </svg>`
    removeBtn.addEventListener('click', (e) => {
      e.stopPropagation()
      files.splice(i, 1)
      renderPreviews()
    })
    actions.appendChild(removeBtn)

    card.appendChild(actions)

    // Footer
    const footer = document.createElement('div')
    footer.className = 'page-card-footer'
    footer.innerHTML = `<span class="page-card-label" title="${file.name}">${file.name.length > 16 ? file.name.slice(0, 13) + '...' : file.name}</span>`
    card.appendChild(footer)

    grid.appendChild(card)
  }

  function openZoom(_i: number, thumbImg: HTMLImageElement) {
    const overlay = document.createElement('div')
    overlay.className = 'zoom-modal-overlay'
    overlay.style.cursor = 'auto'
    overlay.innerHTML = `
      <button class="zoom-modal-close">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" style="width:24px;height:24px;">
          <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
        </svg>
      </button>
    `
    overlay.addEventListener('click', (ev) => { if (ev.target === overlay) overlay.remove() })
    overlay.querySelector('.zoom-modal-close')!.addEventListener('click', (ev) => { ev.stopPropagation(); overlay.remove() })
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') { overlay.remove(); document.removeEventListener('keydown', onKey) }
    }
    document.addEventListener('keydown', onKey)

    // Full resolution image
    const fullImg = document.createElement('img')
    fullImg.src = thumbImg.src
    fullImg.style.maxWidth = '90vw'
    fullImg.style.maxHeight = '90vh'
    fullImg.style.boxShadow = '0 4px 40px rgba(0,0,0,0.5)'
    fullImg.style.borderRadius = 'var(--radius-sm)'
    overlay.insertBefore(fullImg, overlay.querySelector('.zoom-modal-close'))

    document.body.appendChild(overlay)
  }

  // Finish flow
  finishBtn.addEventListener('click', () => {
    if (files.length === 0 || finishBtn.disabled) return
    header.style.display = 'none'
    pageGrid.style.display = 'none'
    dz.style.display = 'none'
    finishBtn.style.display = 'none'
    renameSection.style.display = 'flex'
    renameInput.focus(); renameInput.select()
  })

  cancelBtn.addEventListener('click', () => {
    renameSection.style.display = 'none'
    header.style.display = ''
    pageGrid.style.display = files.length > 0 ? '' : 'none'
    dz.style.display = files.length === 0 ? '' : 'none'
    finishBtn.style.display = ''
    finishBtn.disabled = files.length === 0
  })

  confirmBtn.addEventListener('click', doDownload)
  renameInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') doDownload()
    if (e.key === 'Escape') cancelBtn.click()
  })

  async function doDownload() {
    if (files.length === 0) return
    confirmBtn.disabled = true
    confirmBtn.textContent = 'Salvando...'

    try {
      const newDoc = await PDFDocument.create()
      for (const file of files) {
        let pageBuf: ArrayBuffer
        let isPngOrJpeg = file.type === 'image/png' || file.type === 'image/jpeg' || file.type === 'image/jpg'

        if (isPngOrJpeg) {
          pageBuf = await file.arrayBuffer()
        } else {
          const pngBuf = await imageToPng(file)
          if (!pngBuf) continue
          pageBuf = pngBuf
        }

        let image: any
        if (file.type === 'image/png') {
          image = await newDoc.embedPng(pageBuf)
        } else if (file.type === 'image/jpeg' || file.type === 'image/jpg') {
          image = await newDoc.embedJpg(pageBuf)
        } else {
          // Converted via canvas, so it's a PNG now
          image = await newDoc.embedPng(pageBuf)
        }
        const page = newDoc.addPage([image.width, image.height])
        page.drawImage(image, { x: 0, y: 0, width: image.width, height: image.height })
      }
      const pdfBytes = await newDoc.save()
      const filename = (renameInput.value.trim() || 'imagens').replace(/\.pdf$/i, '') + '.pdf'
      downloadBlob(new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' }), filename)
      showToast('PDF criado com sucesso!')
    } catch (err: any) {
      showToast(`Erro: ${err.message}`, true)
    }

    confirmBtn.disabled = false
    confirmBtn.textContent = 'Salvar e Baixar'
    renameSection.style.display = 'none'
    header.style.display = ''
    pageGrid.style.display = files.length > 0 ? '' : 'none'
    dz.style.display = files.length === 0 ? '' : 'none'
    finishBtn.style.display = ''
    finishBtn.disabled = files.length === 0
  }

  return container
}
