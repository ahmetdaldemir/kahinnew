const technicalIndicators = require('technicalindicators');

class TechnicalIndicatorsService {
    calculateRSI(prices, period = 14) {
        const rsi = technicalIndicators.RSI.calculate({
            values: prices,
            period: period
        });
        return rsi;
    }

    calculateMACD(prices) {
        const macd = technicalIndicators.MACD.calculate({
            values: prices,
            fastPeriod: 12,
            slowPeriod: 26,
            signalPeriod: 9
        });
        return macd;
    }

    calculateBollingerBands(prices, period = 20, stdDev = 2) {
        const bb = technicalIndicators.BollingerBands.calculate({
            values: prices,
            period: period,
            stdDev: stdDev
        });
        return bb;
    }

    calculateEMA(prices, period = 20) {
        const ema = technicalIndicators.EMA.calculate({
            values: prices,
            period: period
        });
        return ema;
    }

    calculateSMA(prices, period = 20) {
        const sma = technicalIndicators.SMA.calculate({
            values: prices,
            period: period
        });
        return sma;
    }

    calculateStochastic(high, low, close, period = 14) {
        const stoch = technicalIndicators.Stochastic.calculate({
            high: high,
            low: low,
            close: close,
            period: period,
            signalPeriod: 3
        });
        return stoch;
    }

    calculateADX(high, low, close, period = 14) {
        const adx = technicalIndicators.ADX.calculate({
            high: high,
            low: low,
            close: close,
            period: period
        });
        return adx;
    }

    calculateAllIndicators(data) {
        const closes = data.map(d => d.close);
        const highs = data.map(d => d.high);
        const lows = data.map(d => d.low);

        return {
            rsi: this.calculateRSI(closes),
            macd: this.calculateMACD(closes),
            bb: this.calculateBollingerBands(closes),
            ema: this.calculateEMA(closes),
            sma: this.calculateSMA(closes),
            stoch: this.calculateStochastic(highs, lows, closes),
            adx: this.calculateADX(highs, lows, closes)
        };
    }

    generateSignal(indicators, currentPrice) {
        const lastRSI = indicators.rsi[indicators.rsi.length - 1];
        const lastMACD = indicators.macd[indicators.macd.length - 1];
        const lastBB = indicators.bb[indicators.bb.length - 1];
        
        // RSI bazlı sinyaller
        const rsiSignal = this.getRSISignal(lastRSI);
        
        // MACD bazlı sinyaller
        const macdSignal = this.getMACDSignal(lastMACD);
        
        // Bollinger Bands bazlı sinyaller
        const bbSignal = this.getBBSignal(currentPrice, lastBB);
        
        // Sinyalleri birleştir ve güven skorunu hesapla
        const signals = [rsiSignal, macdSignal, bbSignal];
        const buyCount = signals.filter(s => s === 'BUY').length;
        const sellCount = signals.filter(s => s === 'SELL').length;
        
        // Güven skoru hesapla (0-100 arası)
        const confidence = Math.round((Math.max(buyCount, sellCount) / signals.length) * 100);
        
        // Son sinyali belirle
        let finalSignal = 'HOLD';
        if (buyCount > sellCount && buyCount >= 2) {
            finalSignal = 'BUY';
        } else if (sellCount > buyCount && sellCount >= 2) {
            finalSignal = 'SELL';
        }
        
        return {
            signal: finalSignal,
            confidence,
            details: {
                rsi: {
                    value: lastRSI,
                    signal: rsiSignal
                },
                macd: {
                    value: lastMACD.MACD,
                    signal: macdSignal,
                    histogram: lastMACD.histogram
                },
                bollingerBands: {
                    upper: lastBB.upper,
                    middle: lastBB.middle,
                    lower: lastBB.lower,
                    signal: bbSignal
                }
            }
        };
    }

    getRSISignal(rsi) {
        if (rsi <= 30) return 'BUY';
        if (rsi >= 70) return 'SELL';
        return 'HOLD';
    }

    getMACDSignal(macd) {
        if (macd.histogram > 0 && macd.MACD > macd.signal) return 'BUY';
        if (macd.histogram < 0 && macd.MACD < macd.signal) return 'SELL';
        return 'HOLD';
    }

    getBBSignal(price, bb) {
        if (price <= bb.lower) return 'BUY';
        if (price >= bb.upper) return 'SELL';
        return 'HOLD';
    }
}

module.exports = new TechnicalIndicatorsService(); 