"use strict";

var _interopRequireWildcard = require("@babel/runtime/helpers/interopRequireWildcard");

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

var _protobufjs = _interopRequireDefault(require("protobufjs"));

var _path = _interopRequireDefault(require("path"));

var _nodeFetch = _interopRequireDefault(require("node-fetch"));

var _v = _interopRequireDefault(require("uuid/v4"));

var _accurateInterval = _interopRequireDefault(require("accurate-interval"));

var _v2 = _interopRequireDefault(require("uuid/v1"));

var tendermintWsPool = _interopRequireWildcard(require("./ws_pool"));

var utils = _interopRequireWildcard(require("./utils"));

const tendermintProtobufRootInstance = new _protobufjs.default.Root();
const tendermintProtobufRoot = tendermintProtobufRootInstance.loadSync(_path.default.join(__dirname, '..', 'protos', 'tendermint.proto'), {
  keepCase: true
});
const TendermintTx = tendermintProtobufRoot.lookupType('Tx');
const jobs = {}; // const IP = process.env.TM_IP || '52.163.191.111';
// const PORT = process.env.TM_PORT || '26000';

var messageCounter = 0;
let duration = process.env.DURATION || 1;
let txpersec = process.env.TXPERSEC || 1;
let keyV1 = (0, _v2.default)();
let valueV4 = (0, _v.default)();
let keyRunningNumber = 0;
let valueRunningNumber = 0;

function startJob(duration, interval, requestsPerInterval) {
  let jobId = (0, _v.default)();
  jobs[jobId] = {
    startedAt: null,
    stoppedAt: null,
    finishedAt: null,
    intervalFunc: null,
    intervalCount: 0
  };
  const numberOfIntervals = Math.floor(duration / interval);
  jobs[jobId].startedAt = Date.now();
  jobs[jobId].intervalFunc = (0, _accurateInterval.default)(() => {
    jobs[jobId].intervalCount++;

    if (jobs[jobId].intervalCount > numberOfIntervals) {
      stopJob(jobId);
      return;
    }

    for (let j = 0; j < requestsPerInterval; j++) {
      createRequestToPlatform();
    }
  }, interval * 1000);
  console.log(`Job started: ${jobId}`); //sendJobUpdateToClients(jobId);
}

function stopJob(jobId) {
  if (jobs[jobId] == null) throw new Error(`Unknown Job ID: ${jobId}`);
  if (jobs[jobId].intervalFunc == null) throw new Error(`Job is already stopped: ${jobId}`);
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
    let key = `${keyV1}${keyRunningNumber++}`; // let value = `${valueV4}${valueRunningNumber++}`;
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
        request_params_hash: 'hash'
      },
      request_message_hash: 'hash',
      idp_id_list: ['idp_1'],
      purpose: null
    };
    let request = {
      nodeId: 'rp_1',
      fnName: 'CreateRequest',
      params: requestDataToBlockchain
    };
    transact(request); // await tendermintWsPool.getConnection().broadcastTxSync(buffer);

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
  useMasterKey = false
}) {
  const paramsJsonString = JSON.stringify(params);
  const txObject = {
    method: fnName,
    params: paramsJsonString,
    nonce,
    signature: await utils.createSignature(Buffer.concat([Buffer.from(fnName, 'utf8'), Buffer.from(paramsJsonString, 'utf8'), nonce]).toString('base64'), nodeId, useMasterKey),
    node_id: nodeId
  };
  const txProto = TendermintTx.create(txObject);
  const txProtoBuffer = TendermintTx.encode(txProto).finish();
  const responseResult = await tendermintWsPool.getConnection().broadcastTxSync(txProtoBuffer);
  console.log(responseResult);
}
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9sb2FkdGVzdC1rdnN0b3JlLmpzIl0sIm5hbWVzIjpbInRlbmRlcm1pbnRQcm90b2J1ZlJvb3RJbnN0YW5jZSIsInByb3RvYnVmIiwiUm9vdCIsInRlbmRlcm1pbnRQcm90b2J1ZlJvb3QiLCJsb2FkU3luYyIsInBhdGgiLCJqb2luIiwiX19kaXJuYW1lIiwia2VlcENhc2UiLCJUZW5kZXJtaW50VHgiLCJsb29rdXBUeXBlIiwiam9icyIsIm1lc3NhZ2VDb3VudGVyIiwiZHVyYXRpb24iLCJwcm9jZXNzIiwiZW52IiwiRFVSQVRJT04iLCJ0eHBlcnNlYyIsIlRYUEVSU0VDIiwia2V5VjEiLCJ2YWx1ZVY0Iiwia2V5UnVubmluZ051bWJlciIsInZhbHVlUnVubmluZ051bWJlciIsInN0YXJ0Sm9iIiwiaW50ZXJ2YWwiLCJyZXF1ZXN0c1BlckludGVydmFsIiwiam9iSWQiLCJzdGFydGVkQXQiLCJzdG9wcGVkQXQiLCJmaW5pc2hlZEF0IiwiaW50ZXJ2YWxGdW5jIiwiaW50ZXJ2YWxDb3VudCIsIm51bWJlck9mSW50ZXJ2YWxzIiwiTWF0aCIsImZsb29yIiwiRGF0ZSIsIm5vdyIsInN0b3BKb2IiLCJqIiwiY3JlYXRlUmVxdWVzdFRvUGxhdGZvcm0iLCJjb25zb2xlIiwibG9nIiwiRXJyb3IiLCJjbGVhciIsImtleSIsInJlcXVlc3REYXRhVG9CbG9ja2NoYWluIiwibW9kZSIsInJlcXVlc3RfaWQiLCJtaW5faWRwIiwibWluX2FhbCIsIm1pbl9pYWwiLCJyZXF1ZXN0X3RpbWVvdXQiLCJkYXRhX3JlcXVlc3RfbGlzdCIsInNlcnZpY2VfaWQiLCJhc19pZF9saXN0IiwibWluX2FzIiwicmVxdWVzdF9wYXJhbXNfaGFzaCIsInJlcXVlc3RfbWVzc2FnZV9oYXNoIiwiaWRwX2lkX2xpc3QiLCJwdXJwb3NlIiwicmVxdWVzdCIsIm5vZGVJZCIsImZuTmFtZSIsInBhcmFtcyIsInRyYW5zYWN0IiwiZXJyb3IiLCJjb25uZWN0V1MiLCJ0ZW5kZXJtaW50V3NQb29sIiwiaW5pdGlhbGl6ZSIsIm5vbmNlIiwidXRpbHMiLCJnZXROb25jZSIsInVzZU1hc3RlcktleSIsInBhcmFtc0pzb25TdHJpbmciLCJKU09OIiwic3RyaW5naWZ5IiwidHhPYmplY3QiLCJtZXRob2QiLCJzaWduYXR1cmUiLCJjcmVhdGVTaWduYXR1cmUiLCJCdWZmZXIiLCJjb25jYXQiLCJmcm9tIiwidG9TdHJpbmciLCJub2RlX2lkIiwidHhQcm90byIsImNyZWF0ZSIsInR4UHJvdG9CdWZmZXIiLCJlbmNvZGUiLCJmaW5pc2giLCJyZXNwb25zZVJlc3VsdCIsImdldENvbm5lY3Rpb24iLCJicm9hZGNhc3RUeFN5bmMiXSwibWFwcGluZ3MiOiI7Ozs7OztBQUFBOztBQUNBOztBQUNBOztBQUNBOztBQUNBOztBQUNBOztBQUNBOztBQUNBOztBQUVBLE1BQU1BLDhCQUE4QixHQUFHLElBQUlDLG9CQUFTQyxJQUFiLEVBQXZDO0FBQ0EsTUFBTUMsc0JBQXNCLEdBQUdILDhCQUE4QixDQUFDSSxRQUEvQixDQUM3QkMsY0FBS0MsSUFBTCxDQUFVQyxTQUFWLEVBQXFCLElBQXJCLEVBQTJCLFFBQTNCLEVBQXFDLGtCQUFyQyxDQUQ2QixFQUU3QjtBQUFFQyxFQUFBQSxRQUFRLEVBQUU7QUFBWixDQUY2QixDQUEvQjtBQUlBLE1BQU1DLFlBQVksR0FBR04sc0JBQXNCLENBQUNPLFVBQXZCLENBQWtDLElBQWxDLENBQXJCO0FBRUEsTUFBTUMsSUFBSSxHQUFHLEVBQWIsQyxDQUVBO0FBQ0E7O0FBRUEsSUFBSUMsY0FBYyxHQUFHLENBQXJCO0FBQ0EsSUFBSUMsUUFBUSxHQUFHQyxPQUFPLENBQUNDLEdBQVIsQ0FBWUMsUUFBWixJQUF3QixDQUF2QztBQUNBLElBQUlDLFFBQVEsR0FBR0gsT0FBTyxDQUFDQyxHQUFSLENBQVlHLFFBQVosSUFBd0IsQ0FBdkM7QUFFQSxJQUFJQyxLQUFLLEdBQUcsa0JBQVo7QUFDQSxJQUFJQyxPQUFPLEdBQUcsaUJBQWQ7QUFDQSxJQUFJQyxnQkFBZ0IsR0FBRyxD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ZixNQURPO0FBRWZDLElBQUFBLE1BQU0sRUFBRVUsZ0JBRk87QUFHZkosSUFBQUEsS0FIZTtBQUlmUyxJQUFBQSxTQUFTLEVBQUUsTUFBTVIsS0FBSyxDQUFDUyxlQUFOLENBQ2ZDLE1BQU0sQ0FBQ0MsTUFBUCxDQUFjLENBQ1pELE1BQU0sQ0FBQ0UsSUFBUCxDQUFZcEIsTUFBWixFQUFvQixNQUFwQixDQURZLEVBRVprQixNQUFNLENBQUNFLElBQVAsQ0FBWVQsZ0JBQVosRUFBOEIsTUFBOUIsQ0FGWSxFQUdaSixLQUhZLENBQWQsRUFJR2MsUUFKSCxDQUlZLFFBSlosQ0FEZSxFQU1mdEIsTUFOZSxFQU9mVyxZQVBlLENBSkY7QUFhZlksSUFBQUEsT0FBTyxFQUFFdkI7QUFiTSxHQUFqQjtBQWdCQSxRQUFNd0IsT0FBTyxHQUFHNUUsWUFBWSxDQUFDNkUsTUFBYixDQUFvQlYsUUFBcEIsQ0FBaEI7QUFDQSxRQUFNVyxhQUFhLEdBQUc5RSxZQUFZLENBQUMrRSxNQUFiLENBQW9CSCxPQUFwQixFQUE2QkksTUFBN0IsRUFBdEI7QUFDQSxRQUFNQyxjQUFjLEdBQUcsTUFBTXZCLGdCQUFnQixDQUMxQ3dCLGFBRDBCLEdBRTFCQyxlQUYwQixDQUVWTCxhQUZVLENBQTdCO0FBR0EvQyxFQUFBQSxPQUFPLENBQUNDLEdBQVIsQ0FBWWlELGNBQVo7QUFDRCIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBwcm90b2J1ZiBmcm9tICdwcm90b2J1ZmpzJztcbmltcG9ydCBwYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IGZldGNoIGZyb20gJ25vZGUtZmV0Y2gnO1xuaW1wb3J0IHV1aWR2NCBmcm9tICd1dWlkL3Y0JztcbmltcG9ydCBhY2N1cmF0ZUludGVydmFsIGZyb20gJ2FjY3VyYXRlLWludGVydmFsJztcbmltcG9ydCB1dWlkdjEgZnJvbSAndXVpZC92MSc7XG5pbXBvcnQgKiBhcyB0ZW5kZXJtaW50V3NQb29sIGZyb20gJy4vd3NfcG9vbCc7XG5pbXBvcnQgKiBhcyB1dGlscyBmcm9tICcuL3V0aWxzJztcblxuY29uc3QgdGVuZGVybWludFByb3RvYnVmUm9vdEluc3RhbmNlID0gbmV3IHByb3RvYnVmLlJvb3QoKTtcbmNvbnN0IHRlbmRlcm1pbnRQcm90b2J1ZlJvb3QgPSB0ZW5kZXJtaW50UHJvdG9idWZSb290SW5zdGFuY2UubG9hZFN5bmMoXG4gIHBhdGguam9pbihfX2Rpcm5hbWUsICcuLicsICdwcm90b3MnLCAndGVuZGVybWludC5wcm90bycpLFxuICB7IGtlZXBDYXNlOiB0cnVlIH1cbik7XG5jb25zdCBUZW5kZXJtaW50VHggPSB0ZW5kZXJtaW50UHJvdG9idWZSb290Lmxvb2t1cFR5cGUoJ1R4Jyk7XG5cbmNvbnN0IGpvYnMgPSB7fTtcblxuLy8gY29uc3QgSVAgPSBwcm9jZXNzLmVudi5UTV9JUCB8fCAnNTIuMTYzLjE5MS4xMTEnO1xuLy8gY29uc3QgUE9SVCA9IHByb2Nlc3MuZW52LlRNX1BPUlQgfHwgJzI2MDAwJztcblxudmFyIG1lc3NhZ2VDb3VudGVyID0gMDtcbmxldCBkdXJhdGlvbiA9IHByb2Nlc3MuZW52LkRVUkFUSU9OIHx8IDE7XG5sZXQgdHhwZXJzZWMgPSBwcm9jZXNzLmVudi5UWFBFUlNFQyB8fCAxO1xuXG5sZXQga2V5VjEgPSB1dWlkdjEoKTtcbmxldCB2YWx1ZVY0ID0gdXVpZHY0KCk7XG5sZXQga2V5UnVubmluZ051bWJlciA9IDA7XG5sZXQgdmFsdWVSdW5uaW5nTnVtYmVyID0gMDtcblxuZnVuY3Rpb24gc3RhcnRKb2IoZHVyYXRpb24sIGludGVydmFsLCByZXF1ZXN0c1BlckludGVydmFsKSB7XG4gIGxldCBqb2JJZCA9IHV1aWR2NCgpO1xuICBqb2JzW2pvYklkXSA9IHtcbiAgICBzdGFydGVkQXQ6IG51bGwsXG4gICAgc3RvcHBlZEF0OiBudWxsLFxuICAgIGZpbmlzaGVkQXQ6IG51bGwsXG4gICAgaW50ZXJ2YWxGdW5jOiBudWxsLFxuICAgIGludGVydmFsQ291bnQ6IDAsXG4gIH07XG5cbiAgY29uc3QgbnVtYmVyT2ZJbnRlcnZhbHMgPSBNYXRoLmZsb29yKGR1cmF0aW9uIC8gaW50ZXJ2YWwpO1xuXG4gIGpvYnNbam9iSWRdLnN0YXJ0ZWRBdCA9IERhdGUubm93KCk7XG5cbiAgam9ic1tqb2JJZF0uaW50ZXJ2YWxGdW5jID0gYWNjdXJhdGVJbnRlcnZhbCgoKSA9PiB7XG4gICAgam9ic1tqb2JJZF0uaW50ZXJ2YWxDb3VudCsrO1xuXG4gICAgaWYgKGpvYnNbam9iSWRdLmludGVydmFsQ291bnQgPiBudW1iZXJPZkludGVydmFscykge1xuICAgICAgc3RvcEpvYihqb2JJZCk7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgZm9yIChsZXQgaiA9IDA7IGogPCByZXF1ZXN0c1BlckludGVydmFsOyBqKyspIHtcbiAgICAgIGNyZWF0ZVJlcXVlc3RUb1BsYXRmb3JtKCk7XG4gICAgfVxuICB9LCBpbnRlcnZhbCAqIDEwMDApO1xuXG4gIGNvbnNvbGUubG9nKGBKb2Igc3RhcnRlZDogJHtqb2JJZH1gKTtcblxuICAvL3NlbmRKb2JVcGRhdGVUb0NsaWVudHMoam9iSWQpO1xufVxuXG5mdW5jdGlvbiBzdG9wSm9iKGpvYklkKSB7XG4gIGlmIChqb2JzW2pvYklkXSA9PSBudWxsKSB0aHJvdyBuZXcgRXJyb3IoYFVua25vd24gSm9iIElEOiAke2pvYklkfWApO1xuICBpZiAoam9ic1tqb2JJZF0uaW50ZXJ2YWxGdW5jID09IG51bGwpXG4gICAgdGhyb3cgbmV3IEVycm9yKGBKb2IgaXMgYWxyZWFkeSBzdG9wcGVkOiAke2pvYklkfWApO1xuICBqb2JzW2pvYklkXS5pbnRlcnZhbEZ1bmMuY2xlYXIoKTtcbiAgam9ic1tqb2JJZF0uaW50ZXJ2YWxGdW5jID0gbnVsbDtcbiAgam9ic1tqb2JJZF0uc3RvcHBlZEF0ID0gRGF0ZS5ub3coKTtcbiAgY29uc29sZS5sb2coJ1RvdGFsIHR4IHNlbmQ6ICcsIG1lc3NhZ2VDb3VudGVyKTtcbn1cblxuYXN5bmMgZnVuY3Rpb24gY3JlYXRlUmVxdWVzdFRvUGxhdGZvcm0oKSB7XG4gIHRyeSB7XG4gICAgLy8gbGV0IGtleSA9IGAke2tleVYxfSR7a2V5UnVubmluZ051bWJlcisrfWA7XG4gICAgLy8gbGV0IHZhbHVlID0gYCR7dmFsdWVWNH0ke3ZhbHVlUnVubmluZ051bWJlcisrfWA7XG4gICAgLy8gY29ubmVjdGlvbisrO1xuICAgIC8vIGF3YWl0IGZldGNoKGBodHRwOi8vJHtJUH06JHtQT1JUfS9icm9hZGNhc3RfdHhfc3luYz90eD1cIiR7a2V5fT0ke3ZhbHVlfVwiYCk7XG4gICAgLy8gaWYgKGNvbm5lY3Rpb24gPiBtYXhfY29ubmVjdGlvbikge1xuICAgIC8vICAgbWF4X2Nvbm5lY3Rpb24gPSBjb25uZWN0aW9uO1xuICAgIC8vICAgY29uc29sZS5sb2coJ01heCBjb25uZWN0aW9uIDogJywgbWF4X2Nvbm5lY3Rpb24pO1xuICAgIC8vIH1cbiAgICAvLyBjb25uZWN0aW9uLS07XG4gICAgLy8gbWVzc2FnZUNvdW50ZXIrKztcblxuICAgIGxldCBrZXkgPSBgJHtrZXlWMX0ke2tleVJ1bm5pbmdOdW1iZXIrK31gO1xuXG4gICAgLy8gbGV0IHZhbHVlID0gYCR7dmFsdWVWNH0ke3ZhbHVlUnVubmluZ051bWJlcisrfWA7XG4gICAgLy8gbGV0IHBhcmFtID0gYCR7a2V5fT0ke3ZhbHVlfWA7XG4gICAgLy8gbGV0IGJ1ZmZlciA9IEJ1ZmZlci5mcm9tKHBhcmFtLCAndXRmOCcpO1xuICAgIGNvbnN0IHJlcXVlc3REYXRhVG9CbG9ja2NoYWluID0ge1xuICAgICAgbW9kZTogMSxcbiAgICAgIHJlcXVlc3RfaWQ6IGtleSxcbiAgICAgIG1pbl9pZHA6IDEsXG4gICAgICBtaW5fYWFsOiAxLFxuICAgICAgbWluX2lhbDogMS4xLFxuICAgICAgcmVxdWVzdF90aW1lb3V0OiAzNjAwLFxuICAgICAgZGF0YV9yZXF1ZXN0X2xpc3Q6IHtcbiAgICAgICAgc2VydmljZV9pZDogJ2Jhbmtfc3RhdGVtZW50JyxcbiAgICAgICAgYXNfaWRfbGlzdDogWydhc18xJ10sXG4gICAgICAgIG1pbl9hczogMSxcbiAgICAgICAgcmVxdWVzdF9wYXJhbXNfaGFzaDogJ2hhc2gnLFxuICAgICAgfSxcbiAgICAgIHJlcXVlc3RfbWVzc2FnZV9oYXNoOiAnaGFzaCcsXG4gICAgICBpZHBfaWRfbGlzdDogWydpZHBfMSddLFxuICAgICAgcHVycG9zZTogbnVsbCxcbiAgICB9O1xuXG4gICAgbGV0IHJlcXVlc3QgPSB7XG4gICAgICBub2RlSWQ6ICdycF8xJyxcbiAgICAgIGZuTmFtZTogJ0NyZWF0ZVJlcXVlc3QnLFxuICAgICAgcGFyYW1zOiByZXF1ZXN0RGF0YVRvQmxvY2tjaGFpbixcbiAgICB9O1xuXG4gICAgdHJhbnNhY3QocmVxdWVzdCk7XG4gICAgLy8gYXdhaXQgdGVuZGVybWludFdzUG9vbC5nZXRDb25uZWN0aW9uKCkuYnJvYWRjYXN0VHhTeW5jKGJ1ZmZlcik7XG4gICAgbWVzc2FnZUNvdW50ZXIrKztcbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICBjb25zb2xlLmVycm9yKGVycm9yKTtcbiAgfVxufVxuXG5hc3luYyBmdW5jdGlvbiBjb25uZWN0V1MoZHVyYXRpb24sIHR4cGVyc2VjKSB7XG4gIGF3YWl0IHRlbmRlcm1pbnRXc1Bvb2wuaW5pdGlhbGl6ZSgpO1xuICBzdGFydEpvYihkdXJhdGlvbiwgMSwgdHhwZXJzZWMpO1xufVxuY29ubmVjdFdTKGR1cmF0aW9uLCB0eHBlcnNlYyk7XG5cbmFzeW5jIGZ1bmN0aW9uIHRyYW5zYWN0KHtcbiAgbm9kZUlkLFxuICBmbk5hbWUsXG4gIHBhcmFtcyxcbiAgbm9uY2UgPSB1dGlscy5nZXROb25jZSgpLFxuICB1c2VNYXN0ZXJLZXkgPSBmYWxzZSxcbn0pIHtcbiAgY29uc3QgcGFyYW1zSnNvblN0cmluZyA9IEpTT04uc3RyaW5naWZ5KHBhcmFtcyk7XG4gIGNvbnN0IHR4T2JqZWN0ID0ge1xuICAgIG1ldGhvZDogZm5OYW1lLFxuICAgIHBhcmFtczogcGFyYW1zSnNvblN0cmluZyxcbiAgICBub25jZSxcbiAgICBzaWduYXR1cmU6IGF3YWl0IHV0aWxzLmNyZWF0ZVNpZ25hdHVyZShcbiAgICAgIEJ1ZmZlci5jb25jYXQoW1xuICAgICAgICBCdWZmZXIuZnJvbShmbk5hbWUsICd1dGY4JyksXG4gICAgICAgIEJ1ZmZlci5mcm9tKHBhcmFtc0pzb25TdHJpbmcsICd1dGY4JyksXG4gICAgICAgIG5vbmNlLFxuICAgICAgXSkudG9TdHJpbmcoJ2Jhc2U2NCcpLFxuICAgICAgbm9kZUlkLFxuICAgICAgdXNlTWFzdGVyS2V5XG4gICAgKSxcbiAgICBub2RlX2lkOiBub2RlSWQsXG4gIH07XG5cbiAgY29uc3QgdHhQcm90byA9IFRlbmRlcm1pbnRUeC5jcmVhdGUodHhPYmplY3QpO1xuICBjb25zdCB0eFByb3RvQnVmZmVyID0gVGVuZGVybWludFR4LmVuY29kZSh0eFByb3RvKS5maW5pc2goKTtcbiAgY29uc3QgcmVzcG9uc2VSZXN1bHQgPSBhd2FpdCB0ZW5kZXJtaW50V3NQb29sXG4gICAgLmdldENvbm5lY3Rpb24oKVxuICAgIC5icm9hZGNhc3RUeFN5bmModHhQcm90b0J1ZmZlcik7XG4gIGNvbnNvbGUubG9nKHJlc3BvbnNlUmVzdWx0KTtcbn1cbiJdfQ==