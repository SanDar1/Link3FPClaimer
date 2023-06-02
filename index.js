const Web3 = require('web3')
const axios = require("axios")
const { HttpsProxyAgent } = require('https-proxy-agent')
const fs = require('fs')
const colors = require('simple-log-colors')
const readlineSync = require('readline-sync')

const rpc = 'https://bsc.blockpi.network/v1/rpc/public'

const headers = {
  'authority': 'api.cyberconnect.dev',
  'accept': '*/*',
  'accept-language': 'en-GB,en;q=0.9,uk-UA;q=0.8,uk;q=0.7,ru-RU;q=0.6,ru;q=0.5,en-US;q=0.4',
  'content-type': 'application/json',
  'origin': 'https://link3.to',
  'referer': 'https://link3.to/',
  'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/111.0.0.0 Safari/537.36',
}

async function connectToMetaMask(privateKey) {
  // Подключение к удаленному RPC-серверу
  const web3 = new Web3(rpc)

  // Получение аккаунта из приватного ключа
  const account = web3.eth.accounts.privateKeyToAccount(privateKey)

  // Установка провайдера MetaMask в Web3
  web3.eth.defaultAccount = account.address

  // Проверка подключения
  const networkId = await web3.eth.net.getId()
  console.log(`Connected to network with ID: ${colors.yellow(networkId)}, account address: ${colors.yellow(account.address)}`)

  let address = account.address

  return {
    web3: web3,
    address: address
  }
}

async function getNonce(address) {
  let jsonData = {
    query: '\n    mutation nonce($address: EVMAddress!) {\n  nonce(request: {address: $address}) {\n    status\n    message\n    data\n  }\n}\n    ',
    variables: {
      address: address
    },
    operationName: 'nonce'
  }

  let response = await axios.post('https://api.cyberconnect.dev/profile/', jsonData, {
    headers: headers
  })

  return await response.data.data.nonce.data
}

async function signSignature (message, privateKey, web3) {
  let signedMessage = web3.eth.accounts.sign(message, privateKey)
  return signedMessage.signature
}

async function getAuthToken (address, message, signature, proxy) {
  let jsonData = {
    query: '\n    mutation login($address: EVMAddress!, $signature: String!, $signedMessage: String!, $token: String, $isEIP1271: Boolean, $chainId: Int) {\n  login(\n    request: {address: $address, signature: $signature, signedMessage: $signedMessage, token: $token, isEIP1271: $isEIP1271, chainId: $chainId}\n  ) {\n    status\n    message\n    data {\n      id\n      privateInfo {\n        address\n        accessToken\n        kolStatus\n      }\n    }\n  }\n}\n    ',
    variables: {
      signedMessage: message,
      token: '',
      address: address,
      chainId: 56,
      signature: signature,
      isEIP1271: false
    },
    operationName: 'login',
  }

  let response = await axios.post('https://api.cyberconnect.dev/profile/', jsonData, {
    headers: headers,
    httpAgent: new HttpsProxyAgent(`http://${proxy}`)
  })

  return response.data.data.login.data.privateInfo.accessToken
}

async function checkGetPointsCollectNFT(authToken, proxy) {
  let rewardsHeaders = {
    'authority': 'api.cyberconnect.dev',
    'accept': '*/*',
    'authorization': authToken,
    'content-type': 'application/json',
    'origin': 'https://link3.to',
    'referer': 'https://link3.to/',
    'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/111.0.0.0 Safari/537.36',
  }

  let jsonData = {
    query: "\n    query checkEngagementQualified($engagementId: ID!) {\n  checkEngagementQualified(engagementId: $engagementId) {\n    status\n    qualified\n    points\n  }\n}\n    ",
    variables: {
      engagementId: "6bf4ac10-8b82-45ea-bdf7-fa94ecbd124b",
    },
    operationName: 'checkEngagementQualified',
  }

  let response = await axios.post('https://api.cyberconnect.dev/profile/', jsonData, {
    headers: rewardsHeaders,
    httpAgent: new HttpsProxyAgent(`http://${proxy}`)
  })

  if (response.data.data.checkEngagementQualified.qualified) {
    jsonData = {
      query: "\n    mutation claimPoints($id: ID!) {\n  claimPoints(input: {engagementId: $id}) {\n    status\n  }\n}\n    ",
      variables: {
        id: '6bf4ac10-8b82-45ea-bdf7-fa94ecbd124b',
      },
      operationName: 'claimPoints',
    }

    await axios.post('https://api.cyberconnect.dev/profile/', jsonData, {
      headers: rewardsHeaders,
      httpAgent: new HttpsProxyAgent(`http://${proxy}`)
    })

    console.log(colors.green('Successfully claimed points (Collect an EssenceNFT - 200FP)'))
  } else {
    console.log(colors.red('You\'re not qualified to claim points (Collect an EssenceNFT - 200FP)'))
  }

  jsonData = {
    query: "\n    query checkEngagementQualified($engagementId: ID!) {\n  checkEngagementQualified(engagementId: $engagementId) {\n    status\n    qualified\n    points\n  }\n}\n    ",
    variables: {
      engagementId: "c6a57cf2-d4e8-4676-97d7-5d32b07526ed",
    },
    operationName: 'checkEngagementQualified',
  }

  response = await axios.post('https://api.cyberconnect.dev/profile/', jsonData, {
    headers: rewardsHeaders,
    httpAgent: new HttpsProxyAgent(`http://${proxy}`)
  })

  if (response.data.data.checkEngagementQualified.qualified) {
    jsonData = {
      query: "\n    mutation claimPoints($id: ID!) {\n  claimPoints(input: {engagementId: $id}) {\n    status\n  }\n}\n    ",
      variables: {
        id: 'c6a57cf2-d4e8-4676-97d7-5d32b07526ed',
      },
      operationName: 'claimPoints',
    }

    await axios.post('https://api.cyberconnect.dev/profile/', jsonData, {
      headers: rewardsHeaders,
      httpAgent: new HttpsProxyAgent(`http://${proxy}`)
    })

    console.log(colors.green('Successfully claimed referrals points'))
  } else {
    console.log(colors.yellow('You\'re have not referrals'))
  }

  /*
  jsonData = {
    query: "\n    query checkEngagementQualified($engagementId: ID!) {\n  checkEngagementQualified(engagementId: $engagementId) {\n    status\n    qualified\n    points\n  }\n}\n    ",
    variables: {
      engagementId: "d9cededd-47aa-447c-8bc5-90d22a470f44",
    },
    operationName: 'checkEngagementQualified',
  }

  response = await axios.post('https://api.cyberconnect.dev/profile/', jsonData, {
    headers: rewardsHeaders,
    httpAgent: new HttpsProxyAgent(`http://${proxy}`)
  })

  if (response.data.data.checkEngagementQualified.qualified) {
    jsonData = {
      query: "\n    mutation claimPoints($id: ID!) {\n  claimPoints(input: {engagementId: $id}) {\n    status\n  }\n}\n    ",
      variables: {
        id: "d9cededd-47aa-447c-8bc5-90d22a470f44",
      },
      operationName: 'claimPoints',
    }

    await axios.post('https://api.cyberconnect.dev/profile/', jsonData, {
      headers: rewardsHeaders,
      httpAgent: new HttpsProxyAgent(`http://${proxy}`)
    })

    console.log(colors.green('Successfully claimed points (Create an EssenceNFT - 300FP)'))
  } else {
    console.log(colors.red('You\'re not qualified to claim points (Create an EssenceNFT - 300FP)'))
  }
   */

  jsonData = {
    query: "\n    query getLoyaltyMemberPassStatus($handle: String!) {\n  loyaltyProgram(handle: $handle) {\n    membershipPass {\n      totalPoints\n      availablePoints\n      joinedAt\n      level\n      previousLevelPoints\n      nextLevelPoints\n    }\n    rewardsCount\n  }\n}\n    ",
    variables: {
      handle: "cyberconnect",
    },
    operationName: 'getLoyaltyMemberPassStatus',
  }

  response = await axios.post('https://api.cyberconnect.dev/profile/', jsonData, {
    headers: rewardsHeaders,
    httpAgent: new HttpsProxyAgent(`http://${proxy}`)
  })

  return response.data.data.loyaltyProgram.membershipPass.availablePoints
}

const readFile = (filePath) => {
  return fs.readFileSync(filePath, 'utf8').split('\n')
}

const clearTrashSymbols = (arr) => {
  return arr.map(el => el.trim())
}

async function start () {
  let privatesArr
  let proxiesArr

  privatesArr = readFile('./privates.txt')
  privatesArr = clearTrashSymbols(privatesArr)
  proxiesArr = readFile('./proxies.txt')
  proxiesArr = clearTrashSymbols(proxiesArr)

  if ((privatesArr.length === proxiesArr.length)) {
    for (let i = 0; i < privatesArr.length; i++) {
      setTimeout(async () => {
        let { address, web3 } = await connectToMetaMask(privatesArr[i]);
        let nonce = await getNonce(address);
        let message = `link3.to wants you to sign in with your Ethereum account:\n${address}\n\n\nURI: https://link3.to\nVersion: 1\nChain ID: 56\nNonce: ${nonce}\nIssued At: 2023-03-19T14:04:18.580Z\nExpiration Time: 2023-04-02T14:04:18.580Z\nNot Before: 2023-03-19T14:04:18.580Z`;
        let signature = await signSignature(message, privatesArr[i], web3);
        let authToken = await getAuthToken(address, message, signature, proxiesArr[i]);
        let result = await checkGetPointsCollectNFT(authToken, proxiesArr[i]);
        if (i % 2 === 0) {
          console.log(`Номер кошелька: ${colors.cyan(i + 1)}`);
          console.log(`ACCOUNT ADDRESS: ${colors.cyan(address)}`);
          console.log(colors.magenta(`Total account points: ${result}`));
        } else {
          console.log(`${(`Номер кошелька: ${colors.green(i + 1)}`)}`);
          console.log(`ACCOUNT ADDRESS: ${colors.green(address)}`);
          console.log(colors.magenta(`Total account points: ${result}`));
        }
        console.log(`==============================================================================================`);
      }, 5000 * i)
    }
  } else {
    if (privatesArr.length > proxiesArr.length) {
      console.log(`${colors.red(`Недостаточно прокси: кошельков - ${privatesArr.length}, прокси - ${proxiesArr.length}`)}`)
    } else if (privatesArr.length < proxiesArr.length) {
      console.log(`${colors.red(`Недостаточно кошельков: кошельков - ${privatesArr.length}, прокси - ${proxiesArr.length}`)}`)
    } else {
      console.log(`${colors.red(`Непредвиденная ошибка`)}`)
    }
  }
}

start()