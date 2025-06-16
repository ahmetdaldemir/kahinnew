module.exports = {
  apps: [
    {
      name: 'kahinnew',
      script: 'server.js',
      name: 'kahinnew',
      script: 'server.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3200,
        BINANCE_API_KEY: '3zsP3b4WgikgXnRjspYuSLisJrePhH4XAL7ptjYWeykzNq7RDnRx8ZoegDDvZlMb',
        BINANCE_API_SECRET: 'lS282ERiqgVYC7EXCAIxRp81X0oOMEYqEku8r9LbV1RH6Ub6EytE9tirrfE7QQCW'
      }
    },
    {
      name: 'fetch-historical',
      script: 'scripts/fetch-historical-data.js',
      cron_restart: '0 * * * *', // Her saat başı otomatik başlat
      autorestart: false
    },
    {
      name: 'fetch-realtime',
      script: 'scripts/fetch-realtime-data.js',
      cron_restart: '*/5 * * * *', // Her 5 dakikada bir otomatik başlat
      autorestart: false
    },
    {
      name: 'ml-prediction',
      script: 'scripts/ml-prediction.js',
      cron_restart: '*/10 * * * *', // Her 10 dakikada bir otomatik başlat
      autorestart: false
    }
  ]
};