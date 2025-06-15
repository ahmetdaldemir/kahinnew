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
const db = new sqlite3.Database(path.join(__dirname, 'data', 'crypto_analyzer.db'));

// Serve static files
app.use(express.static('public'));

// Main dashboard route
app.get('/', async (req, res) => {
    try {
        // Get latest predictions
        const predictions = await new Promise((resolve, reject) => {
            db.all(`
                SELECT * FROM prediction_performance 
                WHERE prediction_date >= datetime('now', '-1 day')
                ORDER BY prediction_date DESC
                LIMIT 10
            `, (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });

        // Get chart data
        const chartData = await new Promise((resolve, reject) => {
            db.all(`
                SELECT timestamp, close 
                FROM historical_data 
                WHERE symbol = 'BTC/USDT' 
                ORDER BY timestamp DESC 
                LIMIT 100
            `, (err, rows) => {
                if (err) reject(err);
                else {
                    resolve({
                        labels: rows.map(r => new Date(r.timestamp).toLocaleDateString()).reverse(),
                        prices: rows.map(r => r.close).reverse()
                    });
                }
            });
        });

        res.render('index', { predictions, chartData });
    } catch (error) {
        console.error('Error rendering dashboard:', error);
        res.status(500).send('Internal Server Error');
    }
});

// API endpoint to run ML predictions
app.post('/api/run-predictions', (req, res) => {
    const mlProcess = spawn('node', ['scripts/ml-prediction.js']);
    
    let output = '';
    
    mlProcess.stdout.on('data', (data) => {
        output += data.toString();
    });
    
    mlProcess.stderr.on('data', (data) => {
        console.error(`ML Process Error: ${data}`);
    });
    
    mlProcess.on('close', (code) => {
        if (code === 0) {
            res.json({ success: true, output });
        } else {
            res.status(500).json({ success: false, error: output });
        }
    });
});

// Start the server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
}); 