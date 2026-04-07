const tools = [
  { id: 'rotate', icon: '\ud83d\udd04', title: 'Rotacionar' },
  { id: 'extract', icon: '\u2702\ufe0f', title: 'Extrair' },
  { id: 'merge', icon: '\ud83d\udd17', title: 'Juntar' },
  { id: 'img2pdf', icon: '\ud83d\uddbc\ufe0f', title: 'Imagens \u2192 PDF' },
]

function renderSidebar(activeTool: string | null, onToolClick: (toolId: string) => void): HTMLElement {
  const sidebar = document.createElement('aside')
  sidebar.className = 'sidebar'

  const header = document.createElement('div')
  header.className = 'sidebar-header'
  header.innerHTML = `
    <div class="sidebar-brand">
      <span class="sidebar-brand-icon">\ud83d\udcc4</span>
      <span class="sidebar-brand-title">PDF Tools</span>
    </div>
  `
  header.querySelector('.sidebar-brand')!.addEventListener('click', () => onToolClick('/home'))
  sidebar.appendChild(header)

  const nav = document.createElement('nav')
  nav.className = 'sidebar-nav'

  const label = document.createElement('div')
  label.className = 'sidebar-section-label'
  label.textContent = 'Ferramentas'
  nav.appendChild(label)

  for (const tool of tools) {
    const button = document.createElement('button')
    button.className = `sidebar-button${activeTool === tool.id ? ' active' : ''}`
    button.dataset.tool = tool.id
    button.innerHTML = `
      <span class="sidebar-icon">${tool.icon}</span>
      <span class="sidebar-button-label">${tool.title}</span>
    `
    button.addEventListener('click', () => onToolClick(tool.id))
    nav.appendChild(button)
  }

  sidebar.appendChild(nav)
  return sidebar
}

export function renderLayout(activeTool: string | null, children: HTMLElement, onToolClick: (toolId: string) => void): HTMLElement {
  const layout = document.createElement('div')
  layout.className = 'layout'

  layout.appendChild(renderSidebar(activeTool, onToolClick))

  const main = document.createElement('main')
  main.className = 'app-main'

  const content = document.createElement('div')
  content.className = 'app-content'
  content.appendChild(children)
  main.appendChild(content)

  layout.appendChild(main)
  return layout
}
