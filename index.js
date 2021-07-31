const fetch = require('node-fetch')
const jwt = require('jsonwebtoken')
const API = {
  SPOT_URL: "https://big.one/api/v3",
  CONTRACT_URL: "https://big.one/api/contract/v2"
}
let config = {
  key: '',
  secret: ''
}
const BIGONE = {
  spot: {},
  contract: {
    misc: {},
    accounts: {},
    orders: {},
    positions: {},
    trades: {}
  }
}

//Set base methods

BIGONE.init = cfg => {
  config = cfg
}

BIGONE.getToken = () => {
  return new Promise(resolve => {
     const nonce = () => String(new Date()* 1000000);
    jwt.sign({
      "type": "OpenAPIV2",
      "sub": config.key,
      "nonce": nonce()
    }, config.secret, {header: {
      "alg": "HS256",
      "typ": "JWT"
    }}, (err, token) => {
      if (!err) {
        resolve(token)
      } else {
        resolve('')
      }
    })
  })
}


///Set Market Scoped Methods

/**
 * 创建订单（买卖）
 * @param {交易对} symbol 
 * @param {买卖方向} side 
 * @param {现价还是市价} type 
 * @param {价格} price 
 * @param {数量} amount 
 */
BIGONE.spot.createOrder = async (symbol, side, price, amount = 0.01, type = 'LIMIT') => {
  const FormData = require('form-data')
  const token = await BIGONE.getToken()
  // const form = new FormData()
  let form = {
    'asset_pair_name': symbol,
    'side': side,
    'price': price,
    'amount': amount,
    'type': type
  }

  // form.append('market_id', symbol)
  // form.append('side', side)
  // form.append('price', price)
  // form.append('amount', amount)
  // form.append('type', type)

  // 创建订单
  return fetch(API.SPOT_URL + '/viewer/orders', {
    method: 'post',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(form)
  }).then(res => res.json())
}


/**
 * 取消订单（买卖）
 * @param {订单id} id 
 */
BIGONE.spot.cancelOrder = async (id) => {
  const url = `${API.SPOT_URL}/viewer/orders/${id}/cancel`
  const token = await BIGONE.getToken()

  // 发送新建订单的请求
  return fetch(url, {
    method: 'post',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  }).then(res => res.json())
}

/**
 * 查询资产
 * 
 */
BIGONE.spot.getBalance = async() => {
  let token = await BIGONE.getToken()
  return fetch(API.SPOT_URL + '/viewer/accounts', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  }).then(res => res.json())
}

/**
 * 查询所有订单
 * @param {交易对} symbol
 * @param {订单状态} states
 *
 */
BIGONE.spot.getOrders = async (symbol, states = 'FILLED') => {
  const url = `${API.SPOT_URL}/viewer/orders/?market_id=${symbol}&state=${states}`
  const token = await BIGONE.getToken()

  return fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  }).then(res => res.json())
}

/**
 * 获取指定 id 的订单 
 * @param {订单id} id
 * 
 */
BIGONE.spot.getOrderByid = async (id) => {
  const url = `${API.SPOT_URL}/viewer/orders/${id}`
  const token = await BIGONE.getToken()

  return fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  }).then(res => res.json())
}

/**
 * 行情接口(ticker)
 * @param {交易对} symbol 
 * 
 */
BIGONE.spot.getTicker = (symbol) => {
  const url = `${API.SPOT_URL}/markets/${symbol}/ticker`

  return fetch(url, {
    method: 'GET'
  }).then(res => res.json())
}

/**
 * 深度查询
 * @param {交易对} symbol
 * 
 */
BIGONE.spot.getDepth = (symbol) => {
  const url = `${API.SPOT_URL}/markets/${symbol}/depth`

  return fetch(url, {
    method: 'GET'
  }).then(res => res.json())
}

// End Market Scoped Methods

/// Set Contract Scoped Methods
BIGONE.contract.accounts.getCashandPositionDetail = async () => {
  const url = `${API.CONTRACT_URL}/accounts`
  const token = await BIGONE.getToken()

  return fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  }).then(res => res.json())
}

BIGONE.contract.misc.getMarketPrice = async () => {
  const url = `${API.CONTRACT_URL}/instruments/prices`
  const token = await BIGONE.getToken()

  return fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  }).then(res => res.json())
}

BIGONE.contract.orders.createOrder = async (size, symbol, type, side, price, reduceOnly, conditionalObj) => {
  try{
  const FormData = require('form-data')
  const url = `${API.CONTRACT_URL}/orders`
  const token = await BIGONE.getToken()
  
  // const form = new FormData()
  let form = {
    "size": size,
    "symbol": symbol,
    "type": type,
    "side": side,
    "price": price,
    "reduceOnly": reduceOnly,
    "conditional": conditionalObj
  }

  // form.append('size', 100)
  // form.append('symbol', 'BTCUSD')
  // form.append('type', 'LIMIT')
  // form.append('side', 'BUY')
  // form.append('price', 5000)
  // if(price)
  //   form.append('price', price)
  // form.append('reduceOnly', reduceOnly)
  // form.append('conditional', conditional)

 
    // console.log(form);

  return fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(form)
  }).then(res => res.json());
  }
  catch(err){
    console.log(err);
  }
}
// End Contract Scoped Methods

module.exports = BIGONE
