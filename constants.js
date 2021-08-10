const Constants = {}
Constants.eventNames = {
    PHASE_CHANGED: "PHASE_CHANGED",
    ACCUMULATE_ORDER_TRIGGERED: 'ACCUMULATE_ORDER_TRIGGERED',
    LOADING_ORDER_TRIGGERED: 'LOADING_ORDER_TRIGGERED',
    TP_ORDER_TRIGGERED: 'TP_ORDER_TRIGGERED'
  };
Constants.phases = {
    ACCUMULATE: 'ACCUMULATE',
    LOADING: 'LOADING'
}
Constants.symbols = {
  BTCUSD: 'BTCUSD',
  ETHUSD: 'ETHUSD',
  BTCUSDT: 'BTCUSDT',
  ETHUSDT: 'ETHUSDT',
  EOSUSDT: 'EOSUSDT'
};
Constants.sides = {
  BUY: 'BUY',
  SELL: 'SELL'
}
Constants.types = {
  MARKET: 'MARKET',
  LIMIT: 'LIMIT',
  IOC: 'IOC',
  FOK: 'FOK',
  POST_ONLY: 'POST_ONLY'
}
Constants.priceTypes = {
  MARK_PRICE: 'MARK_PRICE',
  INDEX_PRICE: 'INDEX_PRICE',
  MARKET_PRICE: 'MARKET_PRICE'
}

module.exports = Constants;