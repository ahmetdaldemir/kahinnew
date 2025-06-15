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
      BINANCE_API_KEY: '3zsP3b4WgikgXnRjspYuSLisJrePhH4XAL7ptjYWeykzNq7RDnRx8ZoegDDvZlMb',
      BINANCE_API_SECRET: 'lS282ERiqgVYC7EXCAIxRp81X0oOMEYqEku8r9LbV1RH6Ub6EytE9tirrfE7QQCW'
    }
  }]
};
