import { MultiDropZone } from '../utils/dropzone'
import { showToast, downloadBlob } from '../utils/helpers'

interface MergeViewProps {
  api: string
  onBack: () => void
}

export function MergeView({ api, onBack }: MergeViewProps): HTMLElement {
  const container = document.createElement('div')

  const header = document.createElement('div')
  header.className = 'tool-header'
  header.innerHTML = `
    <button class="back-link">\u2190 Voltar</button>
    <h2>\ud83d\udd17 Juntar PDFs</h2>
    <p>Una v\u00e1rios PDFs em um \u00fanico arquivo</p>
  `
  container.appendChild(header)
  header.querySelector('.back-link')!.addEventListener('click', onBack)

  const dz = MultiDropZone({ accept: '.pdf' })
  container.appendChild(dz)

  const fileList = document.createElement('div')
  fileList.className = 'file-list'
  container.appendChild(fileList)

  const downloadSection = document.createElement('div')
  downloadSection.className = 'download-section'
  downloadSection.style.display = 'none'

  const info = document.createElement('p')
  info.className = 'info'
  downloadSection.appendChild(info)

  const downloadBtn = document.createElement('button')
  downloadBtn.className = 'btn btn-primary btn-full'
  downloadBtn.innerHTML = '\ud83d\udce5 Baixar PDF unificado'
  downloadBtn.disabled = true
  downloadSection.appendChild(downloadBtn)
  container.appendChild(downloadSection)

  let files: File[] = []

  dz.addEventListener('files-selected', ((e: Event) => {
    const event = e as CustomEvent
    files = event.detail.files
    renderFileList()
  }) as EventListener)

  function renderFileList() {
    fileList.innerHTML = ''
    if (files.length === 0) {
      downloadSection.style.display = 'none'
      return
    }

    for (let i = 0; i < files.length; i++) {
      const chip = document.createElement('div')
      chip.className = 'file-chip'
      chip.innerHTML = `
        \ud83d\udcc4 <strong>${escapeHtml(files[i].name)}</strong>
        <span class="remove" data-idx="${i}">\u2715</span>
      `
      chip.querySelector('.remove')!.addEventListener('click', (ev) => {
        ev.stopPropagation()
        const idx = Number((ev.target as HTMLElement).dataset.idx)
        files.splice(idx, 1)
        renderFileList()
      })
      fileList.appendChild(chip)
    }

    downloadSection.style.display = 'block'
    info.textContent = `${files.length} arquivo(s) para juntar`
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

      const res = await fetch(`${api}/api/merge`, { method: 'POST', body: formData })
      if (!res.ok) throw new Error('Erro ao processar')

      const blob = await res.blob()
      downloadBlob(blob, 'unificado.pdf')
      showToast('PDF unificado baixado!')
    } catch {
      showToast('Erro ao processar os PDFs', true)
    }

    downloadBtn.innerHTML = '\ud83d\udce5 Baixar PDF unificado'
    downloadBtn.disabled = false
  })

  function escapeHtml(s: string): string {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  }

  return container
}
