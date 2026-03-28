import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '')
  const authTarget = env.VITE_AUTH_PROXY_TARGET || 'http://localhost:9999'
  const profileTarget = env.VITE_PROFILE_PROXY_TARGET || 'http://localhost:8080'
  const opportunityTarget = env.VITE_OPPORTUNITY_PROXY_TARGET || 'http://localhost:8081'

  return {
    plugins: [react()],
    server: {
      proxy: {
        '/api/auth': {
          target: authTarget,
          changeOrigin: true,
          secure: false,
        },
        '/api/profile': {
          target: profileTarget,
          changeOrigin: true,
          secure: false,
          cookieDomainRewrite: '',
          cookiePathRewrite: '',
        },
        '/api/employer/verification': {
          target: profileTarget,
          changeOrigin: true,
          secure: false,
        },
        '/api/opportunities': {
          target: opportunityTarget,
          changeOrigin: true,
          secure: false,
        },
        '/api/tags': {
          target: opportunityTarget,
          changeOrigin: true,
          secure: false,
        },
        '/api/employer/opportunities': {
          target: opportunityTarget,
          changeOrigin: true,
          secure: false,
        },
        '/api/employer': {
          target: profileTarget,
          changeOrigin: true,
          secure: false,
        },
      },
    },
  }
})