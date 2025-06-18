// Destek ve Direnç Seviyeleri Bileşeni
const SupportResistanceLevels = ({ levels }) => {
    return (
        <div className="support-resistance-levels">
            <h3>Destek ve Direnç Seviyeleri</h3>
            <div className="levels-container">
                <div className="resistance-levels">
                    <h4>Direnç Seviyeleri</h4>
                    {levels.resistance.map((level, index) => (
                        <div key={index} className="level-item">
                            <span className="price">{level.price.toFixed(2)}</span>
                            <span className="strength">Güç: {level.strength}</span>
                        </div>
                    ))}
                </div>
                <div className="support-levels">
                    <h4>Destek Seviyeleri</h4>
                    {levels.support.map((level, index) => (
                        <div key={index} className="level-item">
                            <span className="price">{level.price.toFixed(2)}</span>
                            <span className="strength">Güç: {level.strength}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

// TradingDashboard bileşenini güncelle
const TradingDashboard = () => {
    // ... existing code ...

    return (
        <div className="trading-dashboard">
            {/* ... existing components ... */}
            
            <div className="analysis-section">
                <SupportResistanceLevels levels={currentPrediction.supportLevels} />
                <div className="dynamic-levels">
                    <h3>Dinamik Seviyeler</h3>
                    <div className="level-item">
                        <span>Destek: {currentPrediction.dynamicLevels.support[0].price.toFixed(2)}</span>
                        <span>Direnç: {currentPrediction.dynamicLevels.resistance[0].price.toFixed(2)}</span>
                    </div>
                </div>
            </div>
            
            {/* ... existing components ... */}
        </div>
    );
};

// ... existing code ... 