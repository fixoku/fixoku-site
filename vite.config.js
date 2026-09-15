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
        // Public account creation is disabled at the HTTP boundary. Student
        // registration and controlled invitation/bootstrap flows call Better Auth
        // in-process and therefore retain their explicit authority.
        if (request.url?.split('?', 1)[0] === '/api/auth/sign-up/email') {
          response.statusCode = 403
          response.setHeader('Content-Type', 'application/json; charset=utf-8')
          response.setHeader('Cache-Control', 'no-store')
          response.end(JSON.stringify({ error: 'SIGNUP_DISABLED' }))
          return
        }
        if (request.url?.startsWith('/api/trainer-applications')) {
          import('./api/account-lifecycle.js').then(({ default: handler }) => handler(request, response)).catch(next)
          return
        }
        if (request.url?.startsWith('/api/account-lifecycle/admin-invitation-accept') || request.url?.startsWith('/api/account-lifecycle/trainer-invitation-accept') || request.url?.startsWith('/api/invitation-accept')) {
          import('./api/invitation-accept.js').then(({ default: handler }) => handler(request, response)).catch(next)
          return
        }
        if (request.url?.startsWith('/api/account-lifecycle')) {
          import('./api/account-lifecycle.js').then(({ default: handler }) => handler(request, response)).catch(next)
          return
        }
        if (request.url?.startsWith('/api/panel-context')) {
          import('./api/panel-context.js').then(({ default: handler }) => handler(request, response)).catch(next)
          return
        }
        if (request.url?.startsWith('/api/admin/account-lifecycle')) {
          import('./api/admin/account-lifecycle.js').then(({ default: handler }) => handler(request, response)).catch(next)
          return
        }
        if (request.url?.startsWith('/api/admin/assignment-requests/')) {
          import('./api/admin/assignment-requests/[id].js').then(({ default: handler }) => handler(request, response)).catch(next)
          return
        }
        if (request.url?.startsWith('/api/admin/trainers/')) {
          import('./api/admin/trainers/[id].js').then(({ default: handler }) => handler(request, response)).catch(next)
          return
        }
        if (request.url === '/api/admin/trainers' || request.url?.startsWith('/api/admin/trainers?')) {
          import('./api/admin/trainers.js').then(({ default: handler }) => handler(request, response)).catch(next)
          return
        }
        if (request.url?.startsWith('/api/admin/finance')) {
          import('./api/admin/finance.js').then(({ default: handler }) => handler(request, response)).catch(next)
          return
        }
        if (request.url?.startsWith('/api/provider-status')) {
          import('./api/provider-status.js').then(({ default: handler }) => handler(request, response)).catch(next)
          return
        }
        if (request.url?.startsWith('/api/admin/payouts')) {
          import('./api/admin/payouts.js').then(({ default: handler }) => handler(request, response)).catch(next)
          return
        }
        if (request.url?.startsWith('/api/admin/inventory')) {
          import('./api/admin/inventory.js').then(({ default: handler }) => handler(request, response)).catch(next)
          return
        }
        if (request.url?.startsWith('/api/admin/products')) {
          if (request.url?.match(/^\/api\/admin\/products\/[^/?]+/u)) {
            import('./api/admin/products/[id].js').then(({ default: handler }) => { const parsed = new URL(request.url, 'http://local'); request.query = { id: parsed.pathname.split('/').pop() }; handler(request, response) }).catch(next)
            return
          }
          import('./api/admin/products.js').then(({ default: handler }) => handler(request, response)).catch(next)
          return
        }
        if (request.url?.startsWith('/api/admin/shipments')) {
          if (request.url?.match(/^\/api\/admin\/shipments\/[^/?]+/u)) {
            import('./api/admin/shipments/[id].js').then(({ default: handler }) => { const parsed = new URL(request.url, 'http://local'); request.query = { id: parsed.pathname.split('/').pop() }; handler(request, response) }).catch(next)
            return
          }
          import('./api/admin/shipments.js').then(({ default: handler }) => handler(request, response)).catch(next)
          return
        }
        if (request.url?.startsWith('/api/admin/packages/')) {
          import('./api/admin/packages/[id].js').then(({ default: handler }) => handler(request, response)).catch(next)
          return
        }
        if (request.url === '/api/admin/packages' || request.url?.startsWith('/api/admin/packages?')) {
          import('./api/admin/packages.js').then(({ default: handler }) => handler(request, response)).catch(next)
          return
        }
        if (request.url === '/api/admin/assignment-requests' || request.url?.startsWith('/api/admin/assignment-requests?')) {
          import('./api/admin/assignment-requests.js').then(({ default: handler }) => handler(request, response)).catch(next)
          return
        }
        if (request.url?.startsWith('/api/student/packages')) {
          import('./api/student/packages.js').then(({ default: handler }) => handler(request, response)).catch(next)
          return
        }
        if (request.url?.startsWith('/api/student/entitlements')) {
          import('./api/student/entitlements.js').then(({ default: handler }) => handler(request, response)).catch(next)
          return
        }
        if (request.url?.startsWith('/api/student/downloads/')) {
          import('./api/student/downloads/[id].js').then(({ default: handler }) => handler(request, response)).catch(next)
          return
        }
        if (request.url?.startsWith('/api/student/shipments')) {
          import('./api/student/shipments.js').then(({ default: handler }) => handler(request, response)).catch(next)
          return
        }
        if (request.url?.startsWith('/api/student/portal-context')) {
          import('./api/student/portal-context.js').then(({ default: handler }) => handler(request, response)).catch(next)
          return
        }
        if (request.url?.startsWith('/api/student/profile')) {
          import('./api/student/profile.js').then(({ default: handler }) => handler(request, response)).catch(next)
          return
        }
        if (request.url?.startsWith('/api/trainer/payout-account')) {
          import('./api/trainer/payout-account.js').then(({ default: handler }) => handler(request, response)).catch(next)
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
        if (request.url?.startsWith('/api/trainer/resources')) {
          import('./api/trainer/resources.js').then(({ default: handler }) => handler(request, response)).catch(next)
          return
        }
        if (request.url?.startsWith('/api/trainer/students/')) {
          import('./api/trainer/students/[id].js').then(({ default: handler }) => {
            const parsed = new URL(request.url, 'http://local');
            request.query = { id: parsed.pathname.split('/').pop() };
            handler(request, response);
          }).catch(next)
          return
        }
        if (request.url?.startsWith('/api/trainer/students')) {
          import('./api/trainer/students.js').then(({ default: handler }) => handler(request, response)).catch(next)
          return
        }
        if (request.url?.startsWith('/api/trainer/earnings')) {
          import('./api/trainer/earnings.js').then(({ default: handler }) => handler(request, response)).catch(next)
          return
        }
        if (request.url?.startsWith('/api/trainer/availability')) {
          import('./api/trainer/availability.js').then(({ default: handler }) => handler(request, response)).catch(next)
          return
        }
        if (request.url?.startsWith('/api/dev-login')) {
          import('./api/dev-login.js').then(({ default: handler }) => handler(request, response)).catch(next)
          return
        }
        if (request.url?.startsWith('/api/local-review/switch-user')) {
          import('./api/local-review/switch-user.js').then(({ default: handler }) => handler(request, response)).catch(next)
          return
        }
        if (request.url?.startsWith('/api/trainer/completions')) {
          import('./api/trainer/completions.js').then(({ default: handler }) => handler(request, response)).catch(next)
          return
        }
        if (request.url?.startsWith('/api/trainer/progress')) {
          import('./api/trainer/progress.js').then(({ default: handler }) => handler(request, response)).catch(next)
          return
        }
        if (request.url?.startsWith('/api/commerce/orders')) {
          import('./api/commerce/orders.js').then(({ default: handler }) => handler(request, response)).catch(next)
          return
        }
        if (request.url?.startsWith('/api/commerce/dev-settle')) {
          import('./api/commerce/dev-settle.js').then(({ default: handler }) => handler(request, response)).catch(next)
          return
        }
        if (request.url?.startsWith('/api/commerce/webhooks')) {
          import('./api/commerce/webhooks.js').then(({ default: handler }) => handler(request, response)).catch(next)
          return
        }
        if (request.url?.startsWith('/api/commerce/legal-snapshots')) {
          import('./api/commerce/legal-snapshots.js').then(({ default: handler }) => handler(request, response)).catch(next)
          return
        }
        if (request.url?.startsWith('/api/paytr/token')) {
          import('./api/paytr/token.js').then(({ default: handler }) => handler(request, response)).catch(next)
          return
        }
        if (request.url?.startsWith('/api/paytr/callback')) {
          import('./api/paytr/callback.js').then(({ default: handler }) => handler(request, response)).catch(next)
          return
        }
        if (request.url?.startsWith('/api/notifications')) {
          import('./api/notifications.js').then(({ default: handler }) => handler(request, response)).catch(next)
          return
        }
        if (request.url?.startsWith('/api/owner/finance')) {
          import('./api/owner/finance.js').then(({ default: handler }) => handler(request, response)).catch(next)
          return
        }
        if (request.url?.startsWith('/api/owner/payouts')) {
          import('./api/owner/payouts.js').then(({ default: handler }) => handler(request, response)).catch(next)
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
