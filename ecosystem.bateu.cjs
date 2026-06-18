const fs = require('node:fs')
const path = require('node:path')

const loadEnv = () => {
  const envPath = path.resolve(__dirname, '.env')
  if (!fs.existsSync(envPath)) return {}

  return fs.readFileSync(envPath, 'utf8')
    .split(/\r?\n/)
    .reduce((env, line) => {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) return env

      const separatorIndex = trimmed.indexOf('=')
      if (separatorIndex === -1) return env

      const key = trimmed.slice(0, separatorIndex).trim()
      const value = trimmed.slice(separatorIndex + 1).trim().replace(/^['"]|['"]$/g, '')
      env[key] = value
      return env
    }, {})
}

// loadEnv() injeta TODAS as chaves do .env da Bateu (MongoDB próprio, marca,
// tokens Lastlink, Web Push). O .env deve apontar para o banco bateu-hyper e
// usar NUXT_PUBLIC_APP_BRAND=bateu.
const env = {
  NODE_ENV: 'production',
  NUXT_PUBLIC_APP_BRAND: 'bateu',
  ...loadEnv(),
  // Porta fixa do 2º deploy (3098/3100/3101 ocupadas em produção, irmandade=3099).
  // Vem DEPOIS do loadEnv() de propósito, para sobrepor um eventual PORT
  // herdado do .env.
  PORT: '3110'
}

// Aviso em produção: sem as chaves VAPID, as notificações push ficam desligadas.
if (!env.VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_KEY) {
  console.warn('[ecosystem:bateu] VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY ausentes no .env — push desabilitado.')
}

module.exports = {
  apps: [
    {
      name: 'bateu',
      cwd: __dirname,
      script: '.output/server/index.mjs',
      // IMPORTANTE: manter 1 instância em modo fork. O agendador de notificações
      // (server/plugins/notification-scheduler.ts) roda dentro do processo; com
      // várias instâncias (cluster) cada notificação agendada dispararia em
      // duplicidade.
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env
    }
  ]
}
