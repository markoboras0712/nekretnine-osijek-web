import type { NextConfig } from 'next'

// GitHub Pages serves the site at https://markoboras0712.github.io/nekretnine-osijek-web/.
const basePath = '/nekretnine-osijek-web'

const nextConfig: NextConfig = {
  // Static export to out/: no server code, everything runs in the browser.
  output: 'export',
  basePath,
  trailingSlash: true,
  images: { unoptimized: true },
  // Client code needs the base path for fetching podaci.json and for share links.
  env: { NEXT_PUBLIC_BASE_PATH: basePath },
}

export default nextConfig
