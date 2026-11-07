/** Browser-only helpers: clipboard, sharing, downloads, links. */

import { toast } from 'sonner'
import { BASE_PATH } from '@/lib/data'

/** Absolute link to the list page, e.g. for `#n=<id>` (WhatsApp messages use the same shape). */
export function linkStranice(hash = ''): string {
  return `${location.origin}${BASE_PATH}/${hash ? '#' + hash : ''}`
}

export function linkNekretnine(id: string): string {
  return linkStranice('n=' + encodeURIComponent(id))
}

/** Copies a link; without clipboard access shows it in a prompt to copy by hand. */
export async function kopirajLink(url: string): Promise<void> {
  try {
    if (!navigator.clipboard) throw new Error('clipboard API unavailable')
    await navigator.clipboard.writeText(url)
    toast.success('Link kopiran')
  } catch (e) {
    console.warn('kopirajLink: clipboard failed, falling back to prompt', e)
    window.prompt('Kopiraj link:', url)
  }
}

/** Web Share API (phones), else copy the link. */
export async function podijeli(naslov: string, tekst: string, url: string): Promise<void> {
  if (typeof navigator.share === 'function') {
    try {
      await navigator.share({ title: naslov, text: tekst, url })
    } catch (e) {
      // Closing the share sheet rejects with AbortError: nothing to do.
      if (!(e instanceof DOMException && e.name === 'AbortError')) {
        console.warn('podijeli: share failed, copying instead', e)
        await kopirajLink(url)
      }
    }
    return
  }
  await kopirajLink(url)
}

export function preuzmi(ime: string, sadrzaj: string, tip: string): void {
  const url = URL.createObjectURL(new Blob([sadrzaj], { type: tip }))
  const a = document.createElement('a')
  a.href = url
  a.download = ime
  document.body.appendChild(a)
  a.click()
  setTimeout(() => {
    URL.revokeObjectURL(url)
    a.remove()
  }, 1000)
}

/** Scrolls back up to the sticky header if the page is scrolled past it. */
export function naPonudu(): void {
  const p = document.getElementById('ponuda')
  if (p && window.scrollY > p.offsetTop) window.scrollTo(0, p.offsetTop)
}
