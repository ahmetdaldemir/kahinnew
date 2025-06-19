module.exports = {
  apps: [{
    name: 'kahin-app',
    script: 'server.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '300M',
    env: {
      NODE_ENV: 'production',
      PORT: 3200
    },
    env_development: {
      NODE_ENV: 'development',
      PORT: 3200
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    max_restarts: 10,
    min_uptime: '10s',
    restart_delay: 4000,
    kill_timeout: 5000,
    wait_ready: true,
    listen_timeout: 8000
  },
  {
    name: 'fetch-historical',
    script: 'scripts/fetch-historical-data.js',
    cron_restart: '0 * * * *', // Her saat başı otomatik başlat
    autorestart: false
  },
  {
    name: 'fetch-historical-4h',
    script: 'scripts/fetch-historical-data.js',
    cron_restart: '0 */4 * * *', // Her 4 saatte bir otomatik başlat
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