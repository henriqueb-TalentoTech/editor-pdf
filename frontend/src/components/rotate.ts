import { PDFDocument, degrees } from 'pdf-lib'
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

export function RotateView(): HTMLElement {
  const container = document.createElement('div')

  // Header
  const header = document.createElement('div')
  header.className = 'tool-header tool-header-with-action'
  header.innerHTML = `
    <div class="tool-header-title"><h2>\ud83d\udd04 Rotacionar</h2></div>
    <p>Gire as p\u00e1ginas do seu PDF</p>
    <button class="finish-btn finish-btn-inline">Terminar</button>
  `
  container.appendChild(header)

  const finishBtn = header.querySelector('.finish-btn-inline') as HTMLButtonElement
  finishBtn.disabled = true

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
    <h3>\ud83d\udd04 Nome do arquivo</h3><p>Escolha um nome para o PDF final</p>
    <input type="text" class="rename-input" placeholder="nome-do-arquivo" value="rotacionado" />
    <div class="rename-actions">
      <button class="btn btn-secondary cancel-rename">Cancelar</button>
      <button class="btn btn-primary confirm-rename">Salvar e Baixar</button>
    </div>
  `
  container.appendChild(renameSection)

  const renameInput = renameSection.querySelector('.rename-input') as HTMLInputElement
  const cancelBtn = renameSection.querySelector('.cancel-rename') as HTMLButtonElement
  const confirmBtn = renameSection.querySelector('.confirm-rename') as HTMLButtonElement

  let angles: number[] = []
  let canvasElements: HTMLCanvasElement[] = []
  let pdfData: Uint8Array | null = null

  dz.addEventListener('file-selected', ((e: Event) => {
    loadPdf((e as CustomEvent).detail.file as File)
  }) as EventListener)

  setGlobalDropTarget('pdf', (dropped) => {
    if (dropped.length > 0) loadPdf(dropped[0])
  })

  async function loadPdf(file: File) {
    angles = []
    canvasElements = []
    hideDropZone(dz)
    pageGrid.style.display = ''
    pageGrid.innerHTML = '<p style="text-align:center;color:var(--text-muted);padding:2rem;">Carregando p\u00e1ginas...</p>'

    const buf = await file.arrayBuffer()
    pdfData = new Uint8Array(buf)

    const doc = await PDFDocument.load(pdfData, { ignoreEncryption: true })
    const numPages = doc.getPageCount()

    await loadPdfJs()
    const pdfjs = (window as any).pdfjsLib
    const pdf = await pdfjs.getDocument({ data: pdfData!.slice() }).promise

    pageGrid.innerHTML = ''
    const grid = document.createElement('div')
    grid.className = 'page-grid'
    pageGrid.appendChild(grid)

    for (let i = 0; i < numPages; i++) {
      createPageCard(i, grid, pdf)
    }

    updateFinish()
  }

  function createPageCard(idx: number, grid: HTMLElement, pdf: any) {
    angles.push(0)

    const card = document.createElement('div')
    card.className = 'page-card'

    // Thumbnail
    const thumb = document.createElement('div')
    thumb.className = 'page-thumb'

    const canvasEl = document.createElement('canvas')
    canvasEl.style.width = '100%'
    canvasEl.style.display = 'block'
    canvasElements.push(canvasEl)
    thumb.appendChild(canvasEl)
    card.appendChild(thumb)

    // Badge
    const badge = document.createElement('div')
    badge.className = 'badge'
    badge.textContent = String(idx + 1)
    card.appendChild(badge)

    // Action buttons (Zoom only, X would reset rotation)
    const actions = document.createElement('div')
    actions.className = 'page-card-actions'

    const zoomBtn = document.createElement('button')
    zoomBtn.className = 'page-icon-btn zoom'
    zoomBtn.title = 'Visualizar'
    zoomBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
    </svg>`
    actions.appendChild(zoomBtn)

    // Rotate button
    const rotBtn = document.createElement('button')
    rotBtn.className = 'page-icon-btn zoom'
    rotBtn.title = 'Rodar 90°'
    rotBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.992 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182" />
    </svg>`
    rotBtn.addEventListener('click', (e) => {
      e.stopPropagation()
      angles[idx] = (angles[idx] + 90) % 360
      if (angles[idx] === 0) {
        canvasEl.style.transform = ''
      } else {
        canvasEl.style.transform = `rotate(${angles[idx]}deg)`
      }
      updateFinish()
    })
    actions.appendChild(rotBtn)

    card.appendChild(actions)

    // Zoom
    zoomBtn.addEventListener('click', (e) => {
      e.stopPropagation()
      openZoomFromPage(idx + 1, pdf)
    })

    // Render thumbnail
    pdf.getPage(idx + 1).then((page: any) => {
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

    const targetAngle = angles[pageNum - 1] || 0
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
      if (targetAngle !== 0) {
        fullCanvas.style.transform = `rotate(${targetAngle}deg)`
      }
      const ctx = fullCanvas.getContext('2d')!
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      page.render({ canvasContext: ctx, viewport }).promise.then(() => {
        overlay.insertBefore(fullCanvas, overlay.querySelector('.zoom-modal-close'))
      })
    })
  }

  function updateFinish() {
    const hasRotations = angles.some(a => a !== 0)
    finishBtn.disabled = !hasRotations
  }

  // Finish flow
  finishBtn.addEventListener('click', () => {
    if (!pdfData || finishBtn.disabled) return
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
    finishBtn.style.display = ''
  })

  confirmBtn.addEventListener('click', doDownload)
  renameInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') doDownload()
    if (e.key === 'Escape') cancelBtn.click()
  })

  async function doDownload() {
    if (!pdfData) return
    confirmBtn.disabled = true
    confirmBtn.textContent = 'Salvando...'

    try {
      const newDoc = await PDFDocument.load(pdfData, { ignoreEncryption: true })
      for (let i = 0; i < angles.length; i++) {
        if (angles[i]) {
          const page = newDoc.getPage(i)
          const current = page.getRotation().angle
          page.setRotation(degrees(current + angles[i]))
        }
      }
      const pdf = await newDoc.save()
      const filename = (renameInput.value.trim() || 'rotacionado').replace(/\.pdf$/i, '') + '.pdf'
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
    finishBtn.style.display = ''
    updateFinish()
  }

  return container
}
