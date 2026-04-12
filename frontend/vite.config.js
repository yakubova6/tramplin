import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '')

  const authTarget = env.VITE_AUTH_PROXY_TARGET || 'http://localhost:9999'
  const profileTarget = env.VITE_PROFILE_PROXY_TARGET || 'http://localhost:8080'
  const opportunityTarget = env.VITE_OPPORTUNITY_PROXY_TARGET || 'http://localhost:8081'
  const moderationTarget = env.VITE_MODERATION_PROXY_TARGET || 'http://localhost:8082'
  const interactionTarget = env.VITE_INTERACTION_PROXY_TARGET || 'http://localhost:8083'
  const geoTarget = env.VITE_GEO_PROXY_TARGET || 'http://localhost:8084'
  const mediaTarget = env.VITE_MEDIA_PROXY_TARGET || 'http://localhost:8091'

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      proxy: {
        '/api/auth': {
          target: authTarget,
          changeOrigin: true,
          secure: false,
        },
        '/api/admin': {
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
        '/api/applicant/profile': {
          target: profileTarget,
          changeOrigin: true,
          secure: false,
        },
        '/api/employer/profile': {
          target: profileTarget,
          changeOrigin: true,
          secure: false,
        },
        '/api/employer/verification': {
          target: profileTarget,
          changeOrigin: true,
          secure: false,
        },
        '/api/employer/verifications': {
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

        '/api/geo': {
          target: geoTarget,
          changeOrigin: true,
          secure: false,
        },

        '/api/interaction': {
          target: interactionTarget,
          changeOrigin: true,
          secure: false,
        },
        '/api/employer/responses': {
          target: interactionTarget,
          changeOrigin: true,
          secure: false,
        },

        '/api/moderation': {
          target: moderationTarget,
          changeOrigin: true,
          secure: false,
        },

        '/api/media': {
          target: mediaTarget,
          changeOrigin: true,
          secure: false,
        },
        '/api/files': {
          target: mediaTarget,
          changeOrigin: true,
          secure: false,
        },
        '/media': {
          target: mediaTarget,
          changeOrigin: true,
          secure: false,
        },
      },
    },
  }
})