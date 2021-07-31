
require('dotenv').config();

const API = require('./index.js')

API.init({
  key: process.env['bigOneApiKey'],
  secret: process.env['bigOneApiSecret']
})
 
// ticker
// API.getTicker('ETH-USDT').then(data => {
//   console.log(data)
// })


// API.market.getBalance().then(resp => {
//   console.log(resp.data.filter((d)=>{
//     return d.balance != '0';
//   }))
// })


API.spot.createOrder('ETH-USDT', 'BID', '400', '0.001').then(data => {
  console.log(data)
})

// API.cancelOrder('63894594').then(data => {
//   console.log(data)
// })


// API.getDepth('ETH-USDT').then(data => {
//   console.log(data)
// })


// API.getOrders('ETH-USDT', 'PENDING').then(data => {
//   console.log(data)
// })


// API.getOrderByid('100').then(data => {
//   console.log(data)
// })