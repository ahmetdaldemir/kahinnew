-- Destek ve Direnç Seviyeleri Tablosu
CREATE TABLE IF NOT EXISTS support_resistance_levels (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    symbol TEXT NOT NULL,
    level_type TEXT NOT NULL, -- 'support' veya 'resistance'
    price REAL NOT NULL,
    strength INTEGER NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    is_dynamic BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (symbol) REFERENCES watch_list(symbol)
);

-- Tahmin Performans Tablosunu Güncelle
ALTER TABLE prediction_performance ADD COLUMN support_levels TEXT;
ALTER TABLE prediction_performance ADD COLUMN resistance_levels TEXT;
ALTER TABLE prediction_performance ADD COLUMN dynamic_levels TEXT; 