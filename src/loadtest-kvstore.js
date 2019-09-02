import protobuf from 'protobufjs';
import path from 'path';
import uuidv4 from 'uuid/v4';
import accurateInterval from 'accurate-interval';
import uuidv1 from 'uuid/v1';
import * as tendermintWsPool from './ws_pool';
import * as utils from './utils';
import fs from 'fs';

const tendermintProtobufRootInstance = new protobuf.Root();
const tendermintProtobufRoot = tendermintProtobufRootInstance.loadSync(
  path.join(__dirname, '..', 'protos', 'tendermint.proto'),
  { keepCase: true },
);
const TendermintTx = tendermintProtobufRoot.lookupType('Tx');

const pubKey = fs.readFileSync(
  path.join(__dirname, '..', 'keys', 'node_1.pub'),
  'utf8',
);
const masterPubKey = fs.readFileSync(
  path.join(__dirname, '..', 'keys', 'node_1_master.pub'),
  'utf8',
);

const jobs = {};

let from = uuidv1() + '123456789012345678901A';
let to = uuidv4() + '123456789012345678901';

// const IP = process.env.TM_IP || '52.163.191.111';
// const PORT = process.env.TM_PORT || '26000';

var messageCounter = 0;
let duration = process.env.DURATION || 1;
let txpersec = process.env.TXPERSEC || 1;
let setValidator = process.env.SET_VALIDATOR || false;

function startJob(duration, interval, requestsPerInterval) {
  let jobId = uuidv4();
  jobs[jobId] = {
    startedAt: null,
    stoppedAt: null,
    finishedAt: null,
    intervalFunc: null,
    intervalCount: 0,
  };

  const numberOfIntervals = Math.floor(duration / interval);

  jobs[jobId].startedAt = Date.now();

  jobs[jobId].intervalFunc = accurateInterval(() => {
    jobs[jobId].intervalCount++;

    if (jobs[jobId].intervalCount > numberOfIntervals) {
      stopJob(jobId);
      return;
    }

    for (let j = 0; j < requestsPerInterval; j++) {
      createRequestToPlatform();
    }
  }, interval * 1000);

  console.log(`Job started: ${jobId}`);

  //sendJobUpdateToClients(jobId);
}

function stopJob(jobId) {
  if (jobs[jobId] == null) throw new Error(`Unknown Job ID: ${jobId}`);
  if (jobs[jobId].intervalFunc == null)
    throw new Error(`Job is already stopped: ${jobId}`);
  jobs[jobId].intervalFunc.clear();
  jobs[jobId].intervalFunc = null;
  jobs[jobId].stoppedAt = Date.now();
  console.log('Total tx send: ', messageCounter);
}

async function createRequestToPlatform() {
  try {
    const requestDataToBlockchain = {
      from: from,
      to: to,
      price: 100,
      amount: 1000,
    };

    let request = {
      nodeId: 'node_1',
      fnName: 'SetTx',
      params: requestDataToBlockchain,
    };

    transact(request);
    // await tendermintWsPool.getConnection().broadcastTxSync(buffer);
    messageCounter++;
  } catch (error) {
    console.error(error);
  }
}

async function connectWS(duration, txpersec) {
  await tendermintWsPool.initialize();
  await registerMasterNode();
  await utils.wait(5000);
  if (setValidator) {
    await setValidators();
  }
  startJob(duration, 1, txpersec);
}

async function transact({
  nodeId,
  fnName,
  params,
  nonce = utils.getNonce(),
  useMasterKey = false,
}) {
  const paramsJsonString = JSON.stringify(params);
  let txObject = {
    method: fnName,
    params: paramsJsonString,
    nonce,
    signature: await utils.createSignature(
      Buffer.concat([
        Buffer.from(fnName, 'utf8'),
        Buffer.from(paramsJsonString, 'utf8'),
        nonce,
      ]).toString('base64'),
      nodeId,
      useMasterKey,
    ),
    node_id: nodeId,
  };

  const txProto = TendermintTx.create(txObject);
  const txProtoBuffer = TendermintTx.encode(txProto).finish();
  const responseResult = await tendermintWsPool
    .getConnection()
    .broadcastTxSync(txProtoBuffer);
}

async function registerMasterNode() {
  let registerMasterNodeParams = {
    node_id: 'node_1',
    public_key: pubKey,
    master_public_key: masterPubKey,
    node_name: 'This is node 1!',
  };

  let request = {
    nodeId: 'node_1',
    fnName: 'RegisterMasterNode',
    params: registerMasterNodeParams,
  };

  await transact(request);
}

function setValidators() {
  return Promise.all(
    [
      'kRKM3mkPlogAhWLARAoE9nG+i+fFbZLQDMZoS1O50So=',
      'JdIMZ1BliC7qYsph0kGSECCoEu2xgqwToBOiJ434cLM=',
      'TVq7ovzVhpPEe7T9qwxfG7zkg1JzY9+dq3EyMnoUYuQ=',
    ].map(async (pubKey, index) => {
      let setValidatorParams = {
        public_key: pubKey,
        power: 10,
      };

      let request = {
        nodeId: 'node_1',
        fnName: 'SetValidator',
        params: setValidatorParams,
      };
      await transact(request);
    }),
  );
}
connectWS(duration, txpersec);
