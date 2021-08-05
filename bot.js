require("dotenv").config();

const API = require("./bigoneapi.js");

API.init({
  key: process.env["bigOneApiKey"],
  secret: process.env["bigOneApiSecret"],
});

let DEBUG = false;

async function getContractPositions() {
  try {
    API.contract.accounts.getCashandPositionDetail().then((resp) => {
      resp.catch((error) => {
        console.error(error);
      });
      let pos = [];
      resp.forEach((e) => {
        e.positions.forEach((p) => {
          // if(p.)
          pos.push(p);
        });
      });
      return pos;
    });
    // console.log(resp);
  } catch (err) {
    console.log(err);
  }
}

let lastPos = undefined;
const holdAmount = 4000;

function executeBTCUSD() {
  API.contract.accounts
    .getCashandPositionDetail()
    .then((resp) => {
      if (resp === undefined) {
        if (DEBUG) {
          console.log("response is undefined");
        }
        return;
      }
      let pos = [];
      try {
        resp.forEach((e) => {
          e.positions.forEach((p) => {
            // if(p.)
            pos.push(p);
          });
        });
        return pos;
      } catch (err) {
        if (DEBUG) {
          console.log(err);
        }
        return;
      }
    })
    .then((d) => {
      if (d === undefined) {
        if (DEBUG) {
          console.log("response is undefined");
        }
        return;
      }
      const currentPos = d.find((p) => p.symbol === "BTCUSD");

      if (currentPos.size === 0) {
        {
          console.log(
            `\n${currentPos.symbol} position is current inactive...\n`
          );
        }
        return;
      } else {
        if (lastPos) {
          if (DEBUG) {
            console.log(`\nLast Position is: ${lastPos.size}`);
            console.log(`Current Position is: ${currentPos.size}`);
          }

          //NEW POSITION TRIGGERED
          if (lastPos.size != currentPos.size) {
            //adjust stoploss
            if (DEBUG) {
              console.log("New Position Triggered!\n\n\n\n");
            }
            lastPos = currentPos;

            if (currentPos.size > 0) {
              //LONG POSITION
              //check to see if we are currently at loss or profit
              if (currentPos.markPrice >= currentPos.entryPrice) {
                //Profit
                if (currentPos.size > holdAmount) {
                  //Set a Take Profit for the excess funds above the entry price
                  const sellSize = currentPos.size - holdAmount;
                  //Set stoploss price at $100 above entry is we are above threshold, otherwise breakeven.
                  const sellPrice =
                    currentPos.markPrice - currentPos.entryPrice > 100
                      ? currentPos.entryPrice + 100
                      : currentPos.entryPrice;
                  //PLACE ORDER
                  API.contract.orders
                    .createOrder(
                      sellSize,
                      "BTCUSD",
                      "MARKET",
                      "SELL",
                      sellPrice,
                      true,
                      {
                        type: "REACH",
                        price: sellPrice,
                        priceType: "MARKET_PRICE",
                      }
                    )
                    .then((order) => console.log(order));
                }
              } else {
                //already at loss on postion update
              }
            }
          } else {
            //POSITION IS STILL THE SAME
            if (DEBUG) {
              console.log(
                "Position is still the same...checking for excess losses..."
              );
            }
            if (currentPos.unrealizedPnl < -0.005) {
              //Minimize Losses
              //PLACE ORDER
              const sellSize = Math.min(currentPos.size - holdAmount, 2000);
              if (sellSize > 0) {
                if (DEBUG) {
                  console.log(
                    `\nSelling excess holdings due to accumulated losses. Count: ${sellSize}\n`
                  );
                }
                API.contract.orders
                  .createOrder(
                    sellSize,
                    "BTCUSD",
                    "MARKET",
                    "SELL",
                    currentPos.markPrice - 25,
                    true,
                    {
                      type: "REACH",
                      price: currentPos.markPrice - 25,
                      priceType: "MARKET_PRICE"
                    }
                  )
                  .then((order) => {
                    if (DEBUG) {
                      console.log(order);
                    }
                  });
              }
            }
            if (DEBUG) {
              console.log(
                `Not closing... Current unrealized pnl is: ${currentPos.unrealizedPnl}\n`
              );
            }
          }
        } else {
          if (DEBUG) {
            console.log(`\nLast position is undefined!`);
          }
          lastPos = currentPos;
        }

        // console.log(currentPos);
      }
    });
}

setInterval(executeBTCUSD, 700);
