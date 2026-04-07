import { getTheme, setTheme, type ThemeMode } from '../utils/theme'

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
  sidebar.appendChild(renderThemeSelector())

  return sidebar
}

function renderThemeSelector(): HTMLElement {
  const bar = document.createElement('div')
  bar.className = 'theme-selector'

  const current = getTheme()
  const themes: { mode: ThemeMode; icon: string; label: string }[] = [
    { mode: 'system', icon: '\ud83d\udcbb', label: 'Sistema' },
    { mode: 'light', icon: '\u2600\ufe0f', label: 'Claro' },
    { mode: 'dark', icon: '\ud83c\udf19', label: 'Escuro' },
  ]

  for (const t of themes) {
    const btn = document.createElement('button')
    btn.className = `theme-btn${t.mode === current ? ' active' : ''}`
    btn.dataset.mode = t.mode
    btn.innerHTML = `<span class="theme-btn-icon">${t.icon}</span>${t.label}`
    btn.addEventListener('click', () => setTheme(t.mode))
    bar.appendChild(btn)
  }

  // Update active state when theme changes
  window.addEventListener('theme-change', ((e: Event) => {
    const activeMode = (e as CustomEvent).detail.mode
    bar.querySelectorAll<HTMLButtonElement>('.theme-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.mode === activeMode)
    })
  }) as EventListener)

  return bar
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
