// Fibonacci Technical Indicators for ML Prediction

// Fibonacci Retracement Levels
function calculateFibonacciRetracement(high, low, period = 20) {
    if (high.length < period || low.length < period) {
        const currentPrice = high[high.length - 1];
        return {
            level0: currentPrice,
            level236: currentPrice,
            level382: currentPrice,
            level500: currentPrice,
            level618: currentPrice,
            level786: currentPrice,
            level100: currentPrice
        };
    }

    const recentHigh = Math.max(...high.slice(-period));
    const recentLow = Math.min(...low.slice(-period));
    const range = recentHigh - recentLow;

    if (range === 0) {
        const currentPrice = high[high.length - 1];
        return {
            level0: currentPrice,
            level236: currentPrice,
            level382: currentPrice,
            level500: currentPrice,
            level618: currentPrice,
            level786: currentPrice,
            level100: currentPrice
        };
    }

    return {
        level0: recentHigh,
        level236: recentHigh - (range * 0.236),
        level382: recentHigh - (range * 0.382),
        level500: recentHigh - (range * 0.500),
        level618: recentHigh - (range * 0.618),
        level786: recentHigh - (range * 0.786),
        level100: recentLow
    };
}

// Fibonacci Extension Levels
function calculateFibonacciExtension(high, low, close, period = 20) {
    if (high.length < period || low.length < period || close.length < period) {
        const currentPrice = close[close.length - 1];
        return {
            ext1272: currentPrice,
            ext1618: currentPrice,
            ext2618: currentPrice,
            ext4236: currentPrice
        };
    }

    const recentHigh = Math.max(...high.slice(-period));
    const recentLow = Math.min(...low.slice(-period));
    const currentPrice = close[close.length - 1];
    const range = recentHigh - recentLow;

    if (range === 0) {
        return {
            ext1272: currentPrice,
            ext1618: currentPrice,
            ext2618: currentPrice,
            ext4236: currentPrice
        };
    }

    // Determine trend direction
    const isUptrend = currentPrice > (recentHigh + recentLow) / 2;

    if (isUptrend) {
        return {
            ext1272: recentHigh + (range * 1.272),
            ext1618: recentHigh + (range * 1.618),
            ext2618: recentHigh + (range * 2.618),
            ext4236: recentHigh + (range * 4.236)
        };
    } else {
        return {
            ext1272: recentLow - (range * 1.272),
            ext1618: recentLow - (range * 1.618),
            ext2618: recentLow - (range * 2.618),
            ext4236: recentLow - (range * 4.236)
        };
    }
}

// Fibonacci Time Zones
function calculateFibonacciTimeZones(close, period = 20) {
    if (close.length < period) {
        return {
            timeZone1: 0,
            timeZone2: 0,
            timeZone3: 0,
            timeZone5: 0,
            timeZone8: 0,
            timeZone13: 0
        };
    }

    const recentData = close.slice(-period);
    const currentPrice = recentData[recentData.length - 1];
    
    // Calculate time-based Fibonacci levels
    const timeZones = [1, 2, 3, 5, 8, 13];
    const result = {};
    
    timeZones.forEach(zone => {
        if (zone < recentData.length) {
            result[`timeZone${zone}`] = recentData[recentData.length - zone] || currentPrice;
        } else {
            result[`timeZone${zone}`] = currentPrice;
        }
    });

    return result;
}

// Fibonacci Fan Lines
function calculateFibonacciFan(high, low, close, period = 20) {
    if (high.length < period || low.length < period || close.length < period) {
        const currentPrice = close[close.length - 1];
        return {
            fan236: currentPrice,
            fan382: currentPrice,
            fan500: currentPrice,
            fan618: currentPrice,
            fan786: currentPrice
        };
    }

    const recentHigh = Math.max(...high.slice(-period));
    const recentLow = Math.min(...low.slice(-period));
    const currentPrice = close[close.length - 1];
    const range = recentHigh - recentLow;

    if (range === 0) {
        return {
            fan236: currentPrice,
            fan382: currentPrice,
            fan500: currentPrice,
            fan618: currentPrice,
            fan786: currentPrice
        };
    }

    // Calculate fan lines based on trend
    const isUptrend = currentPrice > (recentHigh + recentLow) / 2;
    const timeProgress = period / 20; // Normalize time progress

    if (isUptrend) {
        return {
            fan236: recentLow + (range * 0.236 * timeProgress),
            fan382: recentLow + (range * 0.382 * timeProgress),
            fan500: recentLow + (range * 0.500 * timeProgress),
            fan618: recentLow + (range * 0.618 * timeProgress),
            fan786: recentLow + (range * 0.786 * timeProgress)
        };
    } else {
        return {
            fan236: recentHigh - (range * 0.236 * timeProgress),
            fan382: recentHigh - (range * 0.382 * timeProgress),
            fan500: recentHigh - (range * 0.500 * timeProgress),
            fan618: recentHigh - (range * 0.618 * timeProgress),
            fan786: recentHigh - (range * 0.786 * timeProgress)
        };
    }
}

// Fibonacci Arc Levels
function calculateFibonacciArc(high, low, close, period = 20) {
    if (high.length < period || low.length < period || close.length < period) {
        const currentPrice = close[close.length - 1];
        return {
            arc236: currentPrice,
            arc382: currentPrice,
            arc500: currentPrice,
            arc618: currentPrice
        };
    }

    const recentHigh = Math.max(...high.slice(-period));
    const recentLow = Math.min(...low.slice(-period));
    const currentPrice = close[close.length - 1];
    const range = recentHigh - recentLow;

    if (range === 0) {
        return {
            arc236: currentPrice,
            arc382: currentPrice,
            arc500: currentPrice,
            arc618: currentPrice
        };
    }

    // Calculate arc levels (simplified version)
    const midPoint = (recentHigh + recentLow) / 2;
    
    return {
        arc236: midPoint + (range * 0.236),
        arc382: midPoint + (range * 0.382),
        arc500: midPoint + (range * 0.500),
        arc618: midPoint + (range * 0.618)
    };
}

// Fibonacci Support/Resistance Strength
function calculateFibonacciStrength(high, low, close, period = 20) {
    if (high.length < period || low.length < period || close.length < period) {
        return {
            supportStrength: 0,
            resistanceStrength: 0,
            nearestLevel: 0,
            levelDistance: 0
        };
    }

    const fibLevels = calculateFibonacciRetracement(high, low, period);
    const currentPrice = close[close.length - 1];
    
    // Find nearest Fibonacci level
    const levels = [
        fibLevels.level0, fibLevels.level236, fibLevels.level382, 
        fibLevels.level500, fibLevels.level618, fibLevels.level786, fibLevels.level100
    ];
    
    let nearestLevel = levels[0];
    let minDistance = Math.abs(currentPrice - levels[0]);
    
    levels.forEach(level => {
        const distance = Math.abs(currentPrice - level);
        if (distance < minDistance) {
            minDistance = distance;
            nearestLevel = level;
        }
    });
    
    // Calculate strength based on proximity to levels
    const range = Math.max(...high.slice(-period)) - Math.min(...low.slice(-period));
    const normalizedDistance = minDistance / range;
    const strength = Math.max(0, 1 - normalizedDistance);
    
    // Determine if current price is near support or resistance
    const isNearSupport = currentPrice <= nearestLevel;
    const isNearResistance = currentPrice >= nearestLevel;
    
    return {
        supportStrength: isNearSupport ? strength : 0,
        resistanceStrength: isNearResistance ? strength : 0,
        nearestLevel: nearestLevel,
        levelDistance: normalizedDistance
    };
}

// Fibonacci Golden Ratio Analysis
function calculateGoldenRatioAnalysis(high, low, close, period = 20) {
    if (high.length < period || low.length < period || close.length < period) {
        return {
            goldenRatio: 1.618,
            goldenRatioInverse: 0.618,
            priceToGoldenRatio: 1,
            goldenRatioStrength: 0
        };
    }

    const recentHigh = Math.max(...high.slice(-period));
    const recentLow = Math.min(...low.slice(-period));
    const currentPrice = close[close.length - 1];
    const range = recentHigh - recentLow;

    if (range === 0) {
        return {
            goldenRatio: 1.618,
            goldenRatioInverse: 0.618,
            priceToGoldenRatio: 1,
            goldenRatioStrength: 0
        };
    }

    const goldenRatio = 1.618;
    const goldenRatioInverse = 0.618;
    
    // Calculate how close current price is to golden ratio levels
    const goldenRatioLevel = recentLow + (range * goldenRatioInverse);
    const priceToGoldenRatio = Math.abs(currentPrice - goldenRatioLevel) / range;
    const goldenRatioStrength = Math.max(0, 1 - priceToGoldenRatio);

    return {
        goldenRatio: goldenRatio,
        goldenRatioInverse: goldenRatioInverse,
        priceToGoldenRatio: priceToGoldenRatio,
        goldenRatioStrength: goldenRatioStrength
    };
}

module.exports = {
    calculateFibonacciRetracement,
    calculateFibonacciExtension,
    calculateFibonacciTimeZones,
    calculateFibonacciFan,
    calculateFibonacciArc,
    calculateFibonacciStrength,
    calculateGoldenRatioAnalysis
}; 