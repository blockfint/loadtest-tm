const fetch = require('node-fetch');
const uuidv4 = require('uuid/v4');
const accurateInterval = require('accurate-interval');
var uuidv1 = require('uuid/v1');

const jobs = {};

const IP = '52.163.191.111';
const PORT = '26000';

var messageCounter = 0;
let duration = process.env.DURATION || 1;
let txpersec = process.env.TXPERSEC || 1;
let max_connection = 0;
let connection = 0;

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
    let key = uuidv1();
    let value = uuidv4();
    connection++;
    await fetch(`http://${IP}:${PORT}/broadcast_tx_sync?tx="${key}=${value}"`);
    if (connection > max_connection) {
      max_connection = connection;
      console.log('Max connection : ', max_connection);
    }
    connection--;
    messageCounter++;
  } catch (error) {
    throw error;
  }
}

startJob(duration, 1, txpersec);
