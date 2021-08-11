const Constants = require("./constants");
const HELPER = {};

HELPER.conditionalObjectFactory = (price, priceType = "MARKET_PRICE", type = "REACH") => {
  const conditionalObj = {
    type: type,
    price: price,
    priceType: priceType,
  };
  return conditionalObj;
};

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
  };
  if (conditionalObj != null) {
    order.conditional = conditionalObj;
  }

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
HELPER.BatchTargetProfitOrderFactory = (currentPrice, minProfitPrice, profitVolumePercentArr, symbol, amount) => {
  const orderlist = [];
  let diff = currentPrice - minProfitPrice;
  console.log(`diff is: ${diff}`);
  const tp_prices = [];

  for (let index = 0; index < profitVolumePercentArr.length; index++) {
    diff = diff / 1.6;
    //Set last price at minimum profit
    if (index + 1 === profitVolumePercentArr.length) {
      tp_prices.push(parseFloat(minProfitPrice.toFixed(1)));
    } else {
      tp_prices.unshift(parseFloat((currentPrice - diff).toFixed(1)));
    }
  }

  for (let index = 0; index < profitVolumePercentArr.length; index++) {
    const size = profitVolumePercentArr[index] * amount;
    const conditional = HELPER.conditionalObjectFactory(tp_prices[index]);

    orderlist.push(HELPER.orderFactory(size, symbol, "MARKET", "SELL", tp_prices[index], true, conditional));
  }
  return orderlist;
};

HELPER.BatchAccumulateOrderFactory = (
  entryPrice,
  deviationStep = 1.61803398875,
  maxLimit = 3000,
  symbol = "BTCUSD",
  type = "LIMIT",
  side = "BUY"
) => {
  //Generate order sizes based on maxLimit size (1 = 1USD)

  //TODO make first order size a parameter of this function
  const firstOrderSize = 4;
  const orderSizes = [];
  const orderPrices = [];
  orderSizes.push(firstOrderSize);

  let totalOrderSize = firstOrderSize;
  while (totalOrderSize < maxLimit) {
    let nextOrderSize = Math.ceil(orderSizes[orderSizes.length - 1] * deviationStep);
    if (totalOrderSize + nextOrderSize <= maxLimit) {
      totalOrderSize += nextOrderSize;
    } else {
      //Remove excess to stay within limit.
      const excess = totalOrderSize + nextOrderSize - maxLimit;
      nextOrderSize -= excess;
      totalOrderSize += nextOrderSize;
    }
    orderSizes.push(nextOrderSize);
  }

  //Generate price list based on order size count with depth at 60% away from entry price.
  const distance = entryPrice * 0.4;
  let diff = entryPrice - distance;
  // let lastPrice = parseFloat((entryPrice - diff).toFixed(1));
  let lastPrice = Math.floor(entryPrice - diff);
  orderPrices.unshift(lastPrice);
  for (let index = 0; index < orderSizes.length - 1; index++) {
    diff = diff / deviationStep;
    // const nextPrice = parseFloat((entryPrice - diff).toFixed(1));
    const nextPrice = Math.floor(entryPrice - diff);
    orderPrices.unshift(nextPrice);
  }

  //Now create orders with the generated prices and sizes
  const accumulationOrders = [];
  for (let index = 0; index < orderSizes.length; index++) {
    const orderPrice = orderPrices[index];
    const orderSize = orderSizes[index];

    //Buy in immediately on first order so remove its conditional.
    let conditional = null;
    //Apparently Conditionals don't work on batch orders.... keep it null if returning nothing;

    if (index > 0) {
      conditional = HELPER.conditionalObjectFactory(orderPrice);
    }

    const order = HELPER.orderFactory(
      (size = orderSize),
      symbol,
      type,
      side,
      (price = orderPrice),
      (reduceOnly = false),
      (conditionalObj = conditional)
    );
    accumulationOrders.push(order);
  }

  //TEST
  // console.log(accumulationOrders);
  // console.log(`Array Counts: [ ${orderPrices.length}, ${orderSizes.length}]`);
  // for (let index = 0; index < orderPrices.length; index++) {
  //   const p = orderPrices[index];
  //   const s = orderSizes[index];
  //   console.log(`${s} @ ${p}`);
  // }

  return accumulationOrders;
};

HELPER.BatchLoadingOrderFactory = function (
  entryPrice,
  currentHoldingAmount = 0,
  depth = 20,
  deviationStep = 1.61803398875,
  maxLimit = 200000,
  symbol = Constants.symbols.BTCUSD,
  type = Constants.types.MARKET,
  side = Constants.sides.BUY
) {
  if (currentHoldingAmount === 0) {
    throw "CurrentHoldings input is 0. No orders created.";
  }


  
// █▀ █ ▀█ █▀▀
// ▄█ █ █▄ ██▄

  //Generate order sizes based on maxLimit size (1 = 1USD)

  const orderSizes = [];
  const orderPrices = [];
  const totalOrderSizes = [];

  const firstOrderSize = (currentHoldingAmount / deviationStep) * Math.sin(1 / depth);
  // const firstOrderSize = currentHoldingAmount;
  orderSizes.push(firstOrderSize);

  //USE depth for array length

  let totalOrderSize = firstOrderSize + currentHoldingAmount;
  totalOrderSizes.push(totalOrderSize);

  for (let index = 1; index <= depth; index++) {
    if (totalOrderSize < maxLimit) {
      let nextOrderSize = (totalOrderSize / deviationStep) * Math.sin(index / depth);
      
      if (totalOrderSize + nextOrderSize <= maxLimit) {
        totalOrderSize += nextOrderSize;
        totalOrderSizes.push(totalOrderSize);
      } else {
        //Remove excess to stay within limit.
        const excess = totalOrderSize + nextOrderSize - maxLimit;
        nextOrderSize -= excess;
        if (nextOrderSize === 0) {
          console.log(`Met max loading amount of ${maxLimit}`);
          break;
        } else {
          totalOrderSize += nextOrderSize;
          totalOrderSizes.push(totalOrderSize);
        }
      }
      orderSizes.push(nextOrderSize);
    } else {
      console.log(`\nMet max loading amount of ${maxLimit} on iteration ${index} of ${depth}.\n`);
      break;
    }
  }

  
// █▀█ █▀█ █ █▀▀ █▀▀
// █▀▀ █▀▄ █ █▄▄ ██▄

  //Generate price list with depth at 20% away from entry price.
  const lastPrice = Math.floor(entryPrice * 1.1); //40000 -> 48000
  orderPrices.unshift(lastPrice);
  let finalStep = 1.1;
  let step = deviationStep;
  const stepIncrement = (deviationStep - finalStep) / orderSizes.length; 

  // let lastPrice = parseFloat((entryPrice - diff).toFixed(1));
  // let lastPrice = Math.floor(entryPrice - diff);
  let diff = lastPrice - entryPrice; //8000
  for (let index = 0; index < orderSizes.length - 1; index++) {
    // diff = diff / deviationStep; //4944
    diff = diff / step; //4944
    const nextPrice = Math.floor(entryPrice + diff); // 40000 + 4944 = 43055;

    step -= stepIncrement;
    orderPrices.unshift(nextPrice);
  }

  console.log(`Intitial Holdings(USD/BTC): ${currentHoldingAmount}/${currentHoldingAmount / entryPrice}`);


  
// █▀▀ ▄▀█ █▀▀ ▀█▀ █▀█ █▀█ █▄█
// █▀░ █▀█ █▄▄ ░█░ █▄█ █▀▄ ░█░

  //Now create orders with the generated prices and sizes
  const loadingOrders = [];
  for (let index = 0; index < orderSizes.length; index++) {
    const orderPrice = Math.floor(orderPrices[index]);
    const orderSize = Math.floor(orderSizes[index]);
    const total = Math.floor(totalOrderSizes[index]);
    console.log(
      `${index}\nSize(USD): ${orderSize}\nSize(BTC): ${orderSize / orderPrice}\nPrice: ${orderPrice}\nTotal(USD/BTC): ${total}/${
        total / orderPrice
      }\n`
    );
    //Buy in immediately on first order so remove its conditional.
    const conditional = HELPER.conditionalObjectFactory(orderPrice);
    //Apparently Conditionals don't work on batch orders.... keep it null if returning nothing;

    

    const order = HELPER.orderFactory(
      (size = orderSize),
      symbol,
      type,
      side,
      (price = orderPrice),
      (reduceOnly = false),
      (conditionalObj = conditional)
    );
    loadingOrders.push(order);
  }

  return loadingOrders;
};

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
// HELPER.BatchAccumulateOrderFactory(42000);
// console.log(HELPER.BatchLoadingOrderFactory(44000, currentHoldingAmount = 0.4));
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
