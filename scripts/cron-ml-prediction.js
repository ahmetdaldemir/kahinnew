require('dotenv').config();
const cron = require('node-cron');
const { exec } = require('child_process');
const path = require('path');

console.log('🚀 Starting KahinNew ML Prediction Cron Service...');
console.log('📅 Scheduling automatic ML predictions...');

// Function to run ML prediction
function runMLPrediction() {
    console.log(`\n⏰ [${new Date().toISOString()}] Starting scheduled ML prediction...`);
    
    const scriptPath = path.join(__dirname, 'ml-prediction.js');
    
    exec(`node "${scriptPath}"`, (error, stdout, stderr) => {
        if (error) {
            console.error(`❌ ML Prediction Error: ${error.message}`);
            return;
        }
        if (stderr) {
            console.error(`⚠️ ML Prediction Warning: ${stderr}`);
        }
        console.log(`✅ ML Prediction completed successfully at ${new Date().toISOString()}`);
        console.log(`📊 Output: ${stdout.substring(0, 200)}...`);
    });
}

// Function to run database schema update
function runSchemaUpdate() {
    console.log(`\n🔧 [${new Date().toISOString()}] Running database schema update...`);
    
    const scriptPath = path.join(__dirname, 'update-db-schema.js');
    
    exec(`node "${scriptPath}"`, (error, stdout, stderr) => {
        if (error) {
            console.error(`❌ Schema Update Error: ${error.message}`);
            return;
        }
        if (stderr) {
            console.error(`⚠️ Schema Update Warning: ${stderr}`);
        }
        console.log(`✅ Schema update completed successfully at ${new Date().toISOString()}`);
    });
}

// Function to run indicator tests
function runIndicatorTests() {
    console.log(`\n🧪 [${new Date().toISOString()}] Running indicator tests...`);
    
    const scriptPath = path.join(__dirname, 'test-advanced-indicators.js');
    
    exec(`node "${scriptPath}"`, (error, stdout, stderr) => {
        if (error) {
            console.error(`❌ Indicator Test Error: ${error.message}`);
            return;
        }
        if (stderr) {
            console.error(`⚠️ Indicator Test Warning: ${stderr}`);
        }
        console.log(`✅ Indicator tests completed successfully at ${new Date().toISOString()}`);
    });
}

// Schedule tasks based on environment
const isProduction = process.env.NODE_ENV === 'production';

if (isProduction) {
    // Production schedule - more frequent updates
    console.log('🏭 Production mode detected - using intensive schedule');
    
    // Run ML prediction every 30 minutes
    cron.schedule('*/30 * * * *', () => {
        runMLPrediction();
    }, {
        scheduled: true,
        timezone: "UTC"
    });
    
    // Run schema update daily at 2 AM UTC
    cron.schedule('0 2 * * *', () => {
        runSchemaUpdate();
    }, {
        scheduled: true,
        timezone: "UTC"
    });
    
    // Run indicator tests weekly on Sunday at 3 AM UTC
    cron.schedule('0 3 * * 0', () => {
        runIndicatorTests();
    }, {
        scheduled: true,
        timezone: "UTC"
    });
    
} else {
    // Development schedule - less frequent updates
    console.log('🛠️ Development mode detected - using relaxed schedule');
    
    // Run ML prediction every 2 hours
    cron.schedule('0 */2 * * *', () => {
        runMLPrediction();
    }, {
        scheduled: true,
        timezone: "UTC"
    });
    
    // Run schema update daily at 1 AM UTC
    cron.schedule('0 1 * * *', () => {
        runSchemaUpdate();
    }, {
        scheduled: true,
        timezone: "UTC"
    });
    
    // Run indicator tests daily at 4 AM UTC
    cron.schedule('0 4 * * *', () => {
        runIndicatorTests();
    }, {
        scheduled: true,
        timezone: "UTC"
    });
}

// Run initial setup
console.log('🔧 Running initial setup...');

// Run schema update first
setTimeout(() => {
    runSchemaUpdate();
}, 5000);

// Run indicator tests after schema update
setTimeout(() => {
    runIndicatorTests();
}, 15000);

// Run first ML prediction after setup
setTimeout(() => {
    runMLPrediction();
}, 30000);

// Keep the process alive
console.log('🔄 Cron service is running. Press Ctrl+C to stop.');
console.log('📋 Scheduled tasks:');
console.log('   - ML Prediction: Every 30 minutes (prod) / 2 hours (dev)');
console.log('   - Schema Update: Daily at 2 AM UTC (prod) / 1 AM UTC (dev)');
console.log('   - Indicator Tests: Weekly (prod) / Daily (dev)');

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down cron service gracefully...');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n🛑 Received SIGTERM, shutting down...');
    process.exit(0);
});

// Error handling
process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
}); 