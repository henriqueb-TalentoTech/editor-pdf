interface HomeViewProps {
  onNavigate: (tool: 'rotate' | 'extract' | 'merge' | 'img2pdf') => void
}

const tools = [
  { id: 'rotate' as const, icon: '\ud83d\udd04', title: 'Rotacionar', desc: 'Gire p\u00e1ginas do seu PDF' },
  { id: 'extract' as const, icon: '\u2702\ufe0f', title: 'Extrair', desc: 'Selecione e extraia p\u00e1ginas' },
  { id: 'merge' as const, icon: '\ud83d\udd17', title: 'Juntar', desc: 'Una v\u00e1rios PDFs em um s\u00f3' },
  { id: 'img2pdf' as const, icon: '\ud83d\uddbc\ufe0f', title: 'Imagens \u2192 PDF', desc: 'Converta imagens para PDF' },
]

export function HomeView({ onNavigate }: HomeViewProps): HTMLElement {
  const container = document.createElement('div')

  // Hero
  const hero = document.createElement('div')
  hero.className = 'hero'
  hero.innerHTML = `
    <div class="hero-icon">\ud83d\udcc4</div>
    <h1>PDF Tools</h1>
    <p>Edite seus arquivos PDF de forma simples e r\u00e1pida</p>
  `
  container.appendChild(hero)

  // Tool cards
  const grid = document.createElement('div')
  grid.className = 'tools-grid'

  for (const tool of tools) {
    const card = document.createElement('div')
    card.className = 'tool-card'
    card.innerHTML = `
      <div class="tool-icon">${tool.icon}</div>
      <h3>${tool.title}</h3>
      <p>${tool.desc}</p>
    `
    card.addEventListener('click', () => onNavigate(tool.id))
    grid.appendChild(card)
  }

  container.appendChild(grid)
  return container
}
