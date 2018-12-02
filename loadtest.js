var NanoTimer = require('nanotimer');
var fs = require('fs');
var path = require('path');
var http = require('http');

var timer = new NanoTimer();
var messageCounter = 0;
let duration = process.env.DURATION || 1;
let txpersec = process.env.TXPERSEC || 1;
let reference_id = 0

let data = {
  mode: 1,
  namespace: 'cid',
  identifier: '1234',
  reference_id: (reference_id++).toString(),
  callback_url: 'http://localhost:9000',
  idp_id_list: ['idp1'],
  data_request_list: [
    {
      service_id: 'bank_statement',
      as_id_list: ['as1'],
      min_as: 1,
      request_params: { format: 'pdf' },
    },
  ],
  request_message: 'Loadtest',
  min_ial: 1.1,
  min_aal: 1,
  min_idp: 1,
  request_timeout: 259200,
};

let address = [
  {
    host: '127.0.0.1',
    port: '8100',
  },
  {
    host: '127.0.0.1',
    port: '8101',
  },
  {
    host: '127.0.0.1',
    port: '8102',
  },
];

async function callRequest(_duration, _mode) {
  var duration_microsec = _duration * 1000000 + 500 + 'u';
  startTime = new Date();
  const interval = 1000000 / _mode + 'u';
  timer.setInterval(PostRequest, '', interval);
  timer.setTimeout(timeout, [timer], duration_microsec);
}

async function PostRequest() {
  try {
    const index = messageCounter % 3;
    var post_data = JSON.stringify(data);
    var post_options = {
      host: address[index].host,
      port: address[index].port,
      path: '/v2/rp/requests/cid/12345',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    };
    var post_req = http.request(post_options, function(res) {
      res.setEncoding('utf8');
    });

    post_req.write(post_data);
    post_req.end();
    messageCounter++;
  } catch (error) {
    throw error;
  }
}

function timeout(timer) {
  timer.clearInterval();
  console.log('Total tx send: ', messageCounter);
}

callRequest(duration, txpersec);

// arrAvg
// const arrAvg = arr => arr.reduce((a,b) => a + b, 0) / arr.length
