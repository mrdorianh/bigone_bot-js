// ▀█▀ ░█▄─░█ ▀█▀ ▀▀█▀▀
// ░█─ ░█░█░█ ░█─ ─░█──
// ▄█▄ ░█──▀█ ▄█▄ ─░█──
require("dotenv").config();
const DEBUG = true;
const API = require("./bigoneapi.js");
API.init({
  key: process.env["bigOneApiKey"],
  secret: process.env["bigOneApiSecret"],
});
const Constants = require("./constants");
const BOT = {
  isRunning: false,
  isPolling: false,
  isHandlingEvent: false,
  intervalID: null,
  startTime: null,
  //Pull all symbol calls from here TODO
  symbol: Constants.symbols.BTCUSD,
  lastPrice: 0,
  lastPosition: null,
  position: null,
  cash: null,
  currentPhase: Constants.phases.ACCUMULATE,
  lastPhase: Constants.phases.ACCUMULATE,
  settings: null,
  tpOrders: [],
  accumulationOrders: [],
  loadingOrders: [],
};
BOT.settings = require("./bot_config.js");

// █▀▀█ █▀▀█ █▀▀█ █▀▀ █▀▀ █▀▀ █▀▀
// █──█ █▄▄▀ █──█ █── █▀▀ ▀▀█ ▀▀█
// █▀▀▀ ▀─▀▀ ▀▀▀▀ ▀▀▀ ▀▀▀ ▀▀▀ ▀▀▀
function getCashandPositionDetail() {
  try {
    return API.contract.accounts.getCashandPositionDetail().then((resp) => {
      if (resp.hasOwnProperty("anomaly")) {
        console.log(resp);
        return;
      }

      if (resp === undefined) {
        if (DEBUG) {
          console.log("response is undefined");
        }
        return undefined;
      }
      const detail = {
        position: null,
        cash: null,
      };
      resp.forEach((e) => {
        e.positions.forEach((p) => {
          if (p.currency === "BTC") {
            detail.position = p;
          }
        });
        if (e.cash.currency === "BTC") {
          detail.cash = e.cash;
        }
      });
      // console.log(detail);
      return detail;
    });
  } catch (err) {
    console.log(err);
  }
}

/**
 *
 * @param {string} symbol Example: 'BTCUSD'. Preset values can be found in constants.js
 * @param {Array} orders Array of orders, can contain conditional parameter.
 * @param {number} delay Value in milliseconds between completion and the following call to create an order
 * @returns Array of response orders.
 */
async function createBatchConditionalOrder(symbol, orders, delay = 30) {
  try {
    console.log(`\nSubmitting Batch Order...`);
    // end the line
    // return API.contract.orders.createBatchOrder(symbol, orders).then((respOrders) => respOrders);
    const respOrders = [];
    async function createConditionalOrder(order) {
      if (order.price === 0) {
        console.log("Error here with price at $0");
        KillBot();
        throw "Kill it.";
      }
      return API.contract.orders.createOrder(
        (size = order.size),
        (symbol = order.symbol),
        (type = order.type),
        (side = order.side),
        (price = order.price),
        (reduceOnly = order.reduceOnly),
        (conditionalObj = order.conditional)
      );
    }
    const recursiveOrder = (index = 0) => {
      return new Promise((resolve, reject) => {
        // console.log(index);
        if (index < orders.length) {
          createConditionalOrder(orders[index])
            .then((order) => {
              process.stdout.write(`Submitted order #${index + 1} of ${orders.length}.....\r`);
              respOrders.push(order);
              //Set timeout prevents "Maximum call stack size exceeded" error
              return setTimeout(() => resolve(recursiveOrder(++index)), delay);
            })
            .catch((err) => {
              //Something bad happened. Cancel the orders that did make it out and return the error.
              console.log(err);
              //Cancellation order request.
              const ids = respOrders.map((order) => order.id);
              if (ids.length > 0) {
                console.log(`Cancelling already submitted orders:\n${ids}`);
                return cancelBatchOrder(BOT.symbol, ids)
                  .then(() => {
                    console.log("Orders canceled successfully.");
                    reject(err);
                  })
                  .catch((err) => console.log(`${err}\nOrder cancelation failed!`));
              } else {
                reject(err);
              }
            });
        } else {
          return resolve();
        }
      });
    };

    return recursiveOrder(0)
      .then(() => {
        console.log("\nOrders submitted successfully!");
        return respOrders;
      })
      .catch((err) => {
        console.log(err);
        return err;
      });
  } catch (err) {
    console.log(err);
  }
}

async function cancelBatchOrder(symbol, ids) {
  try {
    if (ids.length > 0) {
      return API.contract.orders.cancelBatchOrder(symbol, ids);
    } else {
      return "Empty list of ids provided...skipping cancel request.";
    }
  } catch (err) {
    console.log(err);
  }
}

async function getActiveOrdersList(symbol = Constants.symbols.BTCUSD) {
  return API.contract.orders.getActiveOrdersList(symbol).catch((err) => console.error(err));
}

async function getLastPrice(symbol = Constants.symbols.BTCUSD) {
  return API.contract.misc.getLastPrice(symbol);
}
//Cancels active orders, if any.
async function cancelActiveOrders() {
  console.log("Attempting to cancel all active orders.");
  return API.contract.orders
    .cancelActiveOrders(Constants.symbols.BTCUSD)
    .then((resp) => {
      console.log("All active orders should now be cancelled.");
    })
    .catch((err) => {
      console.log(err);
      throw err;
    });
}

async function pullBotCashAndPosition() {
  return getCashandPositionDetail()
    .then((e) => {
      BOT.cash = e.cash;
      BOT.position = e.position;
    })
    .catch((err) => err);
}

function pollEvents() {
  /**
   * Calls BOT.KillBot() if losses exceed value of BOT.settings.stopLossUSD.
   * @returns true if failsafe was triggered, otherwise false.
   */
  function failsafe() {
    if (BOT.position.unrealizedPnl * BOT.lastPrice < BOT.settings.stopLossUSD) {
      console.log("Stoploss Triggered!");
      BOT.KillBot();
      return true;
    } else {
      return false;
    }
  }

  if (!failsafe()) {
    if (!BOT.isPolling && !BOT.isHandlingEvent) {
      // console.log("Begin Poll");
      BOT.isPolling = true;
      let activeOrders = [];

      getLastPrice(BOT.symbol)
        .then((price) => {
          BOT.lastPrice = price;
          return pullBotCashAndPosition();
        })
        .then(() => {
          // PHASE_CHANGED
          return pollPhaseChanged();
          // return true;
        })
        .then((didPhaseChange) => {
          return new Promise((resolve, reject) => {
            if (didPhaseChange) {
              reject("Phase Changed. Skipping poll on triggers while event is being handled...");
            } else {
              //Get all the active orders to check against triggers
              getActiveOrdersList(BOT.symbol).then((activeList) => {
                activeOrders = activeList;
                resolve(null);
              });
            }
          });
        })
        .then(() => {
          // //ACCUMULATE_ORDER_TRIGGERED
          return pollAccumulateOrderTriggered(activeOrders);
        })
        .then((didAccumulateOrderTrigger) => {
          return new Promise((resolve, reject) => {
            if (didAccumulateOrderTrigger) {
              reject("Accumulation Order Triggered. Skipping poll on triggers while event is being handled...");
            } else {
              resolve(null);
            }
          });
        })
        .then(() => {
          // //LOADING_ORDER_TRIGGERED
          return pollLoadingOrderTriggered(activeOrders);
        })
        .then((didLoadingOrderTrigger) => {
          return new Promise((resolve, reject) => {
            if (didLoadingOrderTrigger) {
              reject("Loading Order Triggered. Skipping poll on triggers while event is being handled...");
            } else {
              resolve(null);
            }
          });
        })
        .then(() => {
          // // TP_ORDER_TRIGGERED
          return pollTpOrderTriggered(activeOrders);
        })
        .then((didTpOrderTrigger) => {
          return new Promise((resolve, reject) => {
            if (didTpOrderTrigger) {
              reject("TP Order Triggered. Skipping poll on triggers while event is being handled...");
            } else {
              resolve(null);
            }
          });
        })
        .then(() => {
          endPoll();
        })
        .catch((err) => {
          console.log(err);
          endPoll();
        });
    } else {
      // process.stdout.write(`Skipping Poll: BOT.isPolling = ${BOT.isPolling}; BOT.isHandlingEvent = ${BOT.isHandlingEvent}; BOT.currentPhase = ${BOT.currentPhase})     \r`);
    }
  }
  function endPoll() {
    BOT.isPolling = false;
    BOT.lastPosition = BOT.position;
    // console.log("End Poll");
  }
  async function pollPhaseChanged() {
    function determineCurrentPhase() {
      const loadingThreshPrice = getLoadingThreshPrice();
      // switch loading to acc only after all tp triggers

      if (BOT.lastPrice > loadingThreshPrice) {
        BOT.currentPhase = Constants.phases.LOADING;
      }
      //if below loading thresh and currently loading and we can tp orders waiting, stay in loading until profits are captured.
      else if (BOT.currentPhase === Constants.phases.LOADING && BOT.tpOrders.length > 0) {
        // BOT.currentPhase = Constants.phases.LOADING;
        return;
      } else {
        BOT.currentPhase = Constants.phases.ACCUMULATE;
      }
    }
    determineCurrentPhase();
    if (BOT.lastPhase != BOT.currentPhase) {
      eventEmitter.emit(Constants.eventNames.PHASE_CHANGED);
      return true;
    } else {
      return false;
    }
  }

  async function pollTpOrderTriggered(activeOrders) {
    if (BOT.currentPhase === Constants.phases.LOADING) {
      //Get the updated accumulation orders
      const activeIDs = activeOrders.map((activeOrder) => activeOrder.id);
      //Compare to see if any orders were triggered
      BOT.tpOrders.forEach((order, index) => {
        if (activeIDs.includes(order.id)) {
          //UNTRIGGERED
          return false;
        } else {
          //TRIGGERED
          const isLast = index + 1 === BOT.tpOrders.length;
          BOT.tpOrders.splice(index, 1);
          eventEmitter.emit(Constants.eventNames.TP_ORDER_TRIGGERED, isLast);
          return true;
        }
      });
    } else {
      return false;
    }
  }

  async function pollLoadingOrderTriggered(activeOrders) {
    if (BOT.currentPhase === Constants.phases.LOADING) {
      //Get the updated accumulation orders
      const activeIDs = activeOrders.map((activeOrder) => activeOrder.id);
      //Compare to see if any orders were triggered
      BOT.loadingOrders.forEach((order, index) => {
        if (activeIDs.includes(order.id)) {
          //UNTRIGGERED
          return false;
        } else {
          //TRIGGERED
          const isLast = index + 1 === BOT.loadingOrders.length;
          BOT.loadingOrders.splice(index, 1);
          eventEmitter.emit(Constants.eventNames.LOADING_ORDER_TRIGGERED, isLast);
          return true;
        }
      });
    } else {
      return false;
    }
  }

  async function pollAccumulateOrderTriggered(activeOrders) {
    if (BOT.currentPhase === Constants.phases.ACCUMULATE) {
      //Get the updated accumulation orders

      const activeIDs = activeOrders.map((activeOrder) => activeOrder.id);
      //Compare to see if any orders were triggered
      BOT.accumulationOrders.forEach((order, index) => {
        if (activeIDs.includes(order.id)) {
          //UNTRIGGERED
          return false;
        } else {
          //TRIGGERED
          const isLast = index + 1 === BOT.accumulationOrders.length;
          BOT.accumulationOrders.splice(index, 1);
          eventEmitter.emit(Constants.eventNames.ACCUMULATE_ORDER_TRIGGERED, isLast);
          return true;
        }
      });
    } else {
      return false;
    }
  }
}

// ░█▀▀▀ ░█──░█ ░█▀▀▀ ░█▄─░█ ▀▀█▀▀ ░█▀▀▀█
// ░█▀▀▀ ─░█░█─ ░█▀▀▀ ░█░█░█ ─░█── ─▀▀▀▄▄
// ░█▄▄▄ ──▀▄▀─ ░█▄▄▄ ░█──▀█ ─░█── ░█▄▄▄█

var events = require("events");
const HELPER = require("./helper.js");
var eventEmitter = new events.EventEmitter();

//Create event handlers:

var PHASE_CHANGED_HANDLER = function () {
  BOT.isHandlingEvent = true;
  console.log(Constants.eventNames.PHASE_CHANGED);
  console.log(BOT.currentPhase);

  // █▀▀ █▄░█ ▀█▀ █▀▀ █▀█   ▄▀█ █▀▀ █▀▀ █░█ █▀▄▀█ █░█ █░░ ▄▀█ ▀█▀ █▀▀
  // ██▄ █░▀█ ░█░ ██▄ █▀▄   █▀█ █▄▄ █▄▄ █▄█ █░▀░█ █▄█ █▄▄ █▀█ ░█░ ██▄
  if (BOT.currentPhase === Constants.phases.ACCUMULATE) {
    //Cancel all Orders
    getLastPrice(BOT.symbol)
      .then((price) => {
        console.log(`Last Price: ${price}`);
        BOT.lastPrice = price;
        return cancelActiveOrders();
      })
      .then(() => {
        resetBotOrders();
        // Create Accumulation orders
        //TODO request updated position if data is null or invalid
        const accuOrders = HELPER.BatchAccumulateOrderFactory(
          (entryPrice = BOT.lastPrice),
          (currentHoldingSize = BOT.position.size)
        );
        return accuOrders;
      })
      .then((accuOrders) => {
        return createBatchConditionalOrder(BOT.symbol, accuOrders);
      })
      .then((responseOrders) => {
        BOT.accumulationOrders = responseOrders;
        BOT.lastPhase = BOT.currentPhase;
        BOT.isHandlingEvent = false;
        console.log(`-----------\nLoading Threshhold Price: ${getLoadingThreshPrice()}\n-----------`);
      })
      .catch((err) => {
        console.log(err);
        BOT.lastPhase = BOT.currentPhase;
        BOT.isHandlingEvent = false;
      });
  }
  // █▀▀ █▄░█ ▀█▀ █▀▀ █▀█   █░░ █▀█ ▄▀█ █▀▄ █ █▄░█ █▀▀
  // ██▄ █░▀█ ░█░ ██▄ █▀▄   █▄▄ █▄█ █▀█ █▄▀ █ █░▀█ █▄█
  else if (BOT.currentPhase === Constants.phases.LOADING) {
    getLastPrice(BOT.symbol)
      .then((price) => {
        console.log(`Last Price: ${price}`);
        BOT.lastPrice = price;
        return cancelActiveOrders();
      })
      .then(() => {
        resetBotOrders();
        // Create Loading and TP orders
        const loadOrders = HELPER.BatchLoadingOrderFactory((entryPrice = BOT.lastPrice), (currentHoldingAmount = BOT.position.size));

        const minProfitPrice = HELPER.getMinProfitPrice(
          HELPER.getBreakEvenPrice(BOT.position.entryPrice, BOT.position.size, 0.0006)
        );
        const tpOrders = HELPER.BatchTargetProfitOrderFactory(
          BOT.lastPrice,
          minProfitPrice,
          BOT.settings.tp_volume_percentages,
          BOT.symbol,
          BOT.position.size
        );
        const loadAndTpOrders = [loadOrders, tpOrders];
        return loadAndTpOrders;
      })
      .then((loadAndTpOrders) => {
        const loadOrders = loadAndTpOrders[0];
        const tpOrders = loadAndTpOrders[1];
        const loadPromise = createBatchConditionalOrder(BOT.symbol, loadOrders);
        const tpPromise = createBatchConditionalOrder(BOT.symbol, tpOrders);
        return Promise.all([loadPromise, tpPromise]);
      })
      .then((responseOrdersArr) => {
        BOT.loadingOrders = responseOrdersArr[0];
        BOT.tpOrders = responseOrdersArr[1];
        //TODO revert if orders did not process correctly

        BOT.lastPhase = BOT.currentPhase;
        BOT.isHandlingEvent = false;
      })
      .catch((err) => {
        console.log(err);
        BOT.lastPhase = BOT.currentPhase;
        BOT.isHandlingEvent = false; //
        // BOT.KillBOT();
      });
  } else {
    BOT.isHandlingEvent = false;
    throw "Something is wrong with BOT.currentPhase";
  }
};

/**
 * Nothing needs to happen
 */
var ACCUMULATE_ORDER_TRIGGERED_HANDLER = function (isLast) {
  BOT.isHandlingEvent = true;
  console.log(Constants.eventNames.ACCUMULATE_ORDER_TRIGGERED);
  // console.log(JSON.stringify(BOT, null, 2));
  console.log(BOT.position);

  if (isLast) {
    console.log("Last accumulation order was triggered.");
    //TODO
  }

  BOT.isHandlingEvent = false;
};

/**
 * Delete old TP orders and create new TP orders based on new position size and profit range.
 */
var LOADING_ORDER_TRIGGERED_HANDLER = function (isLast) {
  BOT.isHandlingEvent = true;
  console.log(Constants.eventNames.LOADING_ORDER_TRIGGERED);
  // console.log(JSON.stringify(BOT, null, 2));
  console.log(BOT.position);

  //DELETE OLD TP ORDERS
  let ids = [];

  if (BOT.tpOrders.length > 0) {
    BOT.tpOrders.map((order) => order.id);
  }

  getLastPrice(BOT.symbol)
    .then((price) => {
      console.log(`Last Price: ${price}`);
      BOT.lastPrice = price;
      return cancelBatchOrder(BOT.symbol, ids);
    })
    .then((resp) => {
      // console.log(resp);
      BOT.tpOrders = [];

      //CREATE NEW TP ORDERS
      let breakeven = HELPER.getBreakEvenPrice(BOT.position.entryPrice, BOT.position.size, 0.0006);

      if (isLast) {
        console.log(`Last loading order was triggered.\nMaximizing capture profit by raising minProfit price.`);
        breakeven = (BOT.lastPrice - breakeven) / 1.618 + breakeven;
      }

      const tpOrders = HELPER.BatchTargetProfitOrderFactory(
        BOT.lastPrice,
        HELPER.getMinProfitPrice(breakeven),
        BOT.settings.tp_volume_percentages,
        BOT.symbol,
        BOT.position.size
      );
      return tpOrders;
    })
    .then((tpOrders) => {
      return createBatchConditionalOrder(BOT.symbol, tpOrders);
    })
    .then((responseOrders) => {
      BOT.tpOrders = responseOrders;
      BOT.isHandlingEvent = false;
    })
    .catch((err) => {
      console.log(err);
      BOT.isHandlingEvent = false;
    });
};

/**
 * Delete old LOADING orders and create new LOADING orders based on new position size and profit range.
 */
var TP_ORDER_TRIGGERED_HANDLER = function (isLast) {
  BOT.isHandlingEvent = true;
  console.log(Constants.eventNames.TP_ORDER_TRIGGERED);
  // console.log(JSON.stringify(BOT, null, 2));
  console.log(BOT.position);

  if (isLast) {
    console.log("Last TP order was triggered.");
    //Restart Bot
    BOT.RestartBot();
  } else {
    //DELETE OLD LOADING ORDERS

    let ids = [];
    if (BOT.loadingOrders.length > 0) {
      ids = BOT.loadingOrders.map((order) => order.id);
    }
    getLastPrice(BOT.symbol)
      .then((price) => {
        console.log(`Last Price: ${price}`);
        BOT.lastPrice = price;
        return cancelBatchOrder(BOT.symbol, ids);
      })
      .then((resp) => {
        // console.log(resp);
        BOT.loadingOrders = [];
        //CREATE NEW LOADING ORDERS
        const loadOrders = HELPER.BatchLoadingOrderFactory((entryPrice = BOT.lastPrice), (currentHoldingAmount = BOT.position.size));
        return loadOrders;
      })
      .then((loadOrders) => {
        // return createBatchOrder(BOT.symbol, loadOrders);
        return createBatchConditionalOrder(BOT.symbol, loadOrders);
      })
      .then((responseOrders) => {
        BOT.loadingOrders = responseOrders;
        BOT.isHandlingEvent = false;
      })
      .catch((err) => {
        console.log(err);
        BOT.isHandlingEvent = false;
      });
  }
};

//Assign the event handlers to each event:
eventEmitter.on(Constants.eventNames.PHASE_CHANGED, PHASE_CHANGED_HANDLER);
eventEmitter.on(Constants.eventNames.ACCUMULATE_ORDER_TRIGGERED, ACCUMULATE_ORDER_TRIGGERED_HANDLER);
eventEmitter.on(Constants.eventNames.LOADING_ORDER_TRIGGERED, LOADING_ORDER_TRIGGERED_HANDLER);
eventEmitter.on(Constants.eventNames.TP_ORDER_TRIGGERED, TP_ORDER_TRIGGERED_HANDLER);

//Fire an event example:
// eventEmitter.emit(Constants.eventNames.PHASE_CHANGED, phases.INVACTIVE, phases.ACCUMULATE);

// ░█─░█ █▀▀ █▀▀ █▀▀█ 　 ─█▀▀█ █▀▀ ▀▀█▀▀ ─▀─ █▀▀█ █▀▀▄ █▀▀
// ░█─░█ ▀▀█ █▀▀ █▄▄▀ 　 ░█▄▄█ █── ──█── ▀█▀ █──█ █──█ ▀▀█
// ─▀▄▄▀ ▀▀▀ ▀▀▀ ▀─▀▀ 　 ░█─░█ ▀▀▀ ──▀── ▀▀▀ ▀▀▀▀ ▀──▀ ▀▀▀
/**
 * //Open new position if size is 0 and begin poll. Otherwise return.
 * @param {*} currentPos
 * @returns
 */
BOT.StartBot = () => {
  // console.log(BOT.StartBot.name);
  if (BOT.isRunning) {
    console.log(`Bot is already running:\n${BOT}`);
    return;
  } else {
    //Open new position if size is 0 and begin poll. Otherwise return.
    getLastPrice(BOT.symbol)
      .then((price) => {
        BOT.lastPrice = price;
        return getCashandPositionDetail();
      })
      .then((e) => {
        BOT.cash = e.cash;
        BOT.position = e.position;
        BOT.startTime = new Date().toISOString();
      })
      .then(() => {
        if (BOT.position.size != 0) {
          console.log(`Can't start bot while position is already open: Position Size: ${BOT.position.size}`);
          console.log(BOT);
          return;
        } else {
          //Open new position
          console.log("Opening new position and accumulation orders.");
          BOT.isRunning = true;
          BOT.lastPhase = Constants.phases.ACCUMULATE;
          BOT.currentPhase = Constants.phases.ACCUMULATE;

          eventEmitter.emit(Constants.eventNames.PHASE_CHANGED);
          BOT.intervalID = setInterval(pollEvents, 700);
        }
      })
      .catch((err) => {
        console.log(err);
        BOT.KillBot();
      });
  }
};

/**
 * Stop Polling for events and cancel all open orders
 */
BOT.CancelBot = async () => {
  try {
    console.log(BOT.CancelBot.name);
    clearInterval(BOT.intervalID);
    BOT.intervalID = null;
  } catch (err) {
    console.log(err);
  } finally {
    BOT.isPolling = false;
    BOT.isRunning = false;
    BOT.isHandlingEvent = false;
    resetBotOrders();
    return cancelActiveOrders();
  }
};

/**
 * Calls CancelBot in addition to closing out position at Market Price.
 * returns Closing Order;
 */
BOT.KillBot = async () => {
  console.log(BOT.KillBot.name);
  //Cancel Pending
  return BOT.CancelBot()
    .then(() => {
      return getCashandPositionDetail();
    })
    .then((e) => {
      BOT.cash = e.cash;
      BOT.position = e.position;
      return getLastPrice(BOT.symbol);
    })
    .then((lastPrice) => {
      //Close position
      BOT.lastPrice = lastPrice;

      if (BOT.position.size > 0) {
        return API.contract.orders.createOrder(
          (size = BOT.position.size),
          (symbol = BOT.symbol),
          (type = Constants.types.MARKET),
          (side = Constants.sides.SELL),
          (price = BOT.lastPrice),
          (reduceOnly = true),
          (conditionalObj = null)
        );
      } else if (BOT.position < 0) {
        return API.contract.orders.createOrder(
          (size = BOT.position.size),
          (symbol = BOT.symbol),
          (type = Constants.types.MARKET),
          (side = Constants.sides.BUY),
          (price = BOT.lastPrice),
          (reduceOnly = true),
          (conditionalObj = null)
        );
      } else {
        return null;
      }
    })
    .catch(async (err) => {
      console.log(err);
      console.log("KillBot() failed. Trying again...");
      await BOT.KillBot();
    });
};

BOT.RestartBot = () => {
  console.log(BOT.RestartBot.name);
  BOT.KillBot().then(() => BOT.StartBot());
};

BOT.TestFunc = () => {
  // ----------------
  console.log(`\nTEST\n`);
};

function getLoadingThreshPrice() {
  try {
    // console.log(BOT.position.entryPrice);
    const entry = BOT.position.entryPrice;
    if (entry === 0) {
      throw "Entry is 0. Using last price.";
    }
    const loadingThreshPrice = BOT.settings.loading_threshhold(BOT.position.entryPrice);
    return Math.floor(loadingThreshPrice);
  } catch (err) {
    console.log(err);
    const loadingThreshPrice = BOT.settings.loading_threshhold(BOT.lastPrice);
    return Math.floor(loadingThreshPrice);
  }
}

function TEST_createAndCancelLoadingOrders() {
  const loading = HELPER.BatchLoadingOrderFactory(50000, 1000, 38000);
  console.log(loading);
  createBatchConditionalOrder(BOT.symbol, loading)
    .then((orders) => {
      console.log(orders);
      orders = orders.map((order) => order.id);
      return cancelBatchOrder(BOT.symbol, orders);
    })
    .then(() => console.log("Successfull deletion. Test passed."))
    .catch((err) => {
      console.log(err);
    });
}

function resetBotOrders() {
  BOT.accumulationOrders = [];
  BOT.loadingOrders = [];
  BOT.tpOrders = [];
}

function TEST_createAndCancelOrderBatch() {
  getCashandPositionDetail()
    .then((e) => {
      BOT.cash = e.cash;
      BOT.position = e.position;
      BOT.startTime = new Date().toISOString();
      // console.log(BOT);
      const accuOrders = HELPER.BatchAccumulateOrderFactory((entryPrice = e.position.markPrice - 10000));
      console.log(accuOrders);
      return accuOrders;
    })
    .then((accuOrders) => {
      return createBatchConditionalOrder("BTCUSD", accuOrders);
    })
    .then((responseOrders) => {
      BOT.accumulationOrders = responseOrders;
      return BOT;
      //
    })
    .then((bot) => {
      console.log(bot);

      console.log(`\n TESTING FETCH ORDERS AFTER START TIME: ${BOT.startTime}`);
      //THIS SHOULD NOT BE NESTED, TEST ONLY
      return API.contract.orders
        .getOrderList(BOT.startTime)
        .then((list) => {
          var ids = list.map((order) => order.id);
          //Here we need to filter against the relative type of order (ACC, LOAD, TP)
          console.log(ids);
          return ids;
        })
        .then((ids) => {
          return cancelBatchOrder("BTCUSD", ids);
        })
        .then((resp) => {
          console.log("Looks like orders were canceled!");
          //Response should be empty if successfull
          console.log(resp);
        })
        .catch((err) => console.log(err));
      //
    })
    .catch((err) => {
      console.log(err);
    });
}

// ░█▀▀▀ █─█ █▀▀█ █▀▀█ █▀▀█ ▀▀█▀▀ █▀▀
// ░█▀▀▀ ▄▀▄ █──█ █──█ █▄▄▀ ──█── ▀▀█
// ░█▄▄▄ ▀─▀ █▀▀▀ ▀▀▀▀ ▀─▀▀ ──▀── ▀▀▀

module.exports = BOT;
