const { ipcRenderer } = require('electron');

let apiConfig = null;
let balances = [];
let currentNetworks = [];
let isWithdrawing = false;

async function readBalance() {
  const apiKey = document.getElementById('apiKey').value;
  const secretKey = document.getElementById('secretKey').value;

  if (!apiKey || !secretKey) {
    alert('请输入 API Key 和 Secret Key');
    return;
  }

  apiConfig = { apiKey, secretKey };
  try {
    balances = await ipcRenderer.invoke('get-balances', apiConfig);
    
    // 更新币种选择下拉框
    const coinSelect = document.getElementById('coin');
    coinSelect.innerHTML = '<option value="">选择币种</option>' +
      balances
        .map(b => `<option value="${b.ccy}-${b.ccy}">${b.ccy} (${b.availBal})</option>`)
        .join('');
  } catch (error) {
    alert('获取余额失败: ' + error);
  }
}

function generateAddresses() {
  const minAmount = parseFloat(document.getElementById('minAmount').value) || 0;
  const maxAmount = parseFloat(document.getElementById('maxAmount').value) || 0;
  const decimals = parseInt(document.getElementById('decimals').value) || 2;
  const addressList = document.getElementById('addressList').value;

  if (!addressList.trim()) {
    alert('请先输入提现地址列表');
    return;
  }

  const addresses = addressList.trim().split('\n').filter(a => a.trim());
  const result = addresses.map(addr => {
    const amount = (Math.random() * (maxAmount - minAmount) + minAmount).toFixed(decimals);
    return `${addr},${amount}`;
  });

  document.getElementById('addressList').value = result.join('\n');
}

async function updateNetworks() {
  const coin = document.getElementById('coin').value.split('-')[0];
  const networkSelect = document.getElementById('network');
  
  if (!coin || !apiConfig) {
    networkSelect.innerHTML = '<option value="">选择网络</option>';
    return;
  }

  try {
    currentNetworks = await ipcRenderer.invoke('get-networks', {
      apiInfo: apiConfig,
      coin
    });

    networkSelect.innerHTML = '<option value="">选择网络</option>' +
      currentNetworks.map(n => 
        `<option value="${n.network}">${n.name} (手续费: ${n.withdrawFee})</option>`
      ).join('');
  } catch (error) {
    alert('获取网络信息失败: ' + error);
  }
}

async function submitWithdraw() {
  if (isWithdrawing) {
    return;
  }

  const coin = document.getElementById('coin').value.split('-')[0];
  const network = document.getElementById('network').value;
  const addressList = document.getElementById('addressList').value;
  const minDelay = parseInt(document.getElementById('minDelay').value) || 1;
  const maxDelay = parseInt(document.getElementById('maxDelay').value) || 5;

  if (!coin || !network || !addressList.trim()) {
    alert('请选择币种、网络并输入提现地址列表');
    return;
  }

  const withdrawals = addressList.trim().split('\n')
    .map(line => {
      const [address, amount] = line.split(',');
      return { address: address.trim(), amount: parseFloat(amount) };
    })
    .filter(w => w.address && !isNaN(w.amount));

  if (withdrawals.length === 0) {
    alert('没有有效的提现记录');
    return;
  }

  isWithdrawing = true;
  document.getElementById('stopBtn').style.display = 'block';
  const statusDiv = document.getElementById('withdrawStatus');
  statusDiv.innerHTML = `<p>共 ${withdrawals.length} 条记录</p>`;

  for (let i = 0; i < withdrawals.length; i++) {
    if (!isWithdrawing) {
      statusDiv.innerHTML += `<p style="color: orange">提现已停止</p>`;
      break;
    }

    const { address, amount } = withdrawals[i];
    try {
      const result = await ipcRenderer.invoke('withdraw', {
        apiInfo: apiConfig,
        coin: `${coin}-${network}`,
        address,
        amount
      });

      statusDiv.innerHTML += `<p>提现成功: ${address} - ${amount} ${coin}</p>`;

      if (i < withdrawals.length - 1 && isWithdrawing) {
        const delay = Math.floor(Math.random() * (maxDelay - minDelay + 1) + minDelay) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    } catch (error) {
      statusDiv.innerHTML += `<p style="color: red">提现失败: ${address} - ${error}</p>`;
      if (!confirm('是否继续下一笔提现？')) {
        isWithdrawing = false;
        break;
      }
    }
  }

  isWithdrawing = false;
  document.getElementById('stopBtn').style.display = 'none';
}

function stopWithdraw() {
  if (isWithdrawing) {
    if (confirm('确定要停止提现吗？')) {
      isWithdrawing = false;
    }
  }
} 