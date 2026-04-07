import { PDFDocument } from 'pdf-lib'
import { MultiDropZone } from '../utils/dropzone'
import { showToast, downloadBlob } from '../utils/helpers'
import { setGlobalDropTarget } from '../utils/globalDropzone'

export function MergeView(): HTMLElement {
  const container = document.createElement('div')

  // ── Header with "Terminar" button ──
  const header = document.createElement('div')
  header.className = 'tool-header tool-header-with-action'
  header.innerHTML = `
    <div class="tool-header-title">
      <h2>\ud83d\udd17 Juntar PDFs</h2>
    </div>
    <p>Una v\u00e1rios PDFs em um \u00fanico arquivo</p>
  `
  container.appendChild(header)

  // "Terminar" button in top-right
  const finishBtn = document.createElement('button')
  finishBtn.className = 'finish-btn'
  finishBtn.textContent = 'Terminar'
  finishBtn.style.display = 'none'
  container.appendChild(finishBtn)

  // ── Full drop zone (shown when no files) ──
  const dz = MultiDropZone({ accept: '.pdf' })
  container.appendChild(dz)

  // ── File list with inline "Add file" card ──
  const fileList = document.createElement('div')
  fileList.className = 'file-list'
  fileList.style.display = 'none'
  container.appendChild(fileList)

  // ── State ──
  let files: File[] = []

  // ── Hidden input for inline "Add file" ──
  const addInput = document.createElement('input')
  addInput.type = 'file'
  addInput.accept = '.pdf'
  addInput.multiple = true
  addInput.style.display = 'none'
  container.appendChild(addInput)

  addInput.addEventListener('change', () => {
    if (addInput.files && addInput.files.length > 0) {
      addFiles(Array.from(addInput.files))
      addInput.value = ''
    }
  })

  // ── File selection from main dropzone ──
  dz.addEventListener('files-selected', ((e: Event) => {
    const event = e as CustomEvent
    addFiles((event.detail.files || [event.detail.file]) as File[])
  }) as EventListener)

  // ── Global dropzone (drag anywhere) ──
  setGlobalDropTarget('pdf', (dropped: File[]) => {
    addFiles(dropped)
  })

  function addFiles(newFiles: File[]) {
    for (const f of newFiles) {
      if (!files.some(existing => existing.name === f.name && existing.size === f.size)) {
        files.push(f)
      }
    }
    renderFileList()
  }

  function renderFileList() {
    fileList.innerHTML = ''

    if (files.length > 0) {
      dz.style.display = 'none'
      fileList.style.display = 'flex'

      for (let i = 0; i < files.length; i++) {
        const chip = document.createElement('div')
        chip.className = 'file-chip'
        chip.innerHTML = `
          <span>\ud83d\udcc4</span>
          <strong>${escapeHtml(files[i].name)}</strong>
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

      // Inline "Add file" card at end
      const addCard = document.createElement('div')
      addCard.className = 'add-file-card'
      addCard.innerHTML = `<span class="add-icon">+</span> Adicionar`
      addCard.addEventListener('click', () => addInput.click())
      fileList.appendChild(addCard)

      finishBtn.style.display = 'inline-flex'
    } else {
      dz.style.display = ''
      fileList.style.display = 'none'
      finishBtn.style.display = 'none'
    }
  }

  // ── Rename / Download flow ──
  const renameSection = document.createElement('div')
  renameSection.className = 'rename-section'
  renameSection.style.display = 'none'
  renameSection.innerHTML = `
    <h3>\ud83d\udcc4 Nome do arquivo</h3>
    <p>Escolha um nome para o PDF final</p>
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

  finishBtn.addEventListener('click', () => {
    if (files.length === 0) return
    header.style.display = 'none'
    fileList.style.display = 'none'
    dz.style.display = 'none'
    finishBtn.style.display = 'none'
    renameSection.style.display = 'flex'
    renameInput.focus()
    renameInput.select()
  })

  cancelBtn.addEventListener('click', () => {
    renameSection.style.display = 'none'
    header.style.display = ''
    fileList.style.display = files.length > 0 ? 'flex' : 'none'
    dz.style.display = files.length === 0 ? '' : 'none'
    if (files.length > 0) finishBtn.style.display = 'inline-flex'
  })

  confirmBtn.addEventListener('click', doDownload)

  renameInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') doDownload()
    if (e.key === 'Escape') cancelBtn.click()
  })

  async function doDownload() {
    if (files.length === 0) return
    confirmBtn.disabled = true
    confirmBtn.innerHTML = '<span class="spinner"></span> Processando...'

    try {
      const mergedDoc = await PDFDocument.create()
      for (const file of files) {
        const buf = await file.arrayBuffer()
        const doc = await PDFDocument.load(buf, { ignoreEncryption: true })
        const pages = await mergedDoc.copyPages(doc, doc.getPageIndices())
        for (const page of pages) {
          mergedDoc.addPage(page)
        }
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
    // Reset view
    renameSection.style.display = 'none'
    header.style.display = ''
    fileList.style.display = files.length > 0 ? 'flex' : 'none'
    dz.style.display = files.length === 0 ? '' : 'none'
    if (files.length > 0) finishBtn.style.display = 'inline-flex'
  }

  function escapeHtml(s: string): string {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  }

  return container
}
