import protobuf from 'protobufjs';
import path from 'path';
import fetch from 'node-fetch';
import uuidv4 from 'uuid/v4';
import accurateInterval from 'accurate-interval';
import uuidv1 from 'uuid/v1';
import * as tendermintWsPool from './ws_pool';
import * as utils from './utils';

const tendermintProtobufRootInstance = new protobuf.Root();
const tendermintProtobufRoot = tendermintProtobufRootInstance.loadSync(
  path.join(__dirname, '..', 'protos', 'tendermint.proto'),
  { keepCase: true }
);
const TendermintTx = tendermintProtobufRoot.lookupType('Tx');

const jobs = {};

// const IP = process.env.TM_IP || '52.163.191.111';
// const PORT = process.env.TM_PORT || '26000';

var messageCounter = 0;
let duration = process.env.DURATION || 1;
let txpersec = process.env.TXPERSEC || 1;

let keyV1 = uuidv1();
let valueV4 = uuidv4();
let keyRunningNumber = 0;
let valueRunningNumber = 0;

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
    // let key = `${keyV1}${keyRunningNumber++}`;
    // let value = `${valueV4}${valueRunningNumber++}`;
    // connection++;
    // await fetch(`http://${IP}:${PORT}/broadcast_tx_sync?tx="${key}=${value}"`);
    // if (connection > max_connection) {
    //   max_connection = connection;
    //   console.log('Max connection : ', max_connection);
    // }
    // connection--;
    // messageCounter++;

    let key = `${keyV1}${keyRunningNumber++}`;

    // let value = `${valueV4}${valueRunningNumber++}`;
    // let param = `${key}=${value}`;
    // let buffer = Buffer.from(param, 'utf8');
    const requestDataToBlockchain = {
      mode: 1,
      request_id: key,
      min_idp: 1,
      min_aal: 1,
      min_ial: 1.1,
      request_timeout: 3600,
      data_request_list: {
        service_id: 'bank_statement',
        as_id_list: ['as_1'],
        min_as: 1,
        request_params_hash: 'hash',
      },
      request_message_hash: 'hash',
      idp_id_list: ['idp_1'],
      purpose: null,
    };

    let request = {
      nodeId: 'rp_1',
      fnName: 'CreateRequest',
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
  startJob(duration, 1, txpersec);
}
connectWS(duration, txpersec);

async function transact({
  nodeId,
  fnName,
  params,
  nonce = utils.getNonce(),
  useMasterKey = false,
}) {
  const paramsJsonString = JSON.stringify(params);
  const txObject = {
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
      useMasterKey
    ),
    node_id: nodeId,
  };

  const txProto = TendermintTx.create(txObject);
  const txProtoBuffer = TendermintTx.encode(txProto).finish();
  const responseResult = await tendermintWsPool
    .getConnection()
    .broadcastTxSync(txProtoBuffer);
  console.log(responseResult);
}
