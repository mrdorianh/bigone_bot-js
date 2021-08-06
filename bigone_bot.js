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
    // return API.contract.orders.createBatchOrder(symbol, orders).then((respOrders) => respOrders);
    const respOrders = [];

    orders.forEach(async (order) => {
      
       const o = await API.contract.orders.createOrder(
        (size = order.size),
        (symbol = order.symbol),
        (type = order.type),
        (side = order.side),
        (price = order.price),
        (reduceOnly = order.reduceOnly),
        (conditionalObj = order.conditional)
      );
      console.log(`Pushing order:\n${JSON.stringify(o,null,2)}`);
      respOrders.push(o);
    });
    return respOrders;
  } catch (err) {
    console.log(err);
  }
}

function cancelBatchOrder(symbol, ids) {
  try {
    return API.contract.orders.cancelBatchOrder(symbol, ids).then((e) => e);
  } catch (err) {
    console.log(err);
  }
}

let isPolling = false;
function pollEvents() {
  if (!isPolling) {
    getCashandPositionDetail()
      .then((e) => {
        BOT.cash = e.cash;
        BOT.position = e.position;
      })
      .then(() => {
        // PHASE_CHANGED
        pollPhaseChanged();

        //ACCUMULATE_ORDER_TRIGGERED

        //LOADING_ORDER_TRIGGERED

        // TP_ORDER_TRIGGERED
      });

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
BOT.CancelBot = () => {
  const ids = [];
  //Need to add all orderes, not just ACCUMULATION
  //TODO
  for (let index = 0; index < BOT.accumulationOrders.length; index++) {
    const element = BOT.accumulationOrders[index].id;
    ids.push(element);
  }
  console.log("Attempting To cancel the following orders:");
  console.log(ids);
  cancelBatchOrder("BTCUSD", ids);
};

/**
 * Calls CancelBot in addition to closing out position at Market Price.
 */
BOT.KillBot = () => {
  //Cancel Pending
  BOT.CancelBot();

  //Close position
  getCashandPositionDetail().then((e) => {
    BOT.cash = e.cash;
    BOT.position = e.position;
    API.contract.orders.createOrder(
      (size = BOT.position.size),
      (symbol = "BTCUSD"),
      (type = "MARKET"),
      (side = "SELL"),
      (price = BOT.position.markPrice),
      (reduceOnly = true),
      (conditionalObj = null)
    );
  });
};

BOT.TestFunc = () => {
  console.log(`\nTEST\n`);
  getCashandPositionDetail().then((e) => {
    BOT.cash = e.cash;
    BOT.position = e.position;
    BOT.startTime = new Date().toISOString();
    // console.log(BOT);
    const accuOrders = HELPER.BatchAccumulateOrderFactory((entryPrice = BOT.position.markPrice - 10000));
    console.log(accuOrders);
    createBatchOrder("BTCUSD", accuOrders).then((responseOrders) => {
      BOT.accumulationOrders = responseOrders;
      console.log(BOT);
      setTimeout(() => {
        BOT.KillBot();
      }, 6000);
    });
  });
};

// ░█▀▀▀ █─█ █▀▀█ █▀▀█ █▀▀█ ▀▀█▀▀ █▀▀
// ░█▀▀▀ ▄▀▄ █──█ █──█ █▄▄▀ ──█── ▀▀█
// ░█▄▄▄ ▀─▀ █▀▀▀ ▀▀▀▀ ▀─▀▀ ──▀── ▀▀▀

module.exports = BOT;
