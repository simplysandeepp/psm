import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import App from './App'
import './index.css'

registerSW({ immediate: true })

// iOS Safari only applies :active styles when some touch listener exists on the page.
document.addEventListener('touchstart', () => {}, { passive: true })

// YouTube-style tap ripple on list rows (transform/opacity only, so it stays smooth on iOS).
document.addEventListener('pointerdown', (e) => {
  const row = (e.target as HTMLElement).closest<HTMLElement>('.row-press')
  if (!row) return
  const r = row.getBoundingClientRect()
  const d = Math.max(r.width, r.height) * 2.2
  const dot = document.createElement('span')
  dot.className = 'ripple-dot'
  dot.style.cssText = `width:${d}px;height:${d}px;left:${e.clientX - r.left - d / 2}px;top:${e.clientY - r.top - d / 2}px`
  row.appendChild(dot)
  dot.addEventListener('animationend', () => dot.remove())
}, { passive: true })
createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>)
