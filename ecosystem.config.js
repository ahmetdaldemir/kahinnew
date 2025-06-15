module.exports = {
  apps: [{
    name: 'kahinnew',
    script: 'server.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3200,
      BINANCE_API_KEY: 'xxx',
      BINANCE_API_SECRET: 'yyy'
    }
  }]
};