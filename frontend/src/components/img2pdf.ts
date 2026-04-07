import { PDFDocument } from 'pdf-lib'
import { MultiDropZone, hideDropZone, showDropZone } from '../utils/dropzone'
import { showToast, downloadBlob } from '../utils/helpers'
import { setGlobalDropTarget } from '../utils/globalDropzone'

export function Img2PdfView(): HTMLElement {
  const container = document.createElement('div')

  // ── Header ──
  const header = document.createElement('div')
  header.className = 'tool-header tool-header-with-action'
  header.innerHTML = `
    <div class="tool-header-title">
      <h2>\ud83d\uddbc\ufe0f Imagens para PDF</h2>
    </div>
    <p>Converta suas imagens para um arquivo PDF</p>
  `
  container.appendChild(header)

  // ── Finish button ──
  const finishBtn = document.createElement('button')
  finishBtn.className = 'finish-btn'
  finishBtn.textContent = 'Terminar'
  finishBtn.style.display = 'none'
  container.appendChild(finishBtn)

  // ── Drop zone (shown when no files) ──
  const dz = MultiDropZone({ accept: '.png,.jpg,.jpeg' })
  container.appendChild(dz)

  // ── Inline "Add file" input ──
  const addInput = document.createElement('input')
  addInput.type = 'file'
  addInput.accept = '.png,.jpg,.jpeg'
  addInput.multiple = true
  addInput.style.display = 'none'
  container.appendChild(addInput)

  addInput.addEventListener('change', () => {
    if (addInput.files && addInput.files.length > 0) {
      addFiles(Array.from(addInput.files))
      addInput.value = ''
    }
  })

  // ── Preview grid ──
  const previewGrid = document.createElement('div')
  previewGrid.className = 'file-list'
  previewGrid.style.display = 'none'
  container.appendChild(previewGrid)

  // ── Rename dialog ──
  const renameSection = document.createElement('div')
  renameSection.className = 'rename-section'
  renameSection.style.display = 'none'
  renameSection.innerHTML = `
    <h3>\ud83d\uddbc\ufe0f Nome do arquivo</h3>
    <p>Escolha um nome para o PDF final</p>
    <input type="text" class="rename-input" placeholder="nome-do-arquivo" value="imagens" />
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
  let files: File[] = []

  dz.addEventListener('files-selected', ((e: Event) => {
    const event = e as CustomEvent
    files = event.detail.files
    renderPreviews()
  }) as EventListener)

  setGlobalDropTarget('image', (dropped: File[]) => {
    for (const f of dropped) {
      if (!files.some(existing => existing.name === f.name && existing.size === f.size)) {
        files.push(f)
      }
    }
    renderPreviews()
  })

  function addFiles(newFiles: File[]) {
    for (const f of newFiles) {
      if (!files.some(existing => existing.name === f.name && existing.size === f.size)) {
        files.push(f)
      }
    }
    renderPreviews()
  }

  function renderPreviews() {
    previewGrid.innerHTML = ''

    if (files.length > 0) {
      hideDropZone(dz)
      previewGrid.style.display = 'flex'

      for (let i = 0; i < files.length; i++) {
        const card = document.createElement('div')
        card.className = 'file-chip'
        card.innerHTML = `
          <span>\ud83d\uddbc\ufe0f</span>
          <strong>${escapeHtml(files[i].name)}</strong>
          <span class="remove" data-idx="${i}">\u2715</span>
        `
        card.querySelector('.remove')!.addEventListener('click', (ev) => {
          ev.stopPropagation()
          const idx = Number((ev.target as HTMLElement).dataset.idx)
          files.splice(idx, 1)
          renderPreviews()
        })
        previewGrid.appendChild(card)
      }

      // Inline "Add file" card
      const addCard = document.createElement('div')
      addCard.className = 'add-file-card'
      addCard.innerHTML = `<span class="add-icon">+</span> Adicionar`
      addCard.addEventListener('click', () => addInput.click())
      previewGrid.appendChild(addCard)

      finishBtn.style.display = 'inline-flex'
    } else {
      showDropZone(dz)
      previewGrid.style.display = 'none'
      finishBtn.style.display = 'none'
    }
  }

  finishBtn.addEventListener('click', () => {
    if (files.length === 0) return
    header.style.display = 'none'
    previewGrid.style.display = 'none'
    dz.style.display = 'none'
    finishBtn.style.display = 'none'
    renameSection.style.display = 'flex'
    renameInput.focus()
    renameInput.select()
  })

  cancelBtn.addEventListener('click', () => {
    renameSection.style.display = 'none'
    header.style.display = ''
    previewGrid.style.display = files.length > 0 ? 'flex' : 'none'
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
      const newDoc = await PDFDocument.create()
      for (const file of files) {
        const buf = await file.arrayBuffer()
        let image: any

        if (file.type === 'image/png') {
          image = await newDoc.embedPng(buf)
        } else if (file.type === 'image/jpeg' || file.type === 'image/jpg') {
          image = await newDoc.embedJpg(buf)
        } else {
          continue
        }

        const page = newDoc.addPage([image.width, image.height])
        page.drawImage(image, {
          x: 0,
          y: 0,
          width: image.width,
          height: image.height,
        })
      }

      const pdfBytes = await newDoc.save()
      const filename = (renameInput.value.trim() || 'imagens').replace(/\.pdf$/i, '') + '.pdf'
      downloadBlob(new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' }), filename)
      showToast('PDF criado com sucesso!')
    } catch (err: any) {
      showToast(`Erro: ${err.message}`, true)
    }

    confirmBtn.disabled = false
    confirmBtn.textContent = 'Salvar e Baixar'
    renameSection.style.display = 'none'
    header.style.display = ''
    previewGrid.style.display = files.length > 0 ? 'flex' : 'none'
    dz.style.display = files.length === 0 ? '' : 'none'
    if (files.length > 0) finishBtn.style.display = 'inline-flex'
  }

  function escapeHtml(s: string): string {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  }

  return container
}
