const axios = require('axios');
const crypto = require('crypto-js');

const API_V3_URL = 'https://api.binance.com/api/v3';
const SAPI_URL = 'https://api.binance.com/sapi/v1';

// 生成签名
const generateSignature = (params, secretKey) => {
  const queryString = Object.entries(params)
    .sort()
    .map(([key, value]) => `${key}=${value}`)
    .join('&');
  
  return crypto.HmacSHA256(queryString, secretKey).toString();
};

// 获取余额
exports.getBalances = async (apiInfo) => {
  try {
    const params = {
      timestamp: Date.now(),
      recvWindow: 5000
    };
    
    const signature = generateSignature(params, apiInfo.secretKey);
    const queryString = Object.entries(params)
      .sort()
      .map(([key, value]) => `${key}=${value}`)
      .join('&') + `&signature=${signature}`;

    const { data } = await axios.get(`${API_V3_URL}/account?${queryString}`, {
      headers: {
        'X-MBX-APIKEY': apiInfo.apiKey
      }
    });

    return data.balances
      .filter(b => parseFloat(b.free) > 0)
      .map(b => ({
        ccy: b.asset,
        availBal: b.free
      }));
  } catch (error) {
    console.error('API Error:', error.response?.data || error.message);
    throw new Error(error.response?.data?.msg || '获取余额失败');
  }
};

// 提现请求
exports.withdraw = async (apiInfo, coin, address, amount) => {
  try {
    const params = {
      coin: coin.split('-')[0],
      address: address,
      amount: amount.toString(),
      timestamp: Date.now(),
      recvWindow: 5000
    };

    if (coin.includes('-')) {
      params.network = coin.split('-')[1];
    }

    const signature = generateSignature(params, apiInfo.secretKey);
    const queryString = Object.entries(params)
      .sort()
      .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
      .join('&') + `&signature=${signature}`;

    const { data } = await axios.post(`${SAPI_URL}/capital/withdraw/apply?${queryString}`, null, {
      headers: {
        'X-MBX-APIKEY': apiInfo.apiKey
      }
    });

    return {
      wdId: data.id,
      chain: params.network || coin,
      amt: amount,
      fee: data.fee || '0'
    };
  } catch (error) {
    console.error('API Error:', error.response?.data || error.message);
    throw new Error(error.response?.data?.msg || '提现失败');
  }
};

// 获取币种信息
exports.getCurrencyInfo = async (apiInfo, coin) => {
  try {
    const params = {
      timestamp: Date.now(),
      recvWindow: 5000
    };

    const signature = generateSignature(params, apiInfo.secretKey);
    const queryString = Object.entries(params)
      .sort()
      .map(([key, value]) => `${key}=${value}`)
      .join('&') + `&signature=${signature}`;

    const { data } = await axios.get(`${SAPI_URL}/capital/config/getall?${queryString}`, {
      headers: {
        'X-MBX-APIKEY': apiInfo.apiKey
      }
    });

    return data.filter(c => c.coin === coin);
  } catch (error) {
    console.error('API Error:', error.response?.data || error.message);
    throw new Error(error.response?.data?.msg || '获取币种信息失败');
  }
};

// 获取币种支持的网络
exports.getNetworks = async (apiInfo, coin) => {
  try {
    const params = {
      timestamp: Date.now(),
      recvWindow: 5000
    };

    const signature = generateSignature(params, apiInfo.secretKey);
    const queryString = Object.entries(params)
      .sort()
      .map(([key, value]) => `${key}=${value}`)
      .join('&') + `&signature=${signature}`;

    const { data } = await axios.get(`${SAPI_URL}/capital/config/getall?${queryString}`, {
      headers: {
        'X-MBX-APIKEY': apiInfo.apiKey
      }
    });

    const coinInfo = data.find(c => c.coin === coin);
    return coinInfo ? coinInfo.networkList.map(n => ({
      network: n.network,
      name: n.name,
      withdrawFee: n.withdrawFee
    })) : [];
  } catch (error) {
    console.error('API Error:', error.response?.data || error.message);
    throw new Error(error.response?.data?.msg || '获取网络信息失败');
  }
}; 