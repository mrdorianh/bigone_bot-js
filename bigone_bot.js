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
  startTime: null,
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

async function createBatchOrder(symbol, orders) {
  try {
    return API.contract.orders.createBatchOrder(symbol, orders).then((respOrders) => respOrders);
    // const respOrders = [];
    
    // orders.forEach(async (order) => {
      
      //    const o = await API.contract.orders.createOrder(
        //     (size = order.size),
        //     (symbol = order.symbol),
        //     (type = order.type),
        //     (side = order.side),
        //     (price = order.price),
        //     (reduceOnly = order.reduceOnly),
        //     (conditionalObj = order.conditional)
        //   );
        //   console.log(`Pushing order:\n${JSON.stringify(o,null,2)}`);
        //   respOrders.push(o);
        // });
        
        // return respOrders;
      } catch (err) {
        console.log(err);
      }
    }
    
    async function cancelBatchOrder(symbol, ids) {
      try {
        return API.contract.orders.cancelBatchOrder(symbol, ids).then((e) => e);
      } catch (err) {
        console.log(err);
      }
    }
    
    async function cancelActiveOrders() {
      return API.contract.orders.cancelActiveOrders(Constants.symbols.BTCUSD).then((resp) => {
        console.log('All Orders should be cancelled');
      });
    }


let isPolling = false;
function pollEvents() {
  if (!isPolling) {
    isPolling = true;
    getCashandPositionDetail()
      .then((e) => {
        BOT.cash = e.cash;
        BOT.position = e.position;
      })
      .then(() => {
        // PHASE_CHANGED
        pollPhaseChanged();
        //Get all the orders the updated accumulation orders

        //ACCUMULATE_ORDER_TRIGGERED
        // pollAccumulateOrderTriggered();
        //
        if (BOT.currentPhase === Constants.phases.ACCUMULATE) {
          //Get the updated accumulation orders
          //Compare to see if any orders
        }

        //LOADING_ORDER_TRIGGERED
        if (BOT.currentPhase === Constants.phases.LOADING) {
        }
        // TP_ORDER_TRIGGERED
      });

    isPolling = false;
    function pollPhaseChanged() {
      determineCurrentPhase();
      if (BOT.lastPhase != BOT.currentPhase) {
        eventEmitter.emit(Constants.eventNames.PHASE_CHANGED);
      }
      function determineCurrentPhase() {
        if (BOT.position.markPrice > BOT.settings.loading_threshhold(BOT.position.entryPrice)) {
          BOT.currentPhase = Constants.phases.LOADING;
        } else {
          BOT.currentPhase = Constants.phases.ACCUMULATE;
        }
      }
    }
  }
}

// ░█▀▀▀ ░█──░█ ░█▀▀▀ ░█▄─░█ ▀▀█▀▀ ░█▀▀▀█
// ░█▀▀▀ ─░█░█─ ░█▀▀▀ ░█░█░█ ─░█── ─▀▀▀▄▄
// ░█▄▄▄ ──▀▄▀─ ░█▄▄▄ ░█──▀█ ─░█── ░█▄▄▄█

var events = require("events");
const HELPER = require("./helper.js");
const { rejects } = require("assert");
// const { isRegExp } = require("util");
var eventEmitter = new events.EventEmitter();

//Create event handlers:
var PHASE_CHANGED_HANDLER = function () {
  if (BOT.currentPhase === Constants.phases.ACCUMULATE) {
    //Cancel Open Loading Orders and Create Accumulation orders
    //TODO
  } else if (BOT.currentPhase === Constants.phases.LOADING) {
    //Cancel Accumulation orders and create Loading orders
    //TODO
  }
  BOT.lastPhase = BOT.currentPhase;
  BOT.lastPosition = BOT.position;
};

/**
 * Nothing needs to happen
 */
var ACCUMULATE_ORDER_TRIGGERED_HANDLER = function () {
  //OUTPUT STATUS DURING DEBUG
  //TODO
};

/**
 * Delete old TP orders and create new TP orders based on new position size and profit range.
 */
var LOADING_ORDER_TRIGGERED_HANDLER = function () {
  //DELETE OLD TP ORDERS
  //TODO
  //CREATE NEW TP ORDERS
  //TODO
};

/**
 * Delete old LOADING orders and create new LOADING orders based on new position size and profit range.
 */
var TP_ORDER_TRIGGERED_HANDLER = function () {
  //DELETE OLD LOADING ORDERS
  //TODO
  //CREATE NEW LOADING ORDERS
  //TODO
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
  if (BOT.isRunning) {
    console.log("Bot is already running.");
    return;
  } else {
    //Open new position if size is 0 and begin poll. Otherwise return.
    getCashandPositionDetail()
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
          console.log("Opening new position.");
          BOT.isRunning = true;
          //Create Accumulation Orders
          const accuOrders = HELPER.BatchAccumulateOrderFactory((entryPrice = BOT.position.markPrice - 10000));
          const responseOrders = createBatchOrder("BTCUSD", accuOrders);

          //TODO Return interval id as promise
          //Begin polling for events
          setInterval(pollEvents, 700);
        }
        // console.log(BOT);
      });
  }
};

/**
 * Stop Polling for events and cancel all open orders
 */
BOT.CancelBot = async () => {
  const ids = [];
  //Need to add all orderes, not just ACCUMULATION
  //TODO
  for (let index = 0; index < BOT.accumulationOrders.length; index++) {
    const element = BOT.accumulationOrders[index].id;
    ids.push(element);
  }
  if (ids.length > 0) {
    console.log("Attempting To cancel the following orders:");
    console.log(ids);
    return cancelBatchOrder("BTCUSD", ids)
      .then((resp) => resp)
      .catch((err) => console.log(err));
  } else {
    return Promise.reject("No orders to cancel!");
  }
};

/**
 * Calls CancelBot in addition to closing out position at Market Price.
 * returns Closing Order;
 */
BOT.KillBot = async () => {
  //Cancel Pending
  return BOT.CancelBot()
    .then((resp) => {
      return getCashandPositionDetail();
    })
    .then((e) => {
      BOT.cash = e.cash;
      BOT.position = e.position;
      return e;
    })
    .then((e) => {
      //Close position
      return API.contract.orders.createOrder(
        (size = e.position.size),
        (symbol = "BTCUSD"),
        (type = "MARKET"),
        (side = "SELL"),
        (price = e.position.markPrice),
        (reduceOnly = true),
        (conditionalObj = null)
      );
    })
    .catch((err) => console.log(err));
};

BOT.TestFunc = () => {
  // ----------------
  console.log(`\nTEST\n`);
  TEST_createAndCancelOrderBatch();
  // ----------------
    // API.contract.orders.getActiveOrdersList(Constants.symbols.BTCUSD).then((resp) => {
    //   console.log(resp);
    // }).catch(err => console.error(err));
    
  // ----------------------------
  // cancelActiveOrders();
  // ----------------------------

  // pollEvents()
};

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
      return createBatchOrder("BTCUSD", accuOrders);
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


