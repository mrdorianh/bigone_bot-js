const Constants = require('./constants.js');

Constants = require('./constants.js');
const BOT_CONFIG = {
  tp_volume_percentages: [0.1, 0.15, 0.1, 0.15, 0.1, 0.08, 0.08, 0.08, 0.08],
  loading_threshhold_percent: 1.001,
  loading_threshhold: function(entryPrice) {
    const result = this.loading_threshhold_percent * entryPrice;
    return result;
  },
  side: Constants.sides.BUY,
  stopLossUSD: -100,
};

module.exports = BOT_CONFIG;
