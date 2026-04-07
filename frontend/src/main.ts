import './style/variables.css'
import './style/global.css'
import './style/app.css'
import { renderLayout } from './components/layout'
import { HomeContent } from './components/home'
import { RotateView } from './components/rotate'
import { ExtractView } from './components/extract'
import { MergeView } from './components/merge'
import { Img2PdfView } from './components/img2pdf'

type Tool = 'rotate' | 'extract' | 'merge' | 'img2pdf' | null

const state = { currentTool: null as Tool }

const app = document.getElementById('app')!

// Sidebar navigation
window.addEventListener('navigate-tool', ((e: Event) => {
  const event = e as CustomEvent
  state.currentTool = event.detail.tool as Tool
  render()
}) as EventListener)

function render() {
  app.innerHTML = ''

  const content = state.currentTool === 'rotate'
    ? RotateView()
    : state.currentTool === 'extract'
    ? ExtractView()
    : state.currentTool === 'merge'
    ? MergeView()
    : state.currentTool === 'img2pdf'
    ? Img2PdfView()
    : HomeContent()

  const layout = renderLayout(state.currentTool, content, (toolId: string) => {
    state.currentTool = toolId as Tool
    render()
  })

  app.appendChild(layout)
}

render()
