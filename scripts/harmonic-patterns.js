// Harmonic Pattern Recognition for ML Prediction

// Gartley Pattern
function calculateGartleyPattern(high, low, close, period = 50) {
    if (high.length < period || low.length < period || close.length < period) {
        return {
            isGartley: false,
            confidence: 0,
            patternType: 'none',
            levels: {
                x: 0, a: 0, b: 0, c: 0, d: 0
            }
        };
    }

    const recentData = {
        high: high.slice(-period),
        low: low.slice(-period),
        close: close.slice(-period)
    };

    // Find swing points
    const swingPoints = findSwingPoints(recentData.high, recentData.low);
    
    if (swingPoints.length < 5) {
        return {
            isGartley: false,
            confidence: 0,
            patternType: 'none',
            levels: { x: 0, a: 0, b: 0, c: 0, d: 0 }
        };
    }

    // Check for Gartley pattern
    const gartley = checkGartleyPattern(swingPoints);
    
    return {
        isGartley: gartley.isValid,
        confidence: gartley.confidence,
        patternType: gartley.isValid ? 'Gartley' : 'none',
        levels: gartley.levels
    };
}

// Bat Pattern
function calculateBatPattern(high, low, close, period = 50) {
    if (high.length < period || low.length < period || close.length < period) {
        return {
            isBat: false,
            confidence: 0,
            patternType: 'none',
            levels: {
                x: 0, a: 0, b: 0, c: 0, d: 0
            }
        };
    }

    const recentData = {
        high: high.slice(-period),
        low: low.slice(-period),
        close: close.slice(-period)
    };

    const swingPoints = findSwingPoints(recentData.high, recentData.low);
    
    if (swingPoints.length < 5) {
        return {
            isBat: false,
            confidence: 0,
            patternType: 'none',
            levels: { x: 0, a: 0, b: 0, c: 0, d: 0 }
        };
    }

    const bat = checkBatPattern(swingPoints);
    
    return {
        isBat: bat.isValid,
        confidence: bat.confidence,
        patternType: bat.isValid ? 'Bat' : 'none',
        levels: bat.levels
    };
}

// Butterfly Pattern
function calculateButterflyPattern(high, low, close, period = 50) {
    if (high.length < period || low.length < period || close.length < period) {
        return {
            isButterfly: false,
            confidence: 0,
            patternType: 'none',
            levels: {
                x: 0, a: 0, b: 0, c: 0, d: 0
            }
        };
    }

    const recentData = {
        high: high.slice(-period),
        low: low.slice(-period),
        close: close.slice(-period)
    };

    const swingPoints = findSwingPoints(recentData.high, recentData.low);
    
    if (swingPoints.length < 5) {
        return {
            isButterfly: false,
            confidence: 0,
            patternType: 'none',
            levels: { x: 0, a: 0, b: 0, c: 0, d: 0 }
        };
    }

    const butterfly = checkButterflyPattern(swingPoints);
    
    return {
        isButterfly: butterfly.isValid,
        confidence: butterfly.confidence,
        patternType: butterfly.isValid ? 'Butterfly' : 'none',
        levels: butterfly.levels
    };
}

// Crab Pattern
function calculateCrabPattern(high, low, close, period = 50) {
    if (high.length < period || low.length < period || close.length < period) {
        return {
            isCrab: false,
            confidence: 0,
            patternType: 'none',
            levels: {
                x: 0, a: 0, b: 0, c: 0, d: 0
            }
        };
    }

    const recentData = {
        high: high.slice(-period),
        low: low.slice(-period),
        close: close.slice(-period)
    };

    const swingPoints = findSwingPoints(recentData.high, recentData.low);
    
    if (swingPoints.length < 5) {
        return {
            isCrab: false,
            confidence: 0,
            patternType: 'none',
            levels: { x: 0, a: 0, b: 0, c: 0, d: 0 }
        };
    }

    const crab = checkCrabPattern(swingPoints);
    
    return {
        isCrab: crab.isValid,
        confidence: crab.confidence,
        patternType: crab.isValid ? 'Crab' : 'none',
        levels: crab.levels
    };
}

// Helper function to find swing points
function findSwingPoints(high, low) {
    const swingPoints = [];
    const lookback = 3;
    
    for (let i = lookback; i < high.length - lookback; i++) {
        // Check for swing high
        let isSwingHigh = true;
        for (let j = i - lookback; j <= i + lookback; j++) {
            if (j !== i && high[j] >= high[i]) {
                isSwingHigh = false;
                break;
            }
        }
        
        if (isSwingHigh) {
            swingPoints.push({
                index: i,
                price: high[i],
                type: 'high'
            });
        }
        
        // Check for swing low
        let isSwingLow = true;
        for (let j = i - lookback; j <= i + lookback; j++) {
            if (j !== i && low[j] <= low[i]) {
                isSwingLow = false;
                break;
            }
        }
        
        if (isSwingLow) {
            swingPoints.push({
                index: i,
                price: low[i],
                type: 'low'
            });
        }
    }
    
    // Sort by index
    swingPoints.sort((a, b) => a.index - b.index);
    
    return swingPoints;
}

// Check Gartley pattern
function checkGartleyPattern(swingPoints) {
    if (swingPoints.length < 5) {
        return { isValid: false, confidence: 0, levels: { x: 0, a: 0, b: 0, c: 0, d: 0 } };
    }
    
    // Get last 5 swing points
    const points = swingPoints.slice(-5);
    
    // Gartley ratios
    const ratios = {
        ab: 0.618, // AB should be 61.8% of XA
        bc: 0.382, // BC should be 38.2% of AB
        cd: 1.272  // CD should be 127.2% of BC
    };
    
    const tolerance = 0.1; // 10% tolerance
    
    const xa = Math.abs(points[1].price - points[0].price);
    const ab = Math.abs(points[2].price - points[1].price);
    const bc = Math.abs(points[3].price - points[2].price);
    const cd = Math.abs(points[4].price - points[3].price);
    
    const abRatio = ab / xa;
    const bcRatio = bc / ab;
    const cdRatio = cd / bc;
    
    const abValid = Math.abs(abRatio - ratios.ab) <= tolerance;
    const bcValid = Math.abs(bcRatio - ratios.bc) <= tolerance;
    const cdValid = Math.abs(cdRatio - ratios.cd) <= tolerance;
    
    const isValid = abValid && bcValid && cdValid;
    const confidence = isValid ? 
        (1 - Math.max(Math.abs(abRatio - ratios.ab), Math.abs(bcRatio - ratios.bc), Math.abs(cdRatio - ratios.cd))) * 100 : 0;
    
    return {
        isValid,
        confidence: Math.min(100, confidence),
        levels: {
            x: points[0].price,
            a: points[1].price,
            b: points[2].price,
            c: points[3].price,
            d: points[4].price
        }
    };
}

// Check Bat pattern
function checkBatPattern(swingPoints) {
    if (swingPoints.length < 5) {
        return { isValid: false, confidence: 0, levels: { x: 0, a: 0, b: 0, c: 0, d: 0 } };
    }
    
    const points = swingPoints.slice(-5);
    
    // Bat ratios
    const ratios = {
        ab: 0.382, // AB should be 38.2% of XA
        bc: 0.382, // BC should be 38.2% of AB
        cd: 2.618  // CD should be 261.8% of BC
    };
    
    const tolerance = 0.1;
    
    const xa = Math.abs(points[1].price - points[0].price);
    const ab = Math.abs(points[2].price - points[1].price);
    const bc = Math.abs(points[3].price - points[2].price);
    const cd = Math.abs(points[4].price - points[3].price);
    
    const abRatio = ab / xa;
    const bcRatio = bc / ab;
    const cdRatio = cd / bc;
    
    const abValid = Math.abs(abRatio - ratios.ab) <= tolerance;
    const bcValid = Math.abs(bcRatio - ratios.bc) <= tolerance;
    const cdValid = Math.abs(cdRatio - ratios.cd) <= tolerance;
    
    const isValid = abValid && bcValid && cdValid;
    const confidence = isValid ? 
        (1 - Math.max(Math.abs(abRatio - ratios.ab), Math.abs(bcRatio - ratios.bc), Math.abs(cdRatio - ratios.cd))) * 100 : 0;
    
    return {
        isValid,
        confidence: Math.min(100, confidence),
        levels: {
            x: points[0].price,
            a: points[1].price,
            b: points[2].price,
            c: points[3].price,
            d: points[4].price
        }
    };
}

// Check Butterfly pattern
function checkButterflyPattern(swingPoints) {
    if (swingPoints.length < 5) {
        return { isValid: false, confidence: 0, levels: { x: 0, a: 0, b: 0, c: 0, d: 0 } };
    }
    
    const points = swingPoints.slice(-5);
    
    // Butterfly ratios
    const ratios = {
        ab: 0.786, // AB should be 78.6% of XA
        bc: 0.382, // BC should be 38.2% of AB
        cd: 1.618  // CD should be 161.8% of BC
    };
    
    const tolerance = 0.1;
    
    const xa = Math.abs(points[1].price - points[0].price);
    const ab = Math.abs(points[2].price - points[1].price);
    const bc = Math.abs(points[3].price - points[2].price);
    const cd = Math.abs(points[4].price - points[3].price);
    
    const abRatio = ab / xa;
    const bcRatio = bc / ab;
    const cdRatio = cd / bc;
    
    const abValid = Math.abs(abRatio - ratios.ab) <= tolerance;
    const bcValid = Math.abs(bcRatio - ratios.bc) <= tolerance;
    const cdValid = Math.abs(cdRatio - ratios.cd) <= tolerance;
    
    const isValid = abValid && bcValid && cdValid;
    const confidence = isValid ? 
        (1 - Math.max(Math.abs(abRatio - ratios.ab), Math.abs(bcRatio - ratios.bc), Math.abs(cdRatio - ratios.cd))) * 100 : 0;
    
    return {
        isValid,
        confidence: Math.min(100, confidence),
        levels: {
            x: points[0].price,
            a: points[1].price,
            b: points[2].price,
            c: points[3].price,
            d: points[4].price
        }
    };
}

// Check Crab pattern
function checkCrabPattern(swingPoints) {
    if (swingPoints.length < 5) {
        return { isValid: false, confidence: 0, levels: { x: 0, a: 0, b: 0, c: 0, d: 0 } };
    }
    
    const points = swingPoints.slice(-5);
    
    // Crab ratios
    const ratios = {
        ab: 0.382, // AB should be 38.2% of XA
        bc: 0.886, // BC should be 88.6% of AB
        cd: 3.618  // CD should be 361.8% of BC
    };
    
    const tolerance = 0.1;
    
    const xa = Math.abs(points[1].price - points[0].price);
    const ab = Math.abs(points[2].price - points[1].price);
    const bc = Math.abs(points[3].price - points[2].price);
    const cd = Math.abs(points[4].price - points[3].price);
    
    const abRatio = ab / xa;
    const bcRatio = bc / ab;
    const cdRatio = cd / bc;
    
    const abValid = Math.abs(abRatio - ratios.ab) <= tolerance;
    const bcValid = Math.abs(bcRatio - ratios.bc) <= tolerance;
    const cdValid = Math.abs(cdRatio - ratios.cd) <= tolerance;
    
    const isValid = abValid && bcValid && cdValid;
    const confidence = isValid ? 
        (1 - Math.max(Math.abs(abRatio - ratios.ab), Math.abs(bcRatio - ratios.bc), Math.abs(cdRatio - ratios.cd))) * 100 : 0;
    
    return {
        isValid,
        confidence: Math.min(100, confidence),
        levels: {
            x: points[0].price,
            a: points[1].price,
            b: points[2].price,
            c: points[3].price,
            d: points[4].price
        }
    };
}

// Combined harmonic pattern analysis
function analyzeHarmonicPatterns(high, low, close, period = 50) {
    const gartley = calculateGartleyPattern(high, low, close, period);
    const bat = calculateBatPattern(high, low, close, period);
    const butterfly = calculateButterflyPattern(high, low, close, period);
    const crab = calculateCrabPattern(high, low, close, period);
    
    // Find the strongest pattern
    const patterns = [
        { name: 'Gartley', ...gartley },
        { name: 'Bat', ...bat },
        { name: 'Butterfly', ...butterfly },
        { name: 'Crab', ...crab }
    ];
    
    const strongestPattern = patterns.reduce((max, pattern) => 
        pattern.confidence > max.confidence ? pattern : max
    );
    
    return {
        strongestPattern: strongestPattern.name,
        strongestConfidence: strongestPattern.confidence,
        patterns: {
            gartley,
            bat,
            butterfly,
            crab
        },
        hasPattern: strongestPattern.confidence > 50,
        patternCount: patterns.filter(p => p.confidence > 30).length
    };
}

module.exports = {
    calculateGartleyPattern,
    calculateBatPattern,
    calculateButterflyPattern,
    calculateCrabPattern,
    analyzeHarmonicPatterns
}; 