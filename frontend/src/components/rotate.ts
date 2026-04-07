import { PDFDocument, degrees } from 'pdf-lib'
import { DropZone, hideDropZone, showDropZone } from '../utils/dropzone'
import { showToast, downloadBlob } from '../utils/helpers'
import { setGlobalDropTarget } from '../utils/globalDropzone'

export function RotateView(): HTMLElement {
  const container = document.createElement('div')

  // ── Header ──
  const header = document.createElement('div')
  header.className = 'tool-header tool-header-with-action'
  header.innerHTML = `
    <div class="tool-header-title">
      <h2>\ud83d\udd04 Rotacionar</h2>
    </div>
    <p>Gire as p\u00e1ginas do seu PDF</p>
  `
  container.appendChild(header)

  // ── Finish button ──
  const finishBtn = document.createElement('button')
  finishBtn.className = 'finish-btn'
  finishBtn.textContent = 'Terminar'
  finishBtn.style.display = 'none'
  container.appendChild(finishBtn)

  // ── Drop zone ──
  const dz = DropZone({ accept: '.pdf' })
  container.appendChild(dz)

  // ── Page grid ──
  const pageGrid = document.createElement('div')
  pageGrid.className = 'page-grid'
  pageGrid.style.display = 'none'
  container.appendChild(pageGrid)

  // ── Rename dialog ──
  const renameSection = document.createElement('div')
  renameSection.className = 'rename-section'
  renameSection.style.display = 'none'
  renameSection.innerHTML = `
    <h3>\ud83d\udd04 Nome do arquivo</h3>
    <p>Escolha um nome para o PDF final</p>
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

  // ── State ──
  let angles: Record<number, number> = {}
  let uploadedFile: File | null = null
  let pdfData: Uint8Array | null = null

  function handleFile(file: File) {
    uploadedFile = file
    angles = {}
    pdfData = null
    renderAll()
  }

  dz.addEventListener('file-selected', ((e: Event) => {
    const event = e as CustomEvent
    handleFile(event.detail.file)
  }) as EventListener)

  setGlobalDropTarget('pdf', (dropped: File[]) => {
    if (dropped.length > 0) handleFile(dropped[0])
  })

  // ── Finish flow ──
  finishBtn.addEventListener('click', () => {
    if (Object.keys(angles).length === 0) return
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
    pageGrid.style.display = ''
    dz.style.display = 'none'
    if (uploadedFile) finishBtn.style.display = 'inline-flex'
  })

  confirmBtn.addEventListener('click', doDownload)

  renameInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') doDownload()
    if (e.key === 'Escape') cancelBtn.click()
  })

  async function renderAll() {
    if (!uploadedFile) return

    hideDropZone(dz)
    pageGrid.style.display = ''
    pageGrid.innerHTML = '<p style="text-align:center;color:var(--text-muted);padding:2rem;">Carregando...</p>'

    const buf = await uploadedFile!.arrayBuffer()
    pdfData = new Uint8Array(buf)

    const docForInfo = await PDFDocument.load(pdfData, { ignoreEncryption: true })
    const numPages = docForInfo.getPageCount()

    pageGrid.innerHTML = ''
    const grid = document.createElement('div')
    grid.className = 'page-grid'
    pageGrid.appendChild(grid)

    await loadPdfJs()
    const pdfjs = (window as any).pdfjsLib
    const pdf = await pdfjs.getDocument({ data: pdfData!.slice() }).promise

    for (let i = 0; i < numPages; i++) {
      const page = await pdf.getPage(i + 1)
      const viewport = page.getViewport({ scale: 1.0 })
      const canvas = document.createElement('canvas')
      canvas.style.width = '100%'
      canvas.style.display = 'block'
      canvas.style.transition = 'transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)'

      const dpr = window.devicePixelRatio || 1
      canvas.width = viewport.width * dpr
      canvas.height = viewport.height * dpr
      const ctx = canvas.getContext('2d')!
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      await page.render({ canvasContext: ctx, viewport }).promise

      const card = document.createElement('div')
      card.className = 'page-card'
      card.style.position = 'relative'

      const badge = document.createElement('div')
      badge.className = 'badge'
      badge.textContent = String(i + 1)
      card.appendChild(badge)
      card.appendChild(canvas)

      const actions = document.createElement('div')
      actions.className = 'page-actions'
      const idx = i
      const rotBtn = document.createElement('button')
      rotBtn.className = 'btn btn-secondary'
      rotBtn.style.fontSize = '13px'
      rotBtn.style.padding = '6px 16px'
      rotBtn.textContent = `\ud83d\udd04 Girar`
      rotBtn.addEventListener('click', () => {
        angles[idx] = ((angles[idx] || 0) + 90) % 360
        if (angles[idx] === 0) {
          canvas.style.transform = ''
          rotBtn.textContent = `\ud83d\udd04 Girar`
        } else {
          canvas.style.transform = `rotate(${angles[idx]}deg)`
          rotBtn.textContent = `\ud83d\udd04 ${angles[idx]}\u00b0`
        }
        updateFinish()
      })
      actions.appendChild(rotBtn)
      card.appendChild(actions)

      grid.appendChild(card)
    }

    updateFinish()
  }

  function updateFinish() {
    finishBtn.style.display = Object.keys(angles).length > 0 ? 'inline-flex' : 'none'
  }

  async function doDownload() {
    if (!pdfData) return
    confirmBtn.disabled = true
    confirmBtn.innerHTML = '<span class="spinner"></span> Processando...'

    try {
      const newDoc = await PDFDocument.load(pdfData, { ignoreEncryption: true })
      for (const [idx, angle] of Object.entries(angles)) {
        if (angle) {
          const page = newDoc.getPage(Number(idx))
          const current = page.getRotation().angle
          page.setRotation(degrees(current + Number(angle)))
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
    if (uploadedFile) finishBtn.style.display = 'inline-flex'
  }

  return container
}

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
    const script = document.createElement('script')
    script.src = src
    script.onload = () => resolve()
    script.onerror = () => reject(new Error(`Failed to load: ${src}`))
    document.head.appendChild(script)
  })
}
