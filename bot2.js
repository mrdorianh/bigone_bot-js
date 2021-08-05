require("dotenv").config();

let DEBUG = true;

const API = require("./bigoneapi.js");
API.init({
  key: process.env["bigOneApiKey"],
  secret: process.env["bigOneApiSecret"],
});

const BOT_SETTINGS = require("./bot_config.js");
const HELPER = require("./helper.js");
const phases = {
  INVACTIVE: "INVACTIVE",
  ACCUMULATE: "ACCUMULATE",
  LOADING: "LOADING",
};
const eventNames = {
  PHASE_CHANGED: "PHASE_CHANGED",
};


var events = require("events");
var eventEmitter = new events.EventEmitter();
//Create an event handler:
var phaseChangedEvent = function (last = "Nada", current = "nope") {
  console.log(last, current);
};
//Assign the event handler to an event:
eventEmitter.on(eventNames.PHASE_CHANGED, phaseChangedEvent);
//Fire the 'scream' event:
eventEmitter.emit(eventNames.PHASE_CHANGED, phases.INVACTIVE, phases.ACCUMULATE);

const accountDetail = {
  lastPosition: null,
  position: null,
  cash: null,
  currentPhase: phases.INVACTIVE,
  lastPhase: phases.INVACTIVE
};

const getCurrentPhaseStatus = (current_position) => {
  let current_phase;
  console.log(`MarkPrice: ${current_position.markPrice}`)
  console.log(`LoadingPrice: ${BOT_SETTINGS.loading_threshhold(current_position.entryPrice)}`)
  const isBelowLoadingThresh = current_position.markPrice < BOT_SETTINGS.loading_threshhold(current_position.entryPrice);
  //Check phase we are in: INACTIVE, ACCUMULATE or LOADING
  if (current_position.size === 0) {
    current_phase = phases.INVACTIVE;
  } else if (current_position.size != 0 && isBelowLoadingThresh) {
    current_phase = phases.ACCUMULATE;
  } else if (current_position.size != 0 && !isBelowLoadingThresh) {
    current_phase = phases.LOADING;
  }

  return current_phase;
};

async function getCashandPositionDetail() {
  try {
    return API.contract.accounts.getCashandPositionDetail().then((resp) => {
      // console.log(resp);
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

function execute() {
  try {
    if(accountDetail.lastPosition === null){
      //First run

    }
    //CHECK IF POSITION CHANGED
    
    
    
    //GET POSITION AND CASH
    getCashandPositionDetail()
      .then((e) => {
        accountDetail.cash = e.cash;
        accountDetail.position = e.position;
      })
      .then(() => {
        //GET CURRENT STATUS
        accountDetail.currentPhase = getCurrentPhaseStatus(accountDetail.position);
        console.log(accountDetail);
        
      });
  } catch (err) {
    console.log(err);
  }
}

execute();

// setInterval(execute, 700);
