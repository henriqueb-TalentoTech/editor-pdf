import { MultiDropZone } from '../utils/dropzone'
import { showToast, downloadBlob } from '../utils/helpers'

interface Img2PdfViewProps {
  api: string
  onBack: () => void
}

export function Img2PdfView({ api, onBack }: Img2PdfViewProps): HTMLElement {
  const container = document.createElement('div')

  const header = document.createElement('div')
  header.className = 'tool-header'
  header.innerHTML = `
    <button class="back-link">\u2190 Voltar</button>
    <h2>\ud83d\uddbc\ufe0f Imagens para PDF</h2>
    <p>Converta suas imagens para um arquivo PDF</p>
  `
  container.appendChild(header)
  header.querySelector('.back-link')!.addEventListener('click', onBack)

  const dz = MultiDropZone({ accept: '.png,.jpg,.jpeg' })
  container.appendChild(dz)

  const previewGrid = document.createElement('div')
  previewGrid.className = 'page-grid'
  previewGrid.style.marginTop = '1rem'
  container.appendChild(previewGrid)

  const downloadSection = document.createElement('div')
  downloadSection.className = 'download-section'
  downloadSection.style.display = 'none'

  const info = document.createElement('p')
  info.className = 'info'
  downloadSection.appendChild(info)

  const downloadBtn = document.createElement('button')
  downloadBtn.className = 'btn btn-primary btn-full'
  downloadBtn.innerHTML = '\ud83d\udce5 Baixar PDF'
  downloadBtn.disabled = true
  downloadSection.appendChild(downloadBtn)
  container.appendChild(downloadSection)

  let files: File[] = []

  dz.addEventListener('files-selected', ((e: Event) => {
    const event = e as CustomEvent
    files = event.detail.files
    renderPreviews()
  }) as EventListener)

  function renderPreviews() {
    previewGrid.innerHTML = ''
    if (files.length === 0) {
      downloadSection.style.display = 'none'
      return
    }

    for (let i = 0; i < files.length; i++) {
      const card = document.createElement('div')
      card.className = 'page-card'
      card.style.position = 'relative'

      const badge = document.createElement('div')
      badge.className = 'badge'
      badge.textContent = String(i + 1)
      card.appendChild(badge)

      const img = document.createElement('img')
      img.src = URL.createObjectURL(files[i])
      img.onload = () => URL.revokeObjectURL(img.src)
      card.appendChild(img)

      const actions = document.createElement('div')
      actions.className = 'page-actions'
      actions.textContent = files[i].name
      actions.style.fontSize = '12px'
      actions.style.color = 'var(--text-muted)'
      actions.style.padding = '6px 10px'
      card.appendChild(actions)

      previewGrid.appendChild(card)
    }

    downloadSection.style.display = 'block'
    info.textContent = `${files.length} imagem${files.length > 1 ? 's' : ''}`
    downloadBtn.disabled = false
  }

  downloadBtn.addEventListener('click', async () => {
    if (files.length === 0) return
    downloadBtn.disabled = true
    downloadBtn.innerHTML = '<span class="spinner"></span> Processando...'

    try {
      const formData = new FormData()
      for (const f of files) {
        formData.append('files', f)
      }

      const res = await fetch(`${api}/api/img2pdf`, { method: 'POST', body: formData })
      if (!res.ok) throw new Error('Erro ao processar')

      const blob = await res.blob()
      downloadBlob(blob, 'imagens.pdf')
      showToast('PDF criado com sucesso!')
    } catch {
      showToast('Erro ao processar as imagens', true)
    }

    downloadBtn.innerHTML = '\ud83d\udce5 Baixar PDF'
    downloadBtn.disabled = false
  })

  return container
}
