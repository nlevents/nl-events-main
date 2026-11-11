import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { createHash } from 'node:crypto'

const API_ROUTES = {
  '/api/catalog': './api/catalog.js',
  '/api/catalog/products': './api/catalog/products.js',
  '/api/inquiry': './api/inquiry.js',
  '/api/create-booking': './api/create-booking.js',
  '/api/bookingNotifications': './api/bookingNotifications.js',
  '/api/admin/state': './api/admin/state.js',
  '/api/admin/bootstrap': './api/admin/bootstrap.js',
  '/api/admin/inquiries': './api/admin/inquiries.js',
}

function localApiPlugin() {
  return {
    name: 'nle-local-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const pathname = String(req.url || '').split('?')[0]
        const relative = API_ROUTES[pathname]
        if (!relative) return next()

        try {
          const file = path.resolve(process.cwd(), relative)
          if (!fs.existsSync(file)) return next()
          const mod = await import(pathToFileURL(file).href)
          const body = await new Promise((resolve, reject) => {
            if (req.method === 'GET' || req.method === 'HEAD') return resolve({})
            let raw = ''
            req.setEncoding('utf8')
            req.on('data', chunk => { raw += chunk })
            req.on('end', () => {
              if (!raw) return resolve({})
              try { resolve(JSON.parse(raw)) } catch { reject(new Error('Invalid JSON body.')) }
            })
            req.on('error', reject)
          })

          req.body = body
          req.headers = req.headers || {}
          const out = {
            statusCode: 200,
            headers: {},
            status(code) { this.statusCode = code; return this },
            setHeader(name, value) { this.headers[name] = value; return this },
            json(payload) {
              if (res.writableEnded) return
              res.statusCode = this.statusCode || 200
              Object.entries(this.headers).forEach(([k, v]) => res.setHeader(k, v))
              res.setHeader('Content-Type', 'application/json; charset=utf-8')
              res.end(JSON.stringify(payload))
            },
            end(payload = '') {
              if (res.writableEnded) return
              res.statusCode = this.statusCode || 200
              Object.entries(this.headers).forEach(([k, v]) => res.setHeader(k, v))
              res.end(payload)
            },
          }
          await mod.default(req, out)
          if (!res.writableEnded) out.end()
        } catch (error) {
          console.error(`Local API error for ${pathname}:`, error)
          if (!res.writableEnded) {
            res.statusCode = 500
            res.setHeader('Content-Type', 'application/json; charset=utf-8')
            res.end(JSON.stringify({ ok: false, error: error?.message || 'Local API error.' }))
          }
        }
      })
    },
  }
}

// Fills the CSP placeholders in dist/_headers after the build. Inline <script>
// blocks of index.html are allowed by SHA-256 hash (instead of 'unsafe-inline'),
// so any later edit to those scripts is re-hashed automatically on every build.
function cspPlugin(getEnv) {
  return {
    name: 'nle-csp',
    apply: 'build',
    closeBundle() {
      const dist = path.resolve(process.cwd(), 'dist')
      const htmlFile = path.join(dist, 'index.html')
      const headersFile = path.join(dist, '_headers')
      if (!fs.existsSync(htmlFile) || !fs.existsSync(headersFile)) return
      const html = fs.readFileSync(htmlFile, 'utf8')
      const hashes = []
      for (const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
        const attrs = match[1] || ''
        if (/\bsrc\s*=/i.test(attrs)) continue
        if (/\btype\s*=\s*["']?(?!text\/javascript|module)/i.test(attrs)) continue
        if (!match[2].trim()) continue
        hashes.push(`'sha256-${createHash('sha256').update(match[2], 'utf8').digest('base64')}'`)
      }
      if (!hashes.length) throw new Error('nle-csp: no inline scripts found to hash; refusing to ship a broken CSP.')
      let supabaseOrigin = 'https://*.supabase.co'
      try {
        const raw = getEnv().VITE_SUPABASE_URL
        if (raw) supabaseOrigin = `${new URL(raw).origin} https://*.supabase.co`
      } catch { /* keep wildcard fallback */ }
      let headers = fs.readFileSync(headersFile, 'utf8')
      headers = headers.replaceAll('__NLE_SCRIPT_HASHES__', [...new Set(hashes)].join(' ')).replaceAll('__NLE_SUPABASE_ORIGIN__', supabaseOrigin)
      if (headers.includes('__NLE_')) throw new Error('nle-csp: unresolved placeholder left in dist/_headers.')
      fs.writeFileSync(headersFile, headers)
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  Object.assign(process.env, env)

  const DEFAULT_CLOUD_NAME = 'jh0tqpsv'
  const DEFAULT_UPLOAD_PRESET = 'nle_development'

  const cloudName = (process.env.VITE_CLOUDINARY_CLOUD_NAME || env.VITE_CLOUDINARY_CLOUD_NAME || DEFAULT_CLOUD_NAME).trim()
  const uploadPreset = (process.env.VITE_CLOUDINARY_UPLOAD_PRESET || env.VITE_CLOUDINARY_UPLOAD_PRESET || DEFAULT_UPLOAD_PRESET).trim()

  console.log(`
=== BUILD DIAGNOSTIC: CLOUDINARY_CONFIG ===`)
  console.log(`cloudNamePresent=${Boolean(cloudName)}`)
  console.log(`uploadPresetPresent=${Boolean(uploadPreset)}`)
  console.log(`===========================================
`)

  return {
    define: {
      'import.meta.env.VITE_CLOUDINARY_CLOUD_NAME': JSON.stringify(cloudName),
      'import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET': JSON.stringify(uploadPreset),
    },
    plugins: [react(), localApiPlugin(), cspPlugin(() => process.env)],
    build: {
      target: 'es2018',
      cssCodeSplit: true,
      sourcemap: false,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('react-router') || id.includes('react-dom') || id.includes('/react/')) return 'react-vendor'
            }
          },
        },
      },
    },
  }
})
