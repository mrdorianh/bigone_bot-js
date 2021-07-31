require('dotenv').config();

const API = require('./index.js')

API.init({
  key: process.env['bigOneApiKey'],
  secret: process.env['bigOneApiSecret']
})


async function getContractPositions() {
  try{
  const resp = await API.contract.accounts.getCashandPositionDetail();
  // console.log(resp);
  let pos = [];
  resp.forEach((e)=> {
    e.positions.forEach((p)=>{
      // if(p.)
      pos.push(p); 
    });
  })
  return pos;
  }
  catch(err){
    console.log(err);
  }
}

async function createOrder(){
  try{
  const order = await API.contract.orders.createOrder(1, 'BTCUSD', 'MARKET', 'SELL', 900, true, {
    "type": "REACH",
    "price": 1000,
    "priceType": "MARKET_PRICE"
  });
  // console.log(order);
  return order;
  }
  catch(err){
    console.log(err);
  }
}

// try{
  // API.contract.orders.createOrder(100, 'BTCUSD', 'MARKET', 'SELL', null, true, {
    //   "type": "REACH",
    //   "price": 30000,
    //   "priceType": "MARKET_PRICE"
    // }).then(d=>{console.log(d)});
    // }
    // catch(err){
      //   console.log(err);
      // }
      
// getContractPositions().then(data => console.log(data));
// getContractPositions().then(data => console.log(data));
createOrder().then((d)=>{console.log(d)});
      
// cash and contract positons
// API.contract.accounts.getCashandPositionDetail().then(data => {
//   // console.log(JSON.stringify(data,null,4));
//   console.log(JSON.stringify(data,null,4));
// })

// API.contract.misc.getMarketPrice().then(data => {
//     // console.log(JSON.stringify(data,null,4));
//     console.log(JSON.stringify(data['BTCUSD'],null,4));
//   })


