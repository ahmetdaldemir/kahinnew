-- Destek ve Direnç Seviyeleri Tablosu
CREATE TABLE IF NOT EXISTS support_resistance_levels (
    id INT AUTO_INCREMENT PRIMARY KEY,
    symbol VARCHAR(20) NOT NULL,
    level_type ENUM('support', 'resistance') NOT NULL,
    price DECIMAL(20,8) NOT NULL,
    strength INT NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    is_dynamic BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (symbol) REFERENCES watch_list(symbol)
);

-- Tahmin Performans Tablosunu Güncelle
ALTER TABLE prediction_performance 
ADD COLUMN support_levels TEXT,
ADD COLUMN resistance_levels TEXT,
ADD COLUMN dynamic_levels TEXT; 