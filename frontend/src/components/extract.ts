import { PDFDocument } from 'pdf-lib'
import { DropZone } from '../utils/dropzone'
import { showToast, downloadBlob } from '../utils/helpers'

interface ExtractViewProps {
  onBack: () => void
}

export function ExtractView({ onBack }: ExtractViewProps): HTMLElement {
  const container = document.createElement('div')

  const header = document.createElement('div')
  header.className = 'tool-header'
  header.innerHTML = `
    <button class="back-link">\u2190 Voltar</button>
    <h2>\u2702\ufe0f Extrair P\u00e1ginas</h2>
    <p>Selecione as p\u00e1ginas que deseja extrair</p>
  `
  container.appendChild(header)
  header.querySelector('.back-link')!.addEventListener('click', onBack)

  const dz = DropZone({ accept: '.pdf' })
  container.appendChild(dz)

  const pageGrid = document.createElement('div')
  pageGrid.className = 'page-grid'
  container.appendChild(pageGrid)

  const downloadSection = document.createElement('div')
  downloadSection.className = 'download-section'
  downloadSection.style.display = 'none'

  const info = document.createElement('p')
  info.className = 'info'
  downloadSection.appendChild(info)

  const downloadBtn = document.createElement('button')
  downloadBtn.className = 'btn btn-primary'
  downloadBtn.innerHTML = '\ud83d\udce5 Baixar p\u00e1ginas selecionadas'
  downloadBtn.disabled = true
  downloadSection.appendChild(downloadBtn)
  container.appendChild(downloadSection)

  let selected = new Set<number>()
  let srcBytes: Uint8Array | null = null
  let numPages = 0

  dz.addEventListener('file-selected', ((e: Event) => {
    const event = e as CustomEvent
    const file: File = event.detail.file
    selected = new Set()
    srcBytes = null
    loadPdf(file)
  }) as EventListener)

  async function loadPdf(file: File) {
    pageGrid.innerHTML = '<p style="text-align:center;color:var(--text-muted);padding:2rem;">Carregando...</p>'

    const buf = await file.arrayBuffer()
    srcBytes = new Uint8Array(buf)

    // Get page count via pdf-lib
    const doc = await PDFDocument.load(srcBytes, { ignoreEncryption: true })
    numPages = doc.getPageCount()

    // Render previews via pdf.js
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
        updateDownload()
      })
      actions.appendChild(selBtn)
      card.appendChild(actions)

      grid.appendChild(card)
    }
  }

  function updateDownload() {
    const count = selected.size
    downloadSection.style.display = count > 0 ? 'block' : 'none'
    info.textContent = `${count} p\u00e1gina${count > 1 ? 's' : ''} selecionada${count > 1 ? 's' : ''}`
    downloadBtn.disabled = count === 0
  }

  downloadBtn.addEventListener('click', async () => {
    if (!srcBytes || selected.size === 0) return
    downloadBtn.disabled = true
    downloadBtn.innerHTML = '<span class="spinner"></span> Processando...'

    try {
      const newDoc = await PDFDocument.create()
      const src = await PDFDocument.load(srcBytes, { ignoreEncryption: true })
      const pages = await newDoc.copyPages(src, [...selected])
      for (const page of pages) {
        newDoc.addPage(page)
      }
      const pdf = await newDoc.save()
      downloadBlob(new Blob([new Uint8Array(pdf)], { type: 'application/pdf' }), 'extraido.pdf')
      showToast('PDF baixado com sucesso!')
    } catch (err: any) {
      showToast(`Erro: ${err.message}`, true)
    }

    downloadBtn.innerHTML = '\ud83d\udce5 Baixar p\u00e1ginas selecionadas'
    downloadBtn.disabled = false
  })

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
