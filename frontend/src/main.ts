import './style/variables.css'
import './style/global.css'
import './style/home.css'
import { HomeView } from './components/home'
import { RotateView } from './components/rotate'
import { ExtractView } from './components/extract'
import { MergeView } from './components/merge'
import { Img2PdfView } from './components/img2pdf'

const API = import.meta.env.VITE_API_URL ?? ''

type Tool = 'rotate' | 'extract' | 'merge' | 'img2pdf' | null

interface State {
  currentTool: Tool
}

const state: State = { currentTool: null }

const app = document.getElementById('app')!

function render() {
  app.innerHTML = ''
  app.appendChild(HomeView({
    onNavigate: (tool: Tool) => {
      state.currentTool = tool
      render()
    }
  }))

  if (state.currentTool === 'rotate') {
    app.appendChild(RotateView({ api: API, onBack: () => { state.currentTool = null; render() } }))
  } else if (state.currentTool === 'extract') {
    app.appendChild(ExtractView({ api: API, onBack: () => { state.currentTool = null; render() } }))
  } else if (state.currentTool === 'merge') {
    app.appendChild(MergeView({ api: API, onBack: () => { state.currentTool = null; render() } }))
  } else if (state.currentTool === 'img2pdf') {
    app.appendChild(Img2PdfView({ api: API, onBack: () => { state.currentTool = null; render() } }))
  }
}

render()
