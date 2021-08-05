const HELPER = {};

/**
 * get breakeven price when position has changed
 * @param {number} entryPrice
 * @param {number} currentHoldingAmount
 * @param {number} fundingFeePercentage
 * @returns Price as float
 */
HELPER.getBreakEvenPrice = (entryPrice, currentHoldingAmount, fundingFeePercentage = 0.0006) => {
  const breakEvenPrice = entryPrice + currentHoldingAmount * fundingFeePercentage * entryPrice;
  return breakEvenPrice;
};

/**
 * Get minimum profit above breakeven price to capture some profits.
 * @param {number} breakEvenPrice
 * @param {number} minProfitFeePercentage
 * @returns Price as float.
 */
HELPER.getMinProfitPrice = (breakEvenPrice, minProfitFeePercentage = 0.0002) => {
  return breakEvenPrice * (1 + minProfitFeePercentage);
};

/**
 * Creates an order object with the specified parameters
 * @param {*} size
 * @param {*} symbol
 * @param {*} type
 * @param {*} side
 * @param {*} price
 * @param {*} reduceOnly
 * @param {*} conditionalObj
 * @returns
 */
HELPER.orderFactory = (size, symbol, type, side, price, reduceOnly, conditionalObj) => {
  // const form = new FormData()
  let order = {
    size: size,
    symbol: symbol,
    type: type,
    side: side,
    price: price,
    reduceOnly: reduceOnly,
    conditional: conditionalObj,
  };

  return order;
};

/**
 * Get an array of TP orders. All prices will be overridden with relative calculated TP prices.
 * @param {*} currentPrice 
 * @param {*} minProfitPrice 
 * @param {*} profitVolumePercentArr 
 * @param {*} symbol 
 * @returns 
 */
HELPER.TargetProfitOrderFactory = (
  currentPrice,
  minProfitPrice,
  profitVolumePercentArr,
  symbol,
  amount
) => {
  
  const orderlist = [];
  let diff = currentPrice - minProfitPrice;
  console.log(`diff is: ${diff}`);
  const tp_prices = [];

  for (let index = 0; index < profitVolumePercentArr.length; index++) {
    diff = diff / 1.5;
    //Set last price at minimum profit
    if (index + 1 === profitVolumePercentArr.length) {
      tp_prices.push(parseFloat(minProfitPrice.toFixed(1)));
    } else {
      tp_prices.unshift(parseFloat((currentPrice - diff).toFixed(1)));
    }
  }

  for (let index = 0; index < profitVolumePercentArr.length; index++) {
    const size = profitVolumePercentArr[index] * amount;
    const conditional = {
      type: "REACH",
      price: tp_prices[index],
      priceType: "MARKET_PRICE",
    };

    orderlist.push(HELPER.orderFactory(size, symbol, 'MARKET', "SELL", tp_prices[index], true, conditional));
  }
  return orderlist;
};

HELPER.AccumulateOrderFactory = (firstOrderDeviation, deviationStep = 1.69, amount = 0) => {
//Generate order prices at a deviation.


console.log()


}

HELPER.LoadingOrderFactory = () => {
  

}

/**
 * Check if current position has updated
 * @param {*} currentPosition
 * @param {*} lastPosition
 * @returns {boolean} True if size property differs between position objects.
 */
HELPER.didPositionChange = (currentPosition, lastPosition) => {
  return currentPosition.size != lastPosition.size;
};


// ░█▀▀█ ░█▀▀▀ ░█▀▀█ ▀█▀ ░█▄─░█ 　 ▀▀█▀▀ ░█▀▀▀ ░█▀▀▀█ ▀▀█▀▀
// ░█▀▀▄ ░█▀▀▀ ░█─▄▄ ░█─ ░█░█░█ 　 ─░█── ░█▀▀▀ ─▀▀▀▄▄ ─░█──
// ░█▄▄█ ░█▄▄▄ ░█▄▄█ ▄█▄ ░█──▀█ 　 ─░█── ░█▄▄▄ ░█▄▄▄█ ─░█──

// const list = HELPER.TargetProfitOrderFactory(
//   50000,
//   49500,
//   [0.1, 0.15, 0.1, 0.15, 0.1, 0.08, 0.08, 0.08, 0.08],
//   "BTCUSD",
//   "MARKET",
//   "BUY",
//   true,
//   {
//     type: "REACH",
//     price: 0,
//     priceType: "MARKET_PRICE",
//   }
// );
// console.log(list);

// p1 = {
//   size: 1
// }
// p2 = {
//   size: 2
// }
// console.log(HELPER.didPositionChange(p1,p2));

// const bep = HELPER.getBreakEvenPrice(40000, 6.7, 0.0006);
// console.log(bep);

// console.log(HELPER.getMinProfitPrice(bep));

// ░█▀▀▀ ░█▄─░█ ░█▀▀▄ 　 ▀▀█▀▀ ░█▀▀▀ ░█▀▀▀█ ▀▀█▀▀
// ░█▀▀▀ ░█░█░█ ░█─░█ 　 ─░█── ░█▀▀▀ ─▀▀▀▄▄ ─░█──
// ░█▄▄▄ ░█──▀█ ░█▄▄▀ 　 ─░█── ░█▄▄▄ ░█▄▄▄█ ─░█──

module.exports = HELPER;
