const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class DatabaseService {
    constructor() {
        this.db = new sqlite3.Database(path.join(__dirname, '../crypto_data.db'));
    }

    async savePriceData(symbol, timeframe, data) {
        const stmt = this.db.prepare(`
            INSERT OR REPLACE INTO coin_data 
            (symbol, timestamp, open, high, low, close, volume)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `);

        for (const candle of data) {
            stmt.run(
                symbol,
                candle.timestamp,
                candle.open,
                candle.high,
                candle.low,
                candle.close,
                candle.volume
            );
        }

        stmt.finalize();
    }

    async saveTechnicalIndicators(symbol, timestamp, indicators) {
        const stmt = this.db.prepare(`
            INSERT OR REPLACE INTO technical_indicators 
            (symbol, timestamp, rsi, macd, macd_signal, bb_upper, bb_lower, 
             ema, sma, stochastic_k, stochastic_d, adx)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        stmt.run(
            symbol,
            timestamp,
            indicators.rsi,
            indicators.macd?.MACD,
            indicators.macd?.signal,
            indicators.bb?.upper,
            indicators.bb?.lower,
            indicators.ema,
            indicators.sma,
            indicators.stoch?.k,
            indicators.stoch?.d,
            indicators.adx
        );

        stmt.finalize();
    }

    async savePrediction(symbol, timestamp, prediction) {
        const stmt = this.db.prepare(`
            INSERT OR REPLACE INTO predictions 
            (symbol, timestamp, prediction, confidence, suggested_buy_price, suggested_sell_price)
            VALUES (?, ?, ?, ?, ?, ?)
        `);

        stmt.run(
            symbol,
            timestamp,
            prediction.signal,
            prediction.confidence,
            prediction.suggestedBuyPrice,
            prediction.suggestedSellPrice
        );

        stmt.finalize();
    }

    async updateWatchList(symbol, prediction) {
        const stmt = this.db.prepare(`
            INSERT OR REPLACE INTO watch_list 
            (symbol, timestamp, confidence, current_price, prediction, profit_rate)
            VALUES (?, ?, ?, ?, ?, ?)
        `);

        stmt.run(
            symbol,
            Date.now(),
            prediction.confidence,
            prediction.currentPrice,
            prediction.signal,
            prediction.potentialProfit
        );

        stmt.finalize();
    }

    async getHistoricalData(symbol, timeframe, limit = 30) {
        return new Promise((resolve, reject) => {
            this.db.all(
                `SELECT * FROM coin_data 
                 WHERE symbol = ? 
                 ORDER BY timestamp DESC 
                 LIMIT ?`,
                [symbol, limit],
                (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows);
                }
            );
        });
    }

    async getWatchList() {
        return new Promise((resolve, reject) => {
            this.db.all(
                `SELECT * FROM watch_list 
                 ORDER BY confidence DESC, profit_rate DESC`,
                (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows);
                }
            );
        });
    }
}

module.exports = new DatabaseService(); 