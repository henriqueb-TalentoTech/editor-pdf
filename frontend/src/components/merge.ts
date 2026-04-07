import { PDFDocument } from 'pdf-lib'
import { MultiDropZone, hideDropZone } from '../utils/dropzone'
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

interface MergePage {
  file: Uint8Array
  pageIndex: number // 0-based
  fileName: string
  pageNum: number    // 1-based display
}

export function MergeView(): HTMLElement {
  const container = document.createElement('div')

  // Header
  const header = document.createElement('div')
  header.className = 'tool-header tool-header-with-action'
  header.innerHTML = `
    <div class="tool-header-title"><h2>\ud83d\udd17 Juntar PDFs</h2></div>
    <p>Una v\u00e1rios PDFs em um \u00fanico arquivo</p>
  `
  container.appendChild(header)

  const finishBtn = document.createElement('button')
  finishBtn.className = 'finish-btn'
  finishBtn.textContent = 'Terminar'
  finishBtn.style.display = 'none'
  container.appendChild(finishBtn)

  const dz = MultiDropZone({ accept: '.pdf' })
  container.appendChild(dz)

  const pageGrid = document.createElement('div')
  pageGrid.className = 'page-grid'
  pageGrid.style.display = 'none'
  container.appendChild(pageGrid)

  // Add file input
  const addInput = document.createElement('input')
  addInput.type = 'file'
  addInput.accept = '.pdf'
  addInput.multiple = true
  addInput.style.display = 'none'
  container.appendChild(addInput)
  addInput.addEventListener('change', () => {
    if (addInput.files?.length) {
      loadFiles(Array.from(addInput.files))
      addInput.value = ''
    }
  })

  // Rename dialog
  const renameSection = document.createElement('div')
  renameSection.className = 'rename-section'
  renameSection.style.display = 'none'
  renameSection.innerHTML = `
    <h3>\ud83d\udcc4 Nome do arquivo</h3><p>Escolha um nome para o PDF final</p>
    <input type="text" class="rename-input" placeholder="nome-do-arquivo" value="unificado" />
    <div class="rename-actions">
      <button class="btn btn-secondary cancel-rename">Cancelar</button>
      <button class="btn btn-primary confirm-rename">Salvar e Baixar</button>
    </div>
  `
  container.appendChild(renameSection)

  const renameInput = renameSection.querySelector('.rename-input') as HTMLInputElement
  const cancelBtn = renameSection.querySelector('.cancel-rename') as HTMLButtonElement
  const confirmBtn = renameSection.querySelector('.confirm-rename') as HTMLButtonElement

  let pages: MergePage[] = []
  let dragIdx: number | null = null

  dz.addEventListener('files-selected', ((e: Event) => {
    loadFiles((e as CustomEvent).detail.files as File[])
  }) as EventListener)

  dz.addEventListener('file-selected', ((e: Event) => {
    loadFiles([(e as CustomEvent).detail.file as File])
  }) as EventListener)

  setGlobalDropTarget('pdf', (dropped) => {
    loadFiles(dropped)
  })

  async function loadFiles(files: File[]) {
    hideDropZone(dz)
    pageGrid.style.display = ''
    pageGrid.innerHTML = '<p style="text-align:center;color:var(--text-muted);padding:2rem;">Carregando p\u00e1ginas...</p>'

    await loadPdfJs()

    for (const file of files) {
      const buf = await file.arrayBuffer()
      const data = new Uint8Array(buf)
      const doc = await PDFDocument.load(data, { ignoreEncryption: true })
      const numPages = doc.getPageCount()

      for (let i = 0; i < numPages; i++) {
        pages.push({ file: data, pageIndex: i, fileName: file.name, pageNum: i + 1 })
      }
    }

    renderGrid()
  }

  function renderGrid() {
    pageGrid.innerHTML = ''

    if (pages.length === 0) {
      pageGrid.style.display = 'none'
      dz.style.display = ''
      finishBtn.style.display = 'none'
      return
    }

    hideDropZone(dz)
    pageGrid.style.display = ''

    const grid = document.createElement('div')
    grid.className = 'page-grid'
    pageGrid.appendChild(grid)

    // Render each page as a thumbnail card
    for (let i = 0; i < pages.length; i++) {
      createPageCard(i, grid)
    }

    // Add file card
    const addCard = document.createElement('div')
    addCard.className = 'add-file-card'
    addCard.innerHTML = `<span class="add-icon">+</span> Adicionar`
    addCard.addEventListener('click', () => addInput.click())
    grid.appendChild(addCard)

    finishBtn.style.display = 'inline-flex'
  }

  function createPageCard(idx: number, grid: HTMLElement) {
    const p = pages[idx]
    const card = document.createElement('div')
    card.className = 'page-card'
    card.draggable = true
    card.dataset.idx = String(idx)

    // Thumbnail
    const thumb = document.createElement('div')
    thumb.className = 'page-thumb'

    const canvasEl = document.createElement('canvas')
    canvasEl.style.width = '100%'
    canvasEl.style.display = 'block'
    thumb.appendChild(canvasEl)
    card.appendChild(thumb)

    // Render thumbnail asynchronously
    const pdfjs = (window as any).pdfjsLib
    pdfjs.getDocument({ data: p.file.slice() }).promise.then((pdf: any) => {
      return pdf.getPage(p.pageIndex + 1).then((page: any) => {
        const viewport = page.getViewport({ scale: 0.31 })
        const dpr = window.devicePixelRatio || 1
        canvasEl.width = viewport.width * dpr
        canvasEl.height = viewport.height * dpr
        const ctx = canvasEl.getContext('2d')!
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
        page.render({ canvasContext: ctx, viewport }).promise
      })
    })

    // Badge
    const badge = document.createElement('div')
    badge.className = 'badge'
    badge.textContent = String(idx + 1)
    card.appendChild(badge)

    // Action buttons (X + Zoom)
    const actions = document.createElement('div')
    actions.className = 'page-card-actions'

    // Zoom button
    const zoomBtn = document.createElement('button')
    zoomBtn.className = 'page-icon-btn zoom'
    zoomBtn.title = 'Visualizar'
    zoomBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
    </svg>`
    actions.appendChild(zoomBtn)

    // Remove button
    const removeBtn = document.createElement('button')
    removeBtn.className = 'page-icon-btn remove'
    removeBtn.title = 'Remover'
    removeBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
    </svg>`
    actions.appendChild(removeBtn)

    card.appendChild(actions)

    // Footer
    const footer = document.createElement('div')
    footer.className = 'page-card-footer'
    footer.innerHTML = `<span class="page-card-label" title="${p.fileName} - P\u00e1gina ${p.pageNum}">P\u00e1g. ${p.pageNum}</span>`
    card.appendChild(footer)

    // Zoom handler - render a fresh high-quality version
    zoomBtn.addEventListener('click', (e) => {
      e.stopPropagation()
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

      // Append overlay immediately so it's in DOM
      document.body.appendChild(overlay)

      // Then render the page at full quality
      const pdfjs = (window as any).pdfjsLib
      pdfjs.getDocument({ data: p.file.slice() }).promise.then((pdf: any) => {
        return pdf.getPage(p.pageIndex + 1).then((page: any) => {
          const viewport = page.getViewport({ scale: 1.5 })
          const fullCanvas = document.createElement('canvas')
          const dpr = window.devicePixelRatio || 1
          fullCanvas.width = viewport.width * dpr
          fullCanvas.height = viewport.height * dpr
          fullCanvas.style.maxWidth = '90vw'
          fullCanvas.style.maxHeight = '90vh'
          fullCanvas.style.width = 'auto'
          fullCanvas.style.height = 'auto'
          fullCanvas.style.borderRadius = 'var(--radius-sm)'
          fullCanvas.style.boxShadow = '0 4px 40px rgba(0,0,0,0.5)'
          const ctx = fullCanvas.getContext('2d')!
          ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
          page.render({ canvasContext: ctx, viewport }).promise.then(() => {
            overlay.insertBefore(fullCanvas, overlay.querySelector('.zoom-modal-close'))
          })
        })
      })
    })

    removeBtn.addEventListener('click', (e) => {
      e.stopPropagation()
      pages.splice(idx, 1)
      renderGrid()
    })

    // Drag and drop for reordering
    card.addEventListener('dragstart', (e) => {
      dragIdx = idx
      card.classList.add('dragging')
      e.dataTransfer!.effectAllowed = 'move'
    })
    card.addEventListener('dragend', () => {
      card.classList.remove('dragging')
      dragIdx = null
      grid.querySelectorAll('.drop-placeholder').forEach(p => p.remove())
    })
    card.addEventListener('dragover', (e) => {
      e.preventDefault()
      e.dataTransfer!.dropEffect = 'move'
      const targetIdx = Number(card.dataset.idx)
      if (dragIdx !== null && dragIdx !== targetIdx) {
        // Show placeholder
        grid.querySelectorAll('.drop-placeholder').forEach(p => p.remove())
        const ph = document.createElement('div')
        ph.className = 'drop-placeholder'
        if (targetIdx > dragIdx) {
          card.after(ph)
        } else {
          card.before(ph)
        }
      }
    })
    card.addEventListener('drop', (e) => {
      e.preventDefault()
      e.stopPropagation()
      if (dragIdx === null) return
      const targetIdx = Number(card.dataset.idx)
      if (dragIdx !== targetIdx) {
        const [moved] = pages.splice(dragIdx, 1)
        const pageToInsert = pages[targetIdx > dragIdx ? targetIdx - 1 : targetIdx]
        const newIdx = pages.indexOf(pageToInsert)
        pages.splice(newIdx >= 0 ? (targetIdx > dragIdx ? newIdx + 1 : newIdx) : 0, 0, moved)
        renderGrid()
      }
    })

    grid.appendChild(card)
  }

  // Finish flow
  finishBtn.addEventListener('click', () => {
    if (pages.length === 0) return
    header.style.display = 'none'
    pageGrid.style.display = 'none'
    dz.style.display = 'none'
    finishBtn.style.display = 'none'
    renameSection.style.display = 'flex'
    renameInput.focus()
    renameInput.select()
  })

  cancelBtn.addEventListener('click', () => {
    renameSection.style.display = 'none'
    header.style.display = ''
    pageGrid.style.display = pages.length > 0 ? '' : 'none'
    dz.style.display = pages.length === 0 ? '' : 'none'
    if (pages.length > 0) finishBtn.style.display = 'inline-flex'
  })

  confirmBtn.addEventListener('click', doDownload)
  renameInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') doDownload()
    if (e.key === 'Escape') cancelBtn.click()
  })

  async function doDownload() {
    if (pages.length === 0) return
    confirmBtn.disabled = true
    confirmBtn.textContent = 'Salvando...'

    try {
      const mergedDoc = await PDFDocument.create()
      // Group by file since we need to load each once
      const seenFiles = new Map<Uint8Array, PDFDocument>()
      for (const page of pages) {
        if (!seenFiles.has(page.file)) {
          const doc = await PDFDocument.load(page.file, { ignoreEncryption: true })
          seenFiles.set(page.file, doc)
        }
        const srcDoc = seenFiles.get(page.file)!
        const [copied] = await mergedDoc.copyPages(srcDoc, [page.pageIndex])
        mergedDoc.addPage(copied)
      }

      const pdfBytes = await mergedDoc.save()
      const filename = (renameInput.value.trim() || 'unificado').replace(/\.pdf$/i, '') + '.pdf'
      downloadBlob(new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' }), filename)
      showToast('PDF unificado baixado!')
    } catch (err: any) {
      showToast(`Erro: ${err.message}`, true)
    }

    confirmBtn.disabled = false
    confirmBtn.textContent = 'Salvar e Baixar'
    renameSection.style.display = 'none'
    header.style.display = ''
    pageGrid.style.display = pages.length > 0 ? '' : 'none'
    dz.style.display = pages.length === 0 ? '' : 'none'
    if (pages.length > 0) finishBtn.style.display = 'inline-flex'
  }

  return container
}
