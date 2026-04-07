import { PDFDocument } from 'pdf-lib'
import { DropZone, hideDropZone } from '../utils/dropzone'
import { showToast, downloadBlob } from '../utils/helpers'
import { setGlobalDropTarget } from '../utils/globalDropzone'

const PDFJS_LIB = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js'
const PDFJS_WORKER = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'

async function loadPdfJs(): Promise<void> {
  if ((window as any).pdfjsLib) return
  await loadScript(PDFJS_WORKER)
  await loadScript(PDFJS_LIB)
  const w = window as any
  w.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER
}

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script')
    s.src = src
    s.onload = () => resolve()
    s.onerror = () => reject(new Error(`Failed to load: ${src}`))
    document.head.appendChild(s)
  })
}

export function ExtractView(): HTMLElement {
  const container = document.createElement('div')

  // Header
  const header = document.createElement('div')
  header.className = 'tool-header tool-header-with-action'
  header.innerHTML = `
    <div class="tool-header-title"><h2>\u2702\ufe0f Extrair P\u00e1ginas</h2></div>
    <p>Selecione as p\u00e1ginas que deseja extrair</p>
  `
  container.appendChild(header)

  const finishBtn = document.createElement('button')
  finishBtn.className = 'finish-btn'
  finishBtn.textContent = 'Terminar'
  finishBtn.style.display = 'none'
  container.appendChild(finishBtn)

  const dz = DropZone({ accept: '.pdf' })
  container.appendChild(dz)

  const pageGrid = document.createElement('div')
  pageGrid.className = 'page-grid'
  pageGrid.style.display = 'none'
  container.appendChild(pageGrid)

  // Rename dialog
  const renameSection = document.createElement('div')
  renameSection.className = 'rename-section'
  renameSection.style.display = 'none'
  renameSection.innerHTML = `
    <h3>\ud83d\udcc4 Nome do arquivo</h3><p>Escolha um nome para o PDF final</p>
    <input type="text" class="rename-input" placeholder="nome-do-arquivo" value="extraido" />
    <div class="rename-actions">
      <button class="btn btn-secondary cancel-rename">Cancelar</button>
      <button class="btn btn-primary confirm-rename">Salvar e Baixar</button>
    </div>
  `
  container.appendChild(renameSection)

  const renameInput = renameSection.querySelector('.rename-input') as HTMLInputElement
  const cancelBtn = renameSection.querySelector('.cancel-rename') as HTMLButtonElement
  const confirmBtn = renameSection.querySelector('.confirm-rename') as HTMLButtonElement

  let srcBytes: Uint8Array | null = null
  let uploadedFile: File | null = null
  let selected = new Set<number>()

  dz.addEventListener('file-selected', ((e: Event) => {
    loadPdf((e as CustomEvent).detail.file as File)
  }) as EventListener)

  setGlobalDropTarget('pdf', (dropped) => {
    if (dropped.length > 0) loadPdf(dropped[0])
  })

  async function loadPdf(file: File) {
    uploadedFile = file
    selected = new Set()
    hideDropZone(dz)
    pageGrid.style.display = ''
    pageGrid.innerHTML = '<p style="text-align:center;color:var(--text-muted);padding:2rem;">Carregando p\u00e1ginas...</p>'

    const buf = await file.arrayBuffer()
    srcBytes = new Uint8Array(buf)

    const doc = await PDFDocument.load(srcBytes, { ignoreEncryption: true })
    const numPages = doc.getPageCount()

    await loadPdfJs()
    const pdfjs = (window as any).pdfjsLib
    const pdf = await pdfjs.getDocument({ data: srcBytes!.slice() }).promise

    pageGrid.innerHTML = ''
    const grid = document.createElement('div')
    grid.className = 'page-grid'
    pageGrid.appendChild(grid)

    for (let i = 1; i <= numPages; i++) {
      createPageCard(i - 1, i, grid, pdf)
    }

    updateFinish()
  }

  function createPageCard(idx: number, pageNum: number, grid: HTMLElement, pdf: any) {
    const card = document.createElement('div')
    card.className = 'page-card'
    card.dataset.idx = String(idx)

    // Thumbnail render at load time
    const thumb = document.createElement('div')
    thumb.className = 'page-thumb'
    const canvasEl = document.createElement('canvas')
    canvasEl.style.width = '100%'
    canvasEl.style.display = 'block'
    thumb.appendChild(canvasEl)
    card.appendChild(thumb)

    // Badge
    const badge = document.createElement('div')
    badge.className = 'badge'
    badge.textContent = String(pageNum)
    badge.style.display = 'none'
    card.appendChild(badge)

    // Action buttons
    const actions = document.createElement('div')
    actions.className = 'page-card-actions'

    const zoomBtn = document.createElement('button')
    zoomBtn.className = 'page-icon-btn zoom'
    zoomBtn.title = 'Visualizar'
    zoomBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
    </svg>`
    actions.appendChild(zoomBtn)

    card.appendChild(actions)

    // Footer
    const footer = document.createElement('div')
    footer.className = 'page-card-footer'
    footer.innerHTML = `<span class="page-card-label">P\u00e1g. ${pageNum}</span>`
    card.appendChild(footer)

    // Click card to select/deselect
    card.addEventListener('click', (e) => {
      if ((e.target as HTMLElement).closest('.page-icon-btn')) return
      toggleSelect()
    })

    function toggleSelect() {
      if (selected.has(idx)) {
        selected.delete(idx)
        card.classList.remove('selected')
        badge.style.display = 'none'
      } else {
        selected.add(idx)
        card.classList.add('selected')
        badge.style.display = 'block'
      }
      updateFinish()
    }

    // Zoom
    zoomBtn.addEventListener('click', (e) => {
      e.stopPropagation()
      openZoomFromPage(idx + 1, pdf)
    })

    // Render thumbnail
    pdf.getPage(pageNum).then((page: any) => {
      const viewport = page.getViewport({ scale: 0.4 })
      const dpr = window.devicePixelRatio || 1
      canvasEl.width = viewport.width * dpr
      canvasEl.height = viewport.height * dpr
      const ctx = canvasEl.getContext('2d')!
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      page.render({ canvasContext: ctx, viewport }).promise
    })

    grid.appendChild(card)
  }

  function openZoomFromPage(pageNum: number, pdf: any) {
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
    document.body.appendChild(overlay)

    pdf.getPage(pageNum).then((page: any) => {
      const viewport = page.getViewport({ scale: 1.5 })
      const fullCanvas = document.createElement('canvas')
      const dpr = window.devicePixelRatio || 1
      fullCanvas.width = viewport.width * dpr
      fullCanvas.height = viewport.height * dpr
      fullCanvas.style.maxWidth = '90vw'
      fullCanvas.style.maxHeight = '90vh'
      fullCanvas.style.width = 'auto'
      fullCanvas.style.height = 'auto'
      const ctx = fullCanvas.getContext('2d')!
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      page.render({ canvasContext: ctx, viewport }).promise.then(() => {
        overlay.insertBefore(fullCanvas, overlay.querySelector('.zoom-modal-close'))
      })
    })
  }

  function updateFinish() {
    finishBtn.style.display = selected.size > 0 ? 'inline-flex' : 'none'
  }

  // Finish flow
  finishBtn.addEventListener('click', () => {
    if (selected.size === 0) return
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
    pageGrid.style.display = ''
    dz.style.display = 'none'
    if (uploadedFile) finishBtn.style.display = 'inline-flex'
  })

  confirmBtn.addEventListener('click', doDownload)
  renameInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') doDownload()
    if (e.key === 'Escape') cancelBtn.click()
  })

  async function doDownload() {
    if (!srcBytes || selected.size === 0) return
    confirmBtn.disabled = true
    confirmBtn.textContent = 'Salvando...'

    try {
      const newDoc = await PDFDocument.create()
      const src = await PDFDocument.load(srcBytes, { ignoreEncryption: true })
      const pages = await newDoc.copyPages(src, [...selected])
      for (const page of pages) newDoc.addPage(page)
      const pdf = await newDoc.save()
      const filename = (renameInput.value.trim() || 'extraido').replace(/\.pdf$/i, '') + '.pdf'
      downloadBlob(new Blob([new Uint8Array(pdf)], { type: 'application/pdf' }), filename)
      showToast('PDF baixado com sucesso!')
    } catch (err: any) {
      showToast(`Erro: ${err.message}`, true)
    }

    confirmBtn.disabled = false
    confirmBtn.textContent = 'Salvar e Baixar'
    renameSection.style.display = 'none'
    header.style.display = ''
    pageGrid.style.display = ''
    dz.style.display = 'none'
    if (uploadedFile) finishBtn.style.display = 'inline-flex'
  }

  return container
}
