type AcceptType = 'pdf' | 'image'

interface Context {
  accept: AcceptType
  onFiles: (files: File[]) => void
}

let context: Context | null = null
let dragCounter = 0
let overlay: HTMLElement | null = null

const LABEL_MAP: Record<string, string> = {
  pdf: 'PDF',
  image: 'PNG, JPG, JPEG',
}

const FILE_EXTENSIONS: Record<string, string[]> = {
  pdf: ['.pdf'],
  image: ['.png', '.jpg', '.jpeg'],
}

const MIME_PREFIXES: Record<string, string[]> = {
  pdf: ['application/pdf'],
  image: ['image/png', 'image/jpeg'],
}

function showOverlay(accept: AcceptType) {
  if (overlay) return
  const formats = LABEL_MAP[accept] ?? accept
  overlay = document.createElement('div')
  overlay.className = 'global-dzn-overlay'
  overlay.innerHTML = `
    <div class="global-dzn-backdrop"></div>
    <div class="global-dzn-content">
      <div class="dzn-icon">\ud83d\udcc2</div>
      <div class="dzn-title">Solte arquivos aqui</div>
      <div class="dzn-formats">Formatos aceitos: ${formats}</div>
    </div>
  `
  document.body.appendChild(overlay)
}

function hideOverlay() {
  if (overlay) {
    overlay.remove()
    overlay = null
  }
}

function fileMatches(file: File, accept: AcceptType): boolean {
  const extensions = FILE_EXTENSIONS[accept] ?? []
  const mimes = MIME_PREFIXES[accept] ?? []
  const name = file.name.toLowerCase()

  if (extensions.some(e => name.endsWith(e))) return true
  if (mimes.some(m => file.type.startsWith(m.split('/')[0] === 'application' ? 'application' : m.slice(0, m.indexOf('/'))))) return true
  if (file.type && mimes.includes(file.type)) return true
  return false
}

function handleDragEnter(e: DragEvent) {
  e.preventDefault()
  e.stopPropagation()
  dragCounter += 1
  if (context?.accept && e.dataTransfer?.items && e.dataTransfer.items.length > 0) {
    showOverlay(context.accept)
  }
}

function handleDragLeave(e: DragEvent) {
  e.preventDefault()
  e.stopPropagation()
  dragCounter -= 1
  if (dragCounter <= 0) {
    dragCounter = 0
    hideOverlay()
  }
}

function handleDragOver(e: DragEvent) {
  e.preventDefault()
  e.stopPropagation()
}

function handleDrop(e: DragEvent) {
  e.preventDefault()
  e.stopPropagation()
  dragCounter = 0
  hideOverlay()

  if (!context) return

  const files = e.dataTransfer?.files
  if (!files || !files.length) return

  const matched: File[] = []
  for (let i = 0; i < files.length; i++) {
    if (fileMatches(files[i], context.accept)) {
      matched.push(files[i])
    }
  }

  if (matched.length > 0) {
    context.onFiles(matched)
  }
}

// Register global listeners once
window.addEventListener('dragenter', handleDragEnter)
window.addEventListener('dragleave', handleDragLeave)
window.addEventListener('dragover', handleDragOver)
window.addEventListener('drop', handleDrop)

/** Call when entering a tool view. Set context and optional overlay label. */
export function setGlobalDropTarget(accept: AcceptType, onFiles: (files: File[]) => void): void {
  context = { accept, onFiles }
}

/** Call when leaving a tool view to deactivate global dropzone. */
export function clearGlobalDropTarget(): void {
  context = null
  dragCounter = 0
  hideOverlay()
}
