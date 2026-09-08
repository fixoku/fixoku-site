import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { createInstitutionApplicationHandler } from './api/institution-application.js'
import fs from 'node:fs'

if (fs.existsSync('.env.local')) {
  for (const line of fs.readFileSync('.env.local', 'utf8').split(/\r?\n/u)) {
    const match = /^([A-Z][A-Z0-9_]*)=(.*)$/u.exec(line.trim())
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2]
  }
}

function institutionApplicationApi() {
  const handler = createInstitutionApplicationHandler()

  return {
    name: 'fixoku-institution-application-api',
    configureServer(server) {
      server.middlewares.use('/api/institution-application', (request, response, next) => {
        handler(request, response).catch(next)
      })
    },
  }
}

function betterAuthApi() {
  return {
    name: 'fixoku-better-auth-api',
    async configureServer(server) {
      if (!process.env.DATABASE_URL) return
      const [{ auth }, { toNodeHandler }] = await Promise.all([
        import('./src/server/auth/auth.js'),
        import('better-auth/node'),
      ])
      const handler = toNodeHandler(auth)
      server.middlewares.use((request, response, next) => {
        if (request.url?.startsWith('/api/panel-context')) {
          import('./api/panel-context.js').then(({ default: handler }) => handler(request, response)).catch(next)
          return
        }
        if (request.url?.startsWith('/api/trainer/profile')) {
          import('./api/trainer/profile.js').then(({ default: handler }) => handler(request, response)).catch(next)
          return
        }
        if (request.url?.startsWith('/api/trainer/trainings')) {
          import('./api/trainer/trainings.js').then(({ default: handler }) => handler(request, response)).catch(next)
          return
        }
        if (request.url?.startsWith('/api/trainer/presentations')) {
          import('./api/trainer/presentations.js').then(({ default: handler }) => handler(request, response)).catch(next)
          return
        }
        if (request.url?.startsWith('/api/dev-login')) {
          import('./api/dev-login.js').then(({ default: handler }) => handler(request, response)).catch(next)
          return
        }
        if (!request.url?.startsWith('/api/auth')) return next()
        handler(request, response).catch(next)
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), institutionApplicationApi(), betterAuthApi()],
  build: {
    rolldownOptions: {
      output: {
        manualChunks(id) {
          const normalizedId = id.replaceAll("\\", "/")
          if (!normalizedId.includes("/node_modules/")) return undefined

          if (
            normalizedId.includes("/react/") ||
            normalizedId.includes("/react-dom/") ||
            normalizedId.includes("/react-router") ||
            normalizedId.includes("/scheduler/")
          ) {
            return "react-vendor"
          }

          return undefined
        },
      },
    },
  },
})
