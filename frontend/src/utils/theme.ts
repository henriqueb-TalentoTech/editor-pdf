export type ThemeMode = 'system' | 'light' | 'dark'

function getActiveTheme(mode: ThemeMode): 'light' | 'dark' {
  if (mode !== 'system') return mode
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function applyTheme(mode: ThemeMode) {
  const theme = getActiveTheme(mode)
  document.documentElement.setAttribute('data-theme', theme === 'light' ? 'light' : 'dark')
  localStorage.setItem('theme-mode', mode)
}

function getStoredTheme(): ThemeMode {
  return (localStorage.getItem('theme-mode') as ThemeMode) || 'system'
}

export function initTheme() {
  const mode = getStoredTheme()
  applyTheme(mode)
  // Listen for OS changes when in system mode
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (getStoredTheme() === 'system') applyTheme('system')
  })
}

export function setTheme(mode: ThemeMode) {
  applyTheme(mode)
  window.dispatchEvent(new CustomEvent('theme-change', { detail: { mode } }))
}

export function getTheme(): ThemeMode {
  return getStoredTheme()
}
