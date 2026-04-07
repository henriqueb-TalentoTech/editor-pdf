import { PDFDocument } from 'pdf-lib'
import { DropZone } from '../utils/dropzone'
import { showToast, downloadBlob } from '../utils/helpers'
import { setGlobalDropTarget } from '../utils/globalDropzone'

export function ExtractView(): HTMLElement {
  const container = document.createElement('div')

  // ── Header ──
  const header = document.createElement('div')
  header.className = 'tool-header tool-header-with-action'
  header.innerHTML = `
    <div class="tool-header-title">
      <h2>\u2702\ufe0f Extrair P\u00e1ginas</h2>
    </div>
    <p>Selecione as p\u00e1ginas que deseja extrair</p>
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
  container.appendChild(pageGrid)

  // ── Rename dialog ──
  const renameSection = document.createElement('div')
  renameSection.className = 'rename-section'
  renameSection.style.display = 'none'
  renameSection.innerHTML = `
    <h3>\ud83d\udcc4 Nome do arquivo</h3>
    <p>Escolha um nome para o PDF final</p>
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

  finishBtn.addEventListener('click', () => {
    if (selected.size === 0) return
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

  // ── State ──
  let selected = new Set<number>()
  let srcBytes: Uint8Array | null = null
  let uploadedFile: File | null = null

  dz.addEventListener('file-selected', ((e: Event) => {
    const event = e as CustomEvent
    uploadedFile = event.detail.file
    selected = new Set()
    srcBytes = null
    loadPdf(event.detail.file)
  }) as EventListener)

  setGlobalDropTarget('pdf', (dropped: File[]) => {
    if (dropped.length > 0) {
      uploadedFile = dropped[0]
      selected = new Set()
      srcBytes = null
      loadPdf(dropped[0])
    }
  })

  async function loadPdf(file: File) {
    pageGrid.innerHTML = '<p style="text-align:center;color:var(--text-muted);padding:2rem;">Carregando...</p>'

    const buf = await file.arrayBuffer()
    srcBytes = new Uint8Array(buf)

    const doc = await PDFDocument.load(srcBytes, { ignoreEncryption: true })
    const numPages = doc.getPageCount()

    await loadPdfJs()
    const pdfjs = (window as any).pdfjsLib
    const pdf = await pdfjs.getDocument({ data: srcBytes.slice() }).promise

    pageGrid.innerHTML = ''
    const grid = document.createElement('div')
    grid.className = 'page-grid'
    pageGrid.appendChild(grid)

    for (let i = 1; i <= numPages; i++) {
      const page = await pdf.getPage(i)
      const viewport = page.getViewport({ scale: 1.0 })
      const canvas = document.createElement('canvas')
      canvas.style.width = '100%'
      canvas.style.display = 'block'

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
      badge.textContent = String(i)
      badge.style.display = 'none'
      card.appendChild(badge)
      card.appendChild(canvas)

      const actions = document.createElement('div')
      actions.className = 'page-actions'

      const selBtn = document.createElement('button')
      selBtn.className = 'btn btn-secondary'
      selBtn.style.fontSize = '13px'
      selBtn.style.padding = '6px 14px'
      selBtn.textContent = 'Selecionar'

      const idx = i - 1
      selBtn.addEventListener('click', () => {
        if (selected.has(idx)) {
          selected.delete(idx)
          card.classList.remove('selected')
          badge.style.display = 'none'
          selBtn.textContent = 'Selecionar'
        } else {
          selected.add(idx)
          card.classList.add('selected')
          badge.style.display = 'block'
          selBtn.textContent = '\u2705 Remover'
        }
        updateFinish()
      })
      actions.appendChild(selBtn)
      card.appendChild(actions)

      grid.appendChild(card)
    }

    updateFinish()
  }

  function updateFinish() {
    finishBtn.style.display = selected.size > 0 ? 'inline-flex' : 'none'
  }

  async function doDownload() {
    if (!srcBytes || selected.size === 0) return
    confirmBtn.disabled = true
    confirmBtn.innerHTML = '<span class="spinner"></span> Processando...'

    try {
      const newDoc = await PDFDocument.create()
      const src = await PDFDocument.load(srcBytes, { ignoreEncryption: true })
      const pages = await newDoc.copyPages(src, [...selected])
      for (const page of pages) {
        newDoc.addPage(page)
      }
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
