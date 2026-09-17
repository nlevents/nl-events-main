import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const API_ROUTES = {
  '/api/catalog': './api/catalog.js',
  '/api/inquiry': './api/inquiry.js',
  '/api/create-booking': './api/create-booking.js',
  '/api/bookingNotifications': './api/bookingNotifications.js',
  '/api/admin/state': './api/admin/state.js',
  '/api/admin/bootstrap': './api/admin/bootstrap.js',
  '/api/admin/inquiries': './api/admin/inquiries.js',
  '/api/account/bookings': './api/account/bookings.js',
  '/api/account/profile': './api/account/profile.js',
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
          const mod = await import(`${pathToFileURL(file).href}?dev=${Date.now()}`)
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

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  Object.assign(process.env, env)
  return {
  plugins: [react(), localApiPlugin()],
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
