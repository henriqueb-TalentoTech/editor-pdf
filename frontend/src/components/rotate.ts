import { PDFDocument, degrees } from 'pdf-lib'
import { DropZone } from '../utils/dropzone'
import { showToast, downloadBlob } from '../utils/helpers'

interface RotateViewProps {
  onBack: () => void
}

export function RotateView({ onBack }: RotateViewProps): HTMLElement {
  const container = document.createElement('div')

  const header = document.createElement('div')
  header.className = 'tool-header'
  header.innerHTML = `
    <button class="back-link">\u2190 Voltar</button>
    <h2>\ud83d\udd04 Rotacionar</h2>
    <p>Gire as p\u00e1ginas do seu PDF</p>
  `
  container.appendChild(header)
  header.querySelector('.back-link')!.addEventListener('click', onBack)

  const dz = DropZone({ accept: '.pdf' })
  container.appendChild(dz)

  const gridContainer = document.createElement('div')
  container.appendChild(gridContainer)

  const downloadSection = document.createElement('div')
  downloadSection.className = 'download-section'
  downloadSection.style.display = 'none'

  const info = document.createElement('p')
  info.className = 'info'
  downloadSection.appendChild(info)

  const downloadBtn = document.createElement('button')
  downloadBtn.className = 'btn btn-primary btn-full'
  downloadBtn.innerHTML = '\ud83d\udce5 Baixar PDF'
  downloadBtn.disabled = false
  downloadSection.appendChild(downloadBtn)
  container.appendChild(downloadSection)

  let angles: Record<number, number> = {}
  let uploadedFile: File | null = null
  let pdfData: Uint8Array | null = null
  let numPages = 0

  dz.addEventListener('file-selected', ((e: Event) => {
    const event = e as CustomEvent
    uploadedFile = event.detail.file
    angles = {}
    pdfData = null
    numPages = 0
    renderAll()
  }) as EventListener)

  async function renderAll() {
    if (!uploadedFile) return

    gridContainer.innerHTML = '<p style="text-align:center;color:var(--text-muted);padding:2rem;">Carregando...</p>'

    const buf = await uploadedFile!.arrayBuffer()
    pdfData = new Uint8Array(buf)

    // Load PDF for page info (no rendering needed, just get count + sizes)
    const docForInfo = await PDFDocument.load(pdfData, { ignoreEncryption: true })
    numPages = docForInfo.getPageCount()

    gridContainer.innerHTML = ''
    const grid = document.createElement('div')
    grid.className = 'page-grid'
    gridContainer.appendChild(grid)

    // Use PDF.js for rendering thumbnails
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
        updateDownload()
      })
      actions.appendChild(rotBtn)
      card.appendChild(actions)

      grid.appendChild(card)
    }

    updateDownload()
  }

  function updateDownload() {
    const count = Object.keys(angles).length
    downloadSection.style.display = count > 0 ? 'block' : 'none'
    info.textContent = count > 0
      ? `${count} p\u00e1gina(s) rotacionada(s)`
      : 'Nenhuma p\u00e1gina foi rotacionada'
    downloadBtn.disabled = count === 0
  }

  downloadBtn.addEventListener('click', async () => {
    if (!pdfData) return
    downloadBtn.disabled = true
    downloadBtn.innerHTML = '<span class="spinner"></span> Processando...'

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
      downloadBlob(new Blob([new Uint8Array(pdf)], { type: 'application/pdf' }), 'rotacionado.pdf')
      showToast('PDF baixado com sucesso!')
    } catch (err: any) {
      showToast(`Erro: ${err.message}`, true)
    }

    downloadBtn.innerHTML = '\ud83d\udce5 Baixar PDF'
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
