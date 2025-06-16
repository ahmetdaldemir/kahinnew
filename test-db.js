const { query } = require('./db');
async function test() {
  const sql = "INSERT INTO prediction_performance (symbol, prediction_date, predicted_signal, confidence, actual_price, predicted_price, profit_loss) VALUES (?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE predicted_signal=VALUES(predicted_signal), confidence=VALUES(confidence), actual_price=VALUES(actual_price), predicted_price=VALUES(predicted_price), profit_loss=VALUES(profit_loss)";
  const params = ['TEST3/USDT', '2024-06-16 18:00:00', 'BUY', 55.5, 1.23, 1.25, 2.1];
  const result = await query(sql, params);
  console.log(result);
}
test();