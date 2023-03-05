import createAlchemyWeb3 from "@alch/alchemy-web3"
import dotenv from "dotenv"
import fs from "fs"
import cors from "cors"
import express from "express"

const app = express()
dotenv.config();

const GREETER_CONTRACT_ADDRESS = "0x8b4751Bf2Ba59222EB3d40D9fe7FDD98496503b9"
const BACKEND_WALLET_ADDRESS = "0xb6F5414bAb8d5ad8F33E37591C02f7284E974FcB"
const GREETER_CONTRACT_ABI_PATH = "./json_abi/Greeter.json"
const PORT = 8080
var web3 = null
var greeterContract = null

const loadContract = async (data) => {
  data = JSON.parse(data);

  const netId = await web3.eth.net.getId();
  greeterContract = new web3.eth.Contract(
    data,
    GREETER_CONTRACT_ADDRESS
  );
}

async function initAPI() {
  const { GOERLI_RPC_URL, PRIVATE_KEY } = process.env;
  web3 = createAlchemyWeb3.createAlchemyWeb3(GOERLI_RPC_URL);

  fs.readFile(GREETER_CONTRACT_ABI_PATH, 'utf8', function (err,data) {
    if (err) {
      return console.log(err);
    }
    loadContract(data, web3)
  });

  app.listen(PORT, () => {
    console.log(`Listening to port ${PORT}`)
  })
  app.use(cors({
    origin: '*'
  }));
}

async function relayGreeting(greetingText, greetingDeadline, greetingSender, v, r, s)
{
  const nonce = await web3.eth.getTransactionCount(BACKEND_WALLET_ADDRESS, 'latest'); // nonce starts counting from 0
  const transaction = {
   'from': BACKEND_WALLET_ADDRESS,
   'to': GREETER_CONTRACT_ADDRESS,
   'value': 0,
   'gas': 300000,
   'nonce': nonce,
   'data': greeterContract.methods.greet(
     [greetingText, greetingDeadline],
     greetingSender,
     v,
     r,
     s)
     .encodeABI()
  };
  const { GOERLI_RPC_URL, PRIVATE_KEY } = process.env;
  const signedTx = await web3.eth.accounts.signTransaction(transaction, PRIVATE_KEY);

  web3.eth.sendSignedTransaction(signedTx.rawTransaction, function(error, hash) {
    if (!error) {
      console.log("🎉 The hash of your transaction is: ", hash, "\n");
    } else {
      console.log("❗Something went wrong while submitting your transaction:", error)
    }
  });
}

app.get('/relay', (req, res) => {
  var greetingText = req.query["greetingText"]
  var greetingDeadline = req.query["greetingDeadline"]
  var greetingSender = req.query["greetingSender"]
  var v = req.query["v"]
  var r = req.query["r"]
  var s = req.query["s"]
  var message = greetingSender + " sent a greet: " + " " + greetingText
  relayGreeting(greetingText, greetingDeadline, greetingSender, v, r, s)
  res.setHeader('Content-Type', 'application/json');
  res.send({
    "message": message
  })
})
initAPI()