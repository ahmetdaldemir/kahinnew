const express = require('express');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const { spawn } = require('child_process');

const app = express();
const port = process.env.PORT || 3200;

// Set up EJS as the view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Database connection
const dbPath = path.join(__dirname, 'data', 'crypto_analyzer.db');
const db = new sqlite3.Database(dbPath);

// Serve static files
app.use(express.static('public'));

// Main dashboard route
app.get('/', async (req, res) => {
    try {
        // Get top 50 predictions
        const predictions = await new Promise((resolve, reject) => {
            db.all(`
                SELECT * FROM prediction_performance 
                WHERE prediction_date = (
                    SELECT MAX(prediction_date) FROM prediction_performance
                )
                ORDER BY (confidence * 0.7 + profit_loss * 0.3) DESC
                LIMIT 50
            `, (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });

        // Get chart data for top 5 coins
        const topCoins = await Promise.all(predictions.slice(0, 5).map(async (prediction) => {
            const chartData = await new Promise((resolve, reject) => {
                db.all(`
                    SELECT timestamp, price 
                    FROM historical_data 
                    WHERE symbol = ? 
                    ORDER BY timestamp DESC 
                    LIMIT 100
                `, [prediction.symbol], (err, rows) => {
                    if (err) reject(err);
                    else resolve({
                        labels: rows.map(r => new Date(r.timestamp).toLocaleDateString()).reverse(),
                        prices: rows.map(r => r.price).reverse()
                    });
                });
            });

            return {
                symbol: prediction.symbol,
                chartData
            };
        }));

        res.render('index', { predictions, topCoins });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).send('Internal Server Error');
    }
});

// API endpoint to run predictions
app.post('/api/run-predictions', (req, res) => {
    const predictionProcess = spawn('node', ['scripts/ml-prediction.js']);

    predictionProcess.stdout.on('data', (data) => {
        console.log(`Prediction process output: ${data}`);
    });

    predictionProcess.stderr.on('data', (data) => {
        console.error(`Prediction process error: ${data}`);
    });

    predictionProcess.on('close', (code) => {
        if (code === 0) {
            res.json({ success: true });
        } else {
            res.json({ success: false, error: `Process exited with code ${code}` });
        }
    });
});

// Start the server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
}); 