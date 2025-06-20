require('dotenv').config();
const { query } = require('../db/db');

async function updateDatabaseSchema() {
    try {
        console.log('Updating database schema for advanced indicators...');
        
        // Add advanced indicator columns to prediction_performance table
        const alterQueries = [
            // Fibonacci Retracement Levels
            `ALTER TABLE prediction_performance 
             ADD COLUMN fib_level_0 DECIMAL(20,8) DEFAULT NULL,
             ADD COLUMN fib_level_236 DECIMAL(20,8) DEFAULT NULL,
             ADD COLUMN fib_level_382 DECIMAL(20,8) DEFAULT NULL,
             ADD COLUMN fib_level_500 DECIMAL(20,8) DEFAULT NULL,
             ADD COLUMN fib_level_618 DECIMAL(20,8) DEFAULT NULL,
             ADD COLUMN fib_level_786 DECIMAL(20,8) DEFAULT NULL,
             ADD COLUMN fib_level_100 DECIMAL(20,8) DEFAULT NULL`,
            
            // Fibonacci Extension Levels
            `ALTER TABLE prediction_performance 
             ADD COLUMN fib_ext_1272 DECIMAL(20,8) DEFAULT NULL,
             ADD COLUMN fib_ext_1618 DECIMAL(20,8) DEFAULT NULL,
             ADD COLUMN fib_ext_2618 DECIMAL(20,8) DEFAULT NULL,
             ADD COLUMN fib_ext_4236 DECIMAL(20,8) DEFAULT NULL`,
            
            // Fibonacci Analysis
            `ALTER TABLE prediction_performance 
             ADD COLUMN fib_support_strength DECIMAL(10,4) DEFAULT NULL,
             ADD COLUMN fib_resistance_strength DECIMAL(10,4) DEFAULT NULL,
             ADD COLUMN fib_nearest_level DECIMAL(20,8) DEFAULT NULL,
             ADD COLUMN fib_level_distance DECIMAL(10,4) DEFAULT NULL,
             ADD COLUMN fib_golden_ratio_strength DECIMAL(10,4) DEFAULT NULL,
             ADD COLUMN fib_nearest_support DECIMAL(20,8) DEFAULT NULL,
             ADD COLUMN fib_nearest_resistance DECIMAL(20,8) DEFAULT NULL`,
            
            // Fibonacci Confidence Boost
            `ALTER TABLE prediction_performance 
             ADD COLUMN fib_confidence_boost DECIMAL(10,4) DEFAULT NULL,
             ADD COLUMN enhanced_confidence DECIMAL(10,4) DEFAULT NULL`,
            
            // Harmonic Patterns
            `ALTER TABLE prediction_performance 
             ADD COLUMN harmonic_pattern VARCHAR(50) DEFAULT NULL,
             ADD COLUMN harmonic_confidence DECIMAL(10,4) DEFAULT NULL,
             ADD COLUMN harmonic_pattern_count INT DEFAULT 0,
             ADD COLUMN harmonic_confidence_boost DECIMAL(10,4) DEFAULT NULL`,
            
            // Advanced Momentum Indicators
            `ALTER TABLE prediction_performance 
             ADD COLUMN momentum_roc DECIMAL(10,4) DEFAULT NULL,
             ADD COLUMN momentum_oscillator DECIMAL(10,4) DEFAULT NULL,
             ADD COLUMN momentum_cci DECIMAL(10,4) DEFAULT NULL,
             ADD COLUMN momentum_williams_r DECIMAL(10,4) DEFAULT NULL,
             ADD COLUMN momentum_stoch_k DECIMAL(10,4) DEFAULT NULL,
             ADD COLUMN momentum_stoch_d DECIMAL(10,4) DEFAULT NULL,
             ADD COLUMN momentum_ultimate_osc DECIMAL(10,4) DEFAULT NULL,
             ADD COLUMN momentum_mfi DECIMAL(10,4) DEFAULT NULL,
             ADD COLUMN momentum_tsi DECIMAL(10,4) DEFAULT NULL,
             ADD COLUMN momentum_cmo DECIMAL(10,4) DEFAULT NULL,
             ADD COLUMN momentum_dpo DECIMAL(10,4) DEFAULT NULL,
             ADD COLUMN momentum_strength DECIMAL(10,4) DEFAULT NULL,
             ADD COLUMN momentum_is_bullish BOOLEAN DEFAULT FALSE,
             ADD COLUMN momentum_is_bearish BOOLEAN DEFAULT FALSE,
             ADD COLUMN momentum_confidence_boost DECIMAL(10,4) DEFAULT NULL`,
            
            // Volatility Analysis
            `ALTER TABLE prediction_performance 
             ADD COLUMN vol_historical DECIMAL(10,4) DEFAULT NULL,
             ADD COLUMN vol_parkinson DECIMAL(10,4) DEFAULT NULL,
             ADD COLUMN vol_garman_klass DECIMAL(10,4) DEFAULT NULL,
             ADD COLUMN vol_rogers_satchell DECIMAL(10,4) DEFAULT NULL,
             ADD COLUMN vol_atr DECIMAL(10,4) DEFAULT NULL,
             ADD COLUMN vol_ratio DECIMAL(10,4) DEFAULT NULL,
             ADD COLUMN vol_chaikin DECIMAL(10,4) DEFAULT NULL,
             ADD COLUMN vol_vix DECIMAL(10,4) DEFAULT NULL,
             ADD COLUMN vol_bb_width DECIMAL(10,4) DEFAULT NULL,
             ADD COLUMN vol_keltner_width DECIMAL(10,4) DEFAULT NULL,
             ADD COLUMN vol_breakout BOOLEAN DEFAULT FALSE,
             ADD COLUMN vol_breakout_strength DECIMAL(10,4) DEFAULT NULL,
             ADD COLUMN vol_regime VARCHAR(20) DEFAULT NULL,
             ADD COLUMN vol_trend VARCHAR(20) DEFAULT NULL,
             ADD COLUMN vol_confidence_boost DECIMAL(10,4) DEFAULT NULL`,
            
            // Risk Management
            `ALTER TABLE prediction_performance 
             ADD COLUMN risk_var_95 DECIMAL(10,4) DEFAULT NULL,
             ADD COLUMN risk_var_99 DECIMAL(10,4) DEFAULT NULL,
             ADD COLUMN risk_cvar_95 DECIMAL(10,4) DEFAULT NULL,
             ADD COLUMN risk_max_drawdown DECIMAL(10,4) DEFAULT NULL,
             ADD COLUMN risk_sharpe_ratio DECIMAL(10,4) DEFAULT NULL,
             ADD COLUMN risk_sortino_ratio DECIMAL(10,4) DEFAULT NULL,
             ADD COLUMN risk_calmar_ratio DECIMAL(10,4) DEFAULT NULL,
             ADD COLUMN risk_adjusted_return DECIMAL(10,4) DEFAULT NULL,
             ADD COLUMN risk_volatility DECIMAL(10,4) DEFAULT NULL,
             ADD COLUMN risk_level VARCHAR(20) DEFAULT NULL,
             ADD COLUMN risk_score DECIMAL(10,4) DEFAULT NULL,
             ADD COLUMN risk_confidence_boost DECIMAL(10,4) DEFAULT NULL`,
            
            // Total Confidence Boost
            `ALTER TABLE prediction_performance 
             ADD COLUMN total_confidence_boost DECIMAL(10,4) DEFAULT NULL,
             ADD COLUMN final_enhanced_confidence DECIMAL(10,4) DEFAULT NULL`
        ];

        for (const sql of alterQueries) {
            try {
                await query(sql);
                console.log('✓ Successfully executed:', sql.substring(0, 50) + '...');
            } catch (error) {
                if (error.message.includes('Duplicate column name')) {
                    console.log('⚠ Column already exists, skipping...');
                } else {
                    console.error('✗ Error executing query:', error.message);
                }
            }
        }

        // Create indexes for better performance
        const indexQueries = [
            `CREATE INDEX idx_harmonic_analysis ON prediction_performance (harmonic_confidence, harmonic_pattern)`,
            `CREATE INDEX idx_momentum_analysis ON prediction_performance (momentum_strength, momentum_is_bullish, momentum_is_bearish)`,
            `CREATE INDEX idx_volatility_analysis ON prediction_performance (vol_regime, vol_trend, vol_vix)`,
            `CREATE INDEX idx_risk_analysis ON prediction_performance (risk_level, risk_score, risk_sharpe_ratio)`,
            `CREATE INDEX idx_enhanced_confidence ON prediction_performance (final_enhanced_confidence, total_confidence_boost)`
        ];

        for (const sql of indexQueries) {
            try {
                await query(sql);
                console.log('✓ Created index:', sql.substring(0, 50) + '...');
            } catch (error) {
                if (error.message.includes('Duplicate key name')) {
                    console.log('⚠ Index already exists, skipping...');
                } else {
                    console.error('✗ Error creating index:', error.message);
                }
            }
        }

        console.log('Database schema update completed successfully!');
        
    } catch (error) {
        console.error('Error updating database schema:', error);
    } finally {
        process.exit(0);
    }
}

updateDatabaseSchema(); 