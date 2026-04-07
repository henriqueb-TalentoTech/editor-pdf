import { DropZone } from '../utils/dropzone'
import { showToast, downloadBlob } from '../utils/helpers'

interface ExtractViewProps {
  api: string
  onBack: () => void
}

export function ExtractView({ api, onBack }: ExtractViewProps): HTMLElement {
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

  const wrapper = document.createElement('div')
  const dz = DropZone({ label: 'Seu PDF', accept: '.pdf' })
  wrapper.appendChild(dz)
  container.appendChild(wrapper)

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
  let currentFile: File | null = null

  dz.addEventListener('file-selected', ((e: Event) => {
    const event = e as CustomEvent
    currentFile = event.detail.file
    selected = new Set()
    renderPdfPreviews()
  }) as EventListener)

  async function renderPdfPreviews() {
    if (!currentFile) return
    pageGrid.innerHTML = ''

    const reader = new FileReader()
    reader.onload = async () => {
      const arrayBuffer = reader.result as ArrayBuffer
      await loadPdfJs()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const pdf: any = await (window as any).pdfjsLib.getDocument({ data: arrayBuffer }).promise
      const numPages: number = pdf.numPages

      for (let i = 1; i <= numPages; i++) {
        const page = await pdf.getPage(i)
        const viewport = page.getViewport({ scale: 1.0 })
        const canvas = document.createElement('canvas')
        const dpr = window.devicePixelRatio || 1
        canvas.width = viewport.width * dpr
        canvas.height = viewport.height * dpr
        canvas.style.width = '100%'
        canvas.style.display = 'block'

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

        pageGrid.appendChild(card)
      }
    }
    reader.readAsArrayBuffer(currentFile)
  }

  function updateDownload() {
    const count = selected.size
    downloadSection.style.display = count > 0 ? 'block' : 'none'
    info.textContent = `${count} p\u00e1gina${count > 1 ? 's' : ''} selecionada${count > 1 ? 's' : ''}`
    downloadBtn.disabled = count === 0
  }

  downloadBtn.addEventListener('click', async () => {
    if (!currentFile || selected.size === 0) return
    downloadBtn.disabled = true
    downloadBtn.innerHTML = '<span class="spinner"></span> Processando...'

    try {
      const formData = new FormData()
      formData.append('file', currentFile)

      const params = new URLSearchParams({ pages: JSON.stringify([...selected]) })
      const res = await fetch(`${api}/api/extract?${params}`, { method: 'POST', body: formData })
      if (!res.ok) throw new Error('Erro ao processar')

      const blob = await res.blob()
      downloadBlob(blob, 'extraido.pdf')
      showToast('PDF baixado com sucesso!')
    } catch {
      showToast('Erro ao processar o PDF', true)
    }

    downloadBtn.innerHTML = '\ud83d\udce5 Baixar p\u00e1ginas selecionadas'
    downloadBtn.disabled = false
  })

  return container
}

const CDN_LIB = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js'
const CDN_WORKER = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'

async function loadPdfJs(): Promise<void> {
  if ((window as any).pdfjsLib) return

  await loadScript(CDN_WORKER)
  await loadScript(CDN_LIB)

  const w = window as any
  w.pdfjsLib.GlobalWorkerOptions.workerSrc = CDN_WORKER
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
