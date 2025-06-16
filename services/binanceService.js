const Binance = require('node-binance-api');
const moment = require('moment');

class BinanceService {
    constructor() {
        this.binance = new Binance().options({
            APIKEY: process.env.BINANCE_API_KEY,
            APISECRET: process.env.BINANCE_API_SECRET,
            useServerTime: true,
            recvWindow: 60000,
            verbose: false,
            testnet: false,
            reconnect: true,
            timeout: 30000
        });
    }

    async retryOperation(operation, maxRetries = 3, delay = 1000) {
        for (let i = 0; i < maxRetries; i++) {
            try {
                return await operation();
            } catch (error) {
                if (i === maxRetries - 1) throw error;
                if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT') {
                    console.log(`Retry attempt ${i + 1} after connection error:`, error.message);
                    await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
                    continue;
                }
                throw error;
            }
        }
    }

    async getCurrentPrices() {
        return this.retryOperation(async () => {
        try {
            const tickers = await this.binance.prices();
                if (!tickers || typeof tickers !== 'object') {
                    throw new Error('Invalid response from Binance API: prices data is missing or invalid');
                }
            return tickers;
        } catch (error) {
            console.error('Error fetching current prices:', error);
            throw error;
            }
        });
    }

    async validateSymbol(symbol) {
        try {
            const exchangeInfo = await this.binance.exchangeInfo();
            const validSymbols = exchangeInfo.symbols.map(s => s.symbol);
            if (!validSymbols.includes(symbol)) {
                throw new Error(`Symbol ${symbol} is not valid on Binance`);
            }
            return true;
        } catch (error) {
            console.error(`Error validating symbol ${symbol}:`, error);
            return false;
        }
    }

    async getHistoricalData(symbol, interval, limit = 30) {
        try {
            // Validate symbol first
            const isValid = await this.validateSymbol(symbol);
            if (!isValid) {
                console.warn(`Skipping invalid symbol: ${symbol}`);
                return [];
            }

            const endTime = moment().valueOf();
            const startTime = moment().subtract(limit, 'days').valueOf();
            
            console.log(`Fetching data for ${symbol} ${interval}...`);
            
            const candles = await new Promise((resolve, reject) => {
                this.binance.candlesticks(symbol, interval, {
                startTime,
                endTime,
                limit
                }, (error, data) => {
                    if (error) {
                        console.error(`Error in candlesticks callback for ${symbol}:`, error);
                        reject(error);
                        return;
                    }
                    resolve(data);
                });
            });

            console.log(`Received ${candles?.length || 0} candles for ${symbol}`);

            if (!Array.isArray(candles)) {
                console.error(`Invalid response for ${symbol} ${interval}:`, candles);
                return [];
            }

            if (candles.length === 0) {
                console.warn(`No data received for ${symbol} ${interval}`);
                return [];
            }

            return candles.map(candle => {
                if (!Array.isArray(candle) || candle.length < 6) {
                    console.warn(`Invalid candle data for ${symbol}:`, candle);
                    return null;
                }
                return {
                timestamp: candle[0],
                open: parseFloat(candle[1]),
                high: parseFloat(candle[2]),
                low: parseFloat(candle[3]),
                close: parseFloat(candle[4]),
                volume: parseFloat(candle[5])
                };
            }).filter(candle => candle !== null);
        } catch (error) {
            console.error(`Error fetching historical data for ${symbol} ${interval}:`, error);
            return [];
        }
    }

    async getMultipleTimeframes(symbol) {
        try {
            // Validate symbol first
            const isValid = await this.validateSymbol(symbol);
            if (!isValid) {
                console.warn(`Skipping invalid symbol: ${symbol}`);
                return {
                    daily: [],
                    fourHour: [],
                    hourly: []
                };
            }

            const [daily, fourHour, hourly] = await Promise.all([
                this.getHistoricalData(symbol, '1d'),
                this.getHistoricalData(symbol, '4h'),
                this.getHistoricalData(symbol, '1h')
            ]);

            return {
                daily: daily || [],
                fourHour: fourHour || [],
                hourly: hourly || []
            };
        } catch (error) {
            console.error(`Error fetching multiple timeframes for ${symbol}:`, error);
            throw error;
        }
    }
}

module.exports = new BinanceService(); 