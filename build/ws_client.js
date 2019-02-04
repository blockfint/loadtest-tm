"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _events = _interopRequireDefault(require("events"));

var _ws = _interopRequireDefault(require("ws"));

var _simpleBackoff = require("simple-backoff");

/**
 * Copyright (c) 2018, 2019 National Digital ID COMPANY LIMITED
 *
 * This file is part of NDID software.
 *
 * NDID is the free software: you can redistribute it and/or modify it under
 * the terms of the Affero GNU General Public License as published by the
 * Free Software Foundation, either version 3 of the License, or any later
 * version.
 *
 * NDID is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the Affero GNU General Public License for more details.
 *
 * You should have received a copy of the Affero GNU General Public License
 * along with the NDID source code. If not, see https://www.gnu.org/licenses/agpl.txt.
 *
 * Please contact info@ndid.co.th for any further questions
 *
 */
let tendermintAddress = '52.163.191.111:26000'; // import { tendermintAddress } from '../config';
// import CustomError from 'ndid-error/custom_error';
// const PING_INTERVAL = 30000;

const PING_TIMEOUT_MS = 60000;

class TendermintWsClient extends _events.default {
  constructor(name = '', connect) {
    super();
    this.name = name;
    this.connected = false; // this.isAlive = false;

    this.reconnect = true;
    this.rpcId = 0;
    this.queue = [];
    this.backoff = new _simpleBackoff.ExponentialBackoff({
      min: 1000,
      max: 15000,
      factor: 2,
      jitter: 0
    });

    if (connect) {
      this.connect();
    }
  }

  connect() {
    console.log('Tendermint WS connecting : ', this.name); // logger.info({
    //   message: 'Tendermint WS connecting',
    //   name: this.name,
    // });

    this.ws = new _ws.default(`ws://${tendermintAddress}/websocket`);
    this.ws.on('open', () => {
      console.log('Tendermint WS connected : ', this.name); // logger.info({
      //   message: 'Tendermint WS connected',
      //   name: this.name,
      // });
      // Reset backoff interval

      this.backoff.reset();
      this.reconnectTimeoutFn = null;
      this.connected = true;
      this.emit('connected');
      this.pingTimeoutFn = setTimeout(() => {
        this.pingTimeout();
      }, PING_TIMEOUT_MS);
    });
    this.ws.on('close', (code, reason) => {
      if (this.connected === true) {
        console.log('Tendermint WS disconnected ', this.name, code, reason); // logger.info({
        //   message: 'Tendermint WS disconnected',
        //   name: this.name,
        //   code,
        //   reason,
        // });
        // Reject all `_call` promises

        for (let rpcId in this.queue) {
          console.log('Connection closed: ', rpcId); // const error = new CustomError({
          //   message: 'Connection closed',
          //   details: {
          //     rpcId,
          //   },
          // });

          this.queue[rpcId].promise[1](error);
          delete this.queue[rpcId];
        }

        this.emit('disconnected');
      }

      this.connected = false; // this.isAlive = false;
      // clearInterval(this.pingIntervalFn);
      // this.pingIntervalFn = null;

      clearTimeout(this.pingTimeoutFn);
      this.pingTimeoutFn = null;

      if (this.reconnect) {
        // Try reconnect
        const backoffTime = this.backoff.next();
        console.log(`Tendermint WS try reconnect in ${backoffTime} ms`); // logger.debug({
        //   message: `Tendermint WS try reconnect in ${backoffTime} ms`,
        //   name: this.name,
        // });

        this.reconnectTimeoutFn = setTimeout(() => this.connect(), backoffTime);
      }
    });
    this.ws.on('error', error => {
      console.log('Tendermint WS error: ', this.name, error); // logger.error({
      //   message: 'Tendermint WS error',
      //   name: this.name,
      //   error,
      // });
      // this.emit('error', error);
    });
    this.ws.on('message', message => {
      // logger.debug({
      //   message: 'Data received from tendermint WS',
      //   name: this.name,
      //   data: message,
      // });
      try {
        message = JSON.parse(message);
      } catch (error) {
        console.log('Error JSON parsing message received from tendermint: ', this.name, message); // logger.warn({
        //   message: 'Error JSON parsing message received from tendermint',
        //   name: this.name,
        //   data: message,
        //   error,
        // });

        return;
      }

      const rpcId = parseInt(message.id);

      if (this.queue[rpcId]) {
        if (message.error) {
          console.log('JSON-RPC ERROR: ', message.error, rpcId); // const error = new CustomError({
          //   message: 'JSON-RPC ERROR',
          //   details: {
          //     error: message.error,
          //     rpcId,
          //   },
          // });

          this.queue[rpcId].promise[1](error);
        } else {
          this.queue[rpcId].promise[0](message.result);
        }

        delete this.queue[rpcId];
        return;
      }

      this.emit(message.id, message.error, message.result);
    }); // this.ws.on('pong', () => {
    //   this.isAlive = true;
    // });

    this.ws.on('ping', () => {
      // console.log('>>>RECEIVED PING<<<', Date.now())
      clearTimeout(this.pingTimeoutFn);
      this.pingTimeoutFn = setTimeout(() => {
        this.pingTimeout();
      }, PING_TIMEOUT_MS);
    });
  }

  pingTimeout() {
    console.log('Tendermint WS ping timed out (did not receive ping from server). Terminating conenction.', this.name); // logger.debug({
    //   message:
    //     'Tendermint WS ping timed out (did not receive ping from server). Terminating conenction.',
    //   name: this.name,
    // });

    this.ws.terminate();
  }
  /**
   *
   * @returns {Promise<Object>}
   */


  status() {
    return this._call('status', []);
  }
  /**
   *
   * @param {number} height Block height to query
   * @returns {Promise<Object>}
   */


  block(height) {
    return this._call('block', [`${height}`]);
  }

  blockResults(height) {
    return this._call('block_results', [`${height}`]);
  }

  tx(hash, prove) {
    return this._call('tx', {
      hash: hash.toString('base64'),
      prove
    });
  }

  abciQuery(data, height) {
    const params = {
      data: data.toString('hex')
    };

    if (height) {
      params.height = `${height}`;
    }

    return this._call('abci_query', params);
  }

  broadcastTxCommit(tx) {
    return this._call('broadcast_tx_commit', {
      tx: tx.toString('base64')
    });
  }

  broadcastTxSync(tx) {
    return this._call('broadcast_tx_sync', {
      tx: tx.toString('base64')
    });
  }

  subscribeToNewBlockHeaderEvent() {
    if (this.connected) {
      this.ws.send(JSON.stringify({
        jsonrpc: '2.0',
        method: 'subscribe',
        params: ["tm.event = 'NewBlockHeader'"],
        id: 'newBlockHeader'
      }));
    }
  }

  subscribeToNewBlockEvent() {
    if (this.connected) {
      this.ws.send(JSON.stringify({
        jsonrpc: '2.0',
        method: 'subscribe',
        params: ["tm.event = 'NewBlock'"],
        id: 'newBlock'
      }));
    }
  }

  subscribeToTxEvent() {
    if (this.connected) {
      this.ws.send(JSON.stringify({
        jsonrpc: '2.0',
        method: 'subscribe',
        params: ["tm.event = 'Tx'"],
        id: 'tx'
      }));
    }
  }

  close() {
    if (!this.ws) return;
    this.reconnect = false;
    clearTimeout(this.reconnectTimeoutFn);
    this.reconnectTimeoutFn = null;
    this.ws.close();
  }

  _call(method, params, wsOpts) {
    return new Promise((resolve, reject) => {
      if (!this.connected) {
        return reject(new Error('socket is not connected'));
      }

      const id = ++this.rpcId;
      const message = {
        jsonrpc: '2.0',
        method: method,
        params: params || null,
        id: id.toString()
      };
      console.log('Calling Tendermint through WS: ', this.name, message); // logger.debug({
      //   message: 'Calling Tendermint through WS',
      //   name: this.name,
      //   payload: message,
      // });

      this.ws.send(JSON.stringify(message), wsOpts, error => {
        if (error) {
          return reject('Tendermint WS send error'); // return reject(
          //   new CustomError({
          //     message: 'Tendermint WS send error',
          //     details: {
          //       error,
          //       rpcId: id,
          //     },
          //   })
          // );
        }

        this.queue[id] = {
          promise: [resolve, reject]
        };
      });
    });
  }

}

exports.default = TendermintWsClient;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy93c19jbGllbnQuanMiXSwibmFtZXMiOlsidGVuZGVybWludEFkZHJlc3MiLCJQSU5HX1RJTUVPVVRfTVMiLCJUZW5kZXJtaW50V3NDbGllbnQiLCJFdmVudEVtaXR0ZXIiLCJjb25zdHJ1Y3RvciIsIm5hbWUiLCJjb25uZWN0IiwiY29ubmVjdGVkIiwicmVjb25uZWN0IiwicnBjSWQiLCJxdWV1ZSIsImJhY2tvZmYiLCJFeHBvbmVudGlhbEJhY2tvZmYiLCJtaW4iLCJtYXgiLCJmYWN0b3IiLCJqaXR0ZXIiLCJjb25zb2xlIiwibG9nIiwid3MiLCJXZWJTb2NrZXQiLCJvbiIsInJlc2V0IiwicmVjb25uZWN0VGltZW91dEZuIiwiZW1pdCIsInBpbmdUaW1lb3V0Rm4iLCJzZXRUaW1lb3V0IiwicGluZ1RpbWVvdXQiLCJjb2RlIiwicmVhc29uIiwicHJvbWlzZSIsImVycm9yIiwiY2xlYXJUaW1lb3V0IiwiYmFja29mZlRpbWUiLCJuZXh0IiwibWVzc2FnZSIsIkpTT04iLCJwYXJzZSIsInBhcnNlSW50IiwiaWQiLCJyZXN1bHQiLCJ0ZXJtaW5hdGUiLCJzdGF0dXMiLCJfY2FsbCIsImJsb2NrIiwiaGVpZ2h0IiwiYmxvY2tSZXN1bHRzIiwidHgiLCJoYXNoIiwicHJvdmUiLCJ0b1N0cmluZyIsImFiY2lRdWVyeSIsImRhdGEiLCJwYXJhbXMiLCJicm9hZGNhc3RUeENvbW1pdCIsImJyb2FkY2FzdFR4U3luYyIsInN1YnNjcmliZVRvTmV3QmxvY2tIZWFkZXJFdmVudCIsInNlbmQiLCJzdHJpbmdpZnkiLCJqc29ucnBjIiwibWV0aG9kIiwic3Vic2NyaWJlVG9OZXdCbG9ja0V2ZW50Iiwic3Vic2NyaWJlVG9UeEV2ZW50IiwiY2xvc2UiLCJ3c09wdHMiLCJQcm9taXNlIiwicmVzb2x2ZSIsInJlamVjdCIsIkVycm9yIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7QUFxQkE7O0FBRUE7O0FBQ0E7O0FBeEJBOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUEw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QUosQ0FBWSxDQUFDQyxPQUFELEVBQVVDLE1BQVYsS0FBcUI7QUFDdEMsVUFBSSxDQUFDLEtBQUs1RCxTQUFWLEVBQXFCO0FBQ25CLGVBQU80RCxNQUFNLENBQUMsSUFBSUMsS0FBSixDQUFVLHlCQUFWLENBQUQsQ0FBYjtBQUNEOztBQUVELFlBQU03QixFQUFFLEdBQUcsRUFBRSxLQUFLOUIsS0FBbEI7QUFDQSxZQUFNMEIsT0FBTyxHQUFHO0FBQ2R3QixRQUFBQSxPQUFPLEVBQUUsS0FESztBQUVkQyxRQUFBQSxNQUFNLEVBQUVBLE1BRk07QUFHZFAsUUFBQUEsTUFBTSxFQUFFQSxNQUFNLElBQUksSUFISjtBQUlkZCxRQUFBQSxFQUFFLEVBQUVBLEVBQUUsQ0FBQ1csUUFBSDtBQUpVLE9BQWhCO0FBTUFqQyxNQUFBQSxPQUFPLENBQUNDLEdBQVIsQ0FBWSxpQ0FBWixFQUErQyxLQUFLYixJQUFwRCxFQUEwRDhCLE9BQTFELEVBWnNDLENBY3RDO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBQ0EsV0FBS2hCLEVBQUwsQ0FBUXNDLElBQVIsQ0FBYXJCLElBQUksQ0FBQ3NCLFNBQUwsQ0FBZXZCLE9BQWYsQ0FBYixFQUFzQzZCLE1BQXRDLEVBQThDakMsS0FBSyxJQUFJO0FBQ3JELFlBQUlBLEtBQUosRUFBVztBQUNULGlCQUFPb0MsTUFBTSxDQUFDLDBCQUFELENBQWIsQ0FEUyxDQUVUO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNEOztBQUVELGFBQUt6RCxLQUFMLENBQVc2QixFQUFYLElBQWlCO0FBQUVULFVBQUFBLE9BQU8sRUFBRSxDQUFDb0MsT0FBRCxFQUFVQyxNQUFWO0FBQVgsU0FBakI7QUFDRCxPQWZEO0FBZ0JELEtBbkNNLENBQVA7QUFvQ0Q7O0FBNVMwRCIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQ29weXJpZ2h0IChjKSAyMDE4LCAyMDE5IE5hdGlvbmFsIERpZ2l0YWwgSUQgQ09NUEFOWSBMSU1JVEVEXG4gKlxuICogVGhpcyBmaWxlIGlzIHBhcnQgb2YgTkRJRCBzb2Z0d2FyZS5cbiAqXG4gKiBORElEIGlzIHRoZSBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5IGl0IHVuZGVyXG4gKiB0aGUgdGVybXMgb2YgdGhlIEFmZmVybyBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnkgdGhlXG4gKiBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb24sIGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlIExpY2Vuc2UsIG9yIGFueSBsYXRlclxuICogdmVyc2lvbi5cbiAqXG4gKiBORElEIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLlxuICogU2VlIHRoZSBBZmZlcm8gR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBBZmZlcm8gR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2VcbiAqIGFsb25nIHdpdGggdGhlIE5ESUQgc291cmNlIGNvZGUuIElmIG5vdCwgc2VlIGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvYWdwbC50eHQuXG4gKlxuICogUGxlYXNlIGNvbnRhY3QgaW5mb0BuZGlkLmNvLnRoIGZvciBhbnkgZnVydGhlciBxdWVzdGlvbnNcbiAqXG4gKi9cbmltcG9ydCBFdmVudEVtaXR0ZXIgZnJvbSAnZXZlbnRzJztcblxuaW1wb3J0IFdlYlNvY2tldCBmcm9tICd3cyc7XG5pbXBvcnQgeyBFeHBvbmVudGlhbEJhY2tvZmYgfSBmcm9tICdzaW1wbGUtYmFja29mZic7XG5cbmxldCB0ZW5kZXJtaW50QWRkcmVzcyA9ICc1Mi4xNjMuMTkxLjExMToyNjAwMCc7XG4vLyBpbXBvcnQgeyB0ZW5kZXJtaW50QWRkcmVzcyB9IGZyb20gJy4uL2NvbmZpZyc7XG4vLyBpbXBvcnQgQ3VzdG9tRXJyb3IgZnJvbSAnbmRpZC1lcnJvci9jdXN0b21fZXJyb3InO1xuXG4vLyBjb25zdCBQSU5HX0lOVEVSVkFMID0gMzAwMDA7XG5jb25zdCBQSU5HX1RJTUVPVVRfTVMgPSA2MDAwMDtcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgVGVuZGVybWludFdzQ2xpZW50IGV4dGVuZHMgRXZlbnRFbWl0dGVyIHtcbiAgY29uc3RydWN0b3IobmFtZSA9ICcnLCBjb25uZWN0KSB7XG4gICAgc3VwZXIoKTtcbiAgICB0aGlzLm5hbWUgPSBuYW1lO1xuICAgIHRoaXMuY29ubmVjdGVkID0gZmFsc2U7XG4gICAgLy8gdGhpcy5pc0FsaXZlID0gZmFsc2U7XG4gICAgdGhpcy5yZWNvbm5lY3QgPSB0cnVlO1xuICAgIHRoaXMucnBjSWQgPSAwO1xuICAgIHRoaXMucXVldWUgPSBbXTtcbiAgICB0aGlzLmJhY2tvZmYgPSBuZXcgRXhwb25lbnRpYWxCYWNrb2ZmKHtcbiAgICAgIG1pbjogMTAwMCxcbiAgICAgIG1heDogMTUwMDAsXG4gICAgICBmYWN0b3I6IDIsXG4gICAgICBqaXR0ZXI6IDAsXG4gICAgfSk7XG4gICAgaWYgKGNvbm5lY3QpIHtcbiAgICAgIHRoaXMuY29ubmVjdCgpO1xuICAgIH1cbiAgfVxuXG4gIGNvbm5lY3QoKSB7XG4gICAgY29uc29sZS5sb2coJ1RlbmRlcm1pbnQgV1MgY29ubmVjdGluZyA6ICcsIHRoaXMubmFtZSk7XG4gICAgLy8gbG9nZ2VyLmluZm8oe1xuICAgIC8vICAgbWVzc2FnZTogJ1RlbmRlcm1pbnQgV1MgY29ubmVjdGluZycsXG4gICAgLy8gICBuYW1lOiB0aGlzLm5hbWUsXG4gICAgLy8gfSk7XG4gICAgdGhpcy53cyA9IG5ldyBXZWJTb2NrZXQoYHdzOi8vJHt0ZW5kZXJtaW50QWRkcmVzc30vd2Vic29ja2V0YCk7XG4gICAgdGhpcy53cy5vbignb3BlbicsICgpID0+IHtcbiAgICAgIGNvbnNvbGUubG9nKCdUZW5kZXJtaW50IFdTIGNvbm5lY3RlZCA6ICcsIHRoaXMubmFtZSk7XG4gICAgICAvLyBsb2dnZXIuaW5mbyh7XG4gICAgICAvLyAgIG1lc3NhZ2U6ICdUZW5kZXJtaW50IFdTIGNvbm5lY3RlZCcsXG4gICAgICAvLyAgIG5hbWU6IHRoaXMubmFtZSxcbiAgICAgIC8vIH0pO1xuICAgICAgLy8gUmVzZXQgYmFja29mZiBpbnRlcnZhbFxuICAgICAgdGhpcy5iYWNrb2ZmLnJlc2V0KCk7XG4gICAgICB0aGlzLnJlY29ubmVjdFRpbWVvdXRGbiA9IG51bGw7XG5cbiAgICAgIHRoaXMuY29ubmVjdGVkID0gdHJ1ZTtcblxuICAgICAgdGhpcy5lbWl0KCdjb25uZWN0ZWQnKTtcblxuICAgICAgdGhpcy5waW5nVGltZW91dEZuID0gc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgIHRoaXMucGluZ1RpbWVvdXQoKTtcbiAgICAgIH0sIFBJTkdfVElNRU9VVF9NUyk7XG4gICAgfSk7XG5cbiAgICB0aGlzLndzLm9uKCdjbG9zZScsIChjb2RlLCByZWFzb24pID0+IHtcbiAgICAgIGlmICh0aGlzLmNvbm5lY3RlZCA9PT0gdHJ1ZSkge1xuICAgICAgICBjb25zb2xlLmxvZygnVGVuZGVybWludCBXUyBkaXNjb25uZWN0ZWQgJywgdGhpcy5uYW1lLCBjb2RlLCByZWFzb24pO1xuICAgICAgICAvLyBsb2dnZXIuaW5mbyh7XG4gICAgICAgIC8vICAgbWVzc2FnZTogJ1RlbmRlcm1pbnQgV1MgZGlzY29ubmVjdGVkJyxcbiAgICAgICAgLy8gICBuYW1lOiB0aGlzLm5hbWUsXG4gICAgICAgIC8vICAgY29kZSxcbiAgICAgICAgLy8gICByZWFzb24sXG4gICAgICAgIC8vIH0pO1xuXG4gICAgICAgIC8vIFJlamVjdCBhbGwgYF9jYWxsYCBwcm9taXNlc1xuICAgICAgICBmb3IgKGxldCBycGNJZCBpbiB0aGlzLnF1ZXVlKSB7XG4gICAgICAgICAgY29uc29sZS5sb2coJ0Nvbm5lY3Rpb24gY2xvc2VkOiAnLCBycGNJZCk7XG4gICAgICAgICAgLy8gY29uc3QgZXJyb3IgPSBuZXcgQ3VzdG9tRXJyb3Ioe1xuICAgICAgICAgIC8vICAgbWVzc2FnZTogJ0Nvbm5lY3Rpb24gY2xvc2VkJyxcbiAgICAgICAgICAvLyAgIGRldGFpbHM6IHtcbiAgICAgICAgICAvLyAgICAgcnBjSWQsXG4gICAgICAgICAgLy8gICB9LFxuICAgICAgICAgIC8vIH0pO1xuICAgICAgICAgIHRoaXMucXVldWVbcnBjSWRdLnByb21pc2VbMV0oZXJyb3IpO1xuICAgICAgICAgIGRlbGV0ZSB0aGlzLnF1ZXVlW3JwY0lkXTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuZW1pdCgnZGlzY29ubmVjdGVkJyk7XG4gICAgICB9XG5cbiAgICAgIHRoaXMuY29ubmVjdGVkID0gZmFsc2U7XG4gICAgICAvLyB0aGlzLmlzQWxpdmUgPSBmYWxzZTtcbiAgICAgIC8vIGNsZWFySW50ZXJ2YWwodGhpcy5waW5nSW50ZXJ2YWxGbik7XG4gICAgICAvLyB0aGlzLnBpbmdJbnRlcnZhbEZuID0gbnVsbDtcbiAgICAgIGNsZWFyVGltZW91dCh0aGlzLnBpbmdUaW1lb3V0Rm4pO1xuICAgICAgdGhpcy5waW5nVGltZW91dEZuID0gbnVsbDtcblxuICAgICAgaWYgKHRoaXMucmVjb25uZWN0KSB7XG4gICAgICAgIC8vIFRyeSByZWNvbm5lY3RcbiAgICAgICAgY29uc3QgYmFja29mZlRpbWUgPSB0aGlzLmJhY2tvZmYubmV4dCgpO1xuICAgICAgICBjb25zb2xlLmxvZyhgVGVuZGVybWludCBXUyB0cnkgcmVjb25uZWN0IGluICR7YmFja29mZlRpbWV9IG1zYCk7XG4gICAgICAgIC8vIGxvZ2dlci5kZWJ1Zyh7XG4gICAgICAgIC8vICAgbWVzc2FnZTogYFRlbmRlcm1pbnQgV1MgdHJ5IHJlY29ubmVjdCBpbiAke2JhY2tvZmZUaW1lfSBtc2AsXG4gICAgICAgIC8vICAgbmFtZTogdGhpcy5uYW1lLFxuICAgICAgICAvLyB9KTtcbiAgICAgICAgdGhpcy5yZWNvbm5lY3RUaW1lb3V0Rm4gPSBzZXRUaW1lb3V0KCgpID0+IHRoaXMuY29ubmVjdCgpLCBiYWNrb2ZmVGltZSk7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICB0aGlzLndzLm9uKCdlcnJvcicsIGVycm9yID0+IHtcbiAgICAgIGNvbnNvbGUubG9nKCdUZW5kZXJtaW50IFdTIGVycm9yOiAnLCB0aGlzLm5hbWUsIGVycm9yKTtcbiAgICAgIC8vIGxvZ2dlci5lcnJvcih7XG4gICAgICAvLyAgIG1lc3NhZ2U6ICdUZW5kZXJtaW50IFdTIGVycm9yJyxcbiAgICAgIC8vICAgbmFtZTogdGhpcy5uYW1lLFxuICAgICAgLy8gICBlcnJvcixcbiAgICAgIC8vIH0pO1xuICAgICAgLy8gdGhpcy5lbWl0KCdlcnJvcicsIGVycm9yKTtcbiAgICB9KTtcblxuICAgIHRoaXMud3Mub24oJ21lc3NhZ2UnLCBtZXNzYWdlID0+IHtcbiAgICAgIC8vIGxvZ2dlci5kZWJ1Zyh7XG4gICAgICAvLyAgIG1lc3NhZ2U6ICdEYXRhIHJlY2VpdmVkIGZyb20gdGVuZGVybWludCBXUycsXG4gICAgICAvLyAgIG5hbWU6IHRoaXMubmFtZSxcbiAgICAgIC8vICAgZGF0YTogbWVzc2FnZSxcbiAgICAgIC8vIH0pO1xuICAgICAgdHJ5IHtcbiAgICAgICAgbWVzc2FnZSA9IEpTT04ucGFyc2UobWVzc2FnZSk7XG4gICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICBjb25zb2xlLmxvZyhcbiAgICAgICAgICAnRXJyb3IgSlNPTiBwYXJzaW5nIG1lc3NhZ2UgcmVjZWl2ZWQgZnJvbSB0ZW5kZXJtaW50OiAnLFxuICAgICAgICAgIHRoaXMubmFtZSxcbiAgICAgICAgICBtZXNzYWdlXG4gICAgICAgICk7XG4gICAgICAgIC8vIGxvZ2dlci53YXJuKHtcbiAgICAgICAgLy8gICBtZXNzYWdlOiAnRXJyb3IgSlNPTiBwYXJzaW5nIG1lc3NhZ2UgcmVjZWl2ZWQgZnJvbSB0ZW5kZXJtaW50JyxcbiAgICAgICAgLy8gICBuYW1lOiB0aGlzLm5hbWUsXG4gICAgICAgIC8vICAgZGF0YTogbWVzc2FnZSxcbiAgICAgICAgLy8gICBlcnJvcixcbiAgICAgICAgLy8gfSk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgY29uc3QgcnBjSWQgPSBwYXJzZUludChtZXNzYWdlLmlkKTtcbiAgICAgIGlmICh0aGlzLnF1ZXVlW3JwY0lkXSkge1xuICAgICAgICBpZiAobWVzc2FnZS5lcnJvcikge1xuICAgICAgICAgIGNvbnNvbGUubG9nKCdKU09OLVJQQyBFUlJPUjogJywgbWVzc2FnZS5lcnJvciwgcnBjSWQpO1xuICAgICAgICAgIC8vIGNvbnN0IGVycm9yID0gbmV3IEN1c3RvbUVycm9yKHtcbiAgICAgICAgICAvLyAgIG1lc3NhZ2U6ICdKU09OLVJQQyBFUlJPUicsXG4gICAgICAgICAgLy8gICBkZXRhaWxzOiB7XG4gICAgICAgICAgLy8gICAgIGVycm9yOiBtZXNzYWdlLmVycm9yLFxuICAgICAgICAgIC8vICAgICBycGNJZCxcbiAgICAgICAgICAvLyAgIH0sXG4gICAgICAgICAgLy8gfSk7XG4gICAgICAgICAgdGhpcy5xdWV1ZVtycGNJZF0ucHJvbWlzZVsxXShlcnJvcik7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdGhpcy5xdWV1ZVtycGNJZF0ucHJvbWlzZVswXShtZXNzYWdlLnJlc3VsdCk7XG4gICAgICAgIH1cblxuICAgICAgICBkZWxldGUgdGhpcy5xdWV1ZVtycGNJZF07XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgdGhpcy5lbWl0KG1lc3NhZ2UuaWQsIG1lc3NhZ2UuZXJyb3IsIG1lc3NhZ2UucmVzdWx0KTtcbiAgICB9KTtcblxuICAgIC8vIHRoaXMud3Mub24oJ3BvbmcnLCAoKSA9PiB7XG4gICAgLy8gICB0aGlzLmlzQWxpdmUgPSB0cnVlO1xuICAgIC8vIH0pO1xuXG4gICAgdGhpcy53cy5vbigncGluZycsICgpID0+IHtcbiAgICAgIC8vIGNvbnNvbGUubG9nKCc+Pj5SRUNFSVZFRCBQSU5HPDw8JywgRGF0ZS5ub3coKSlcbiAgICAgIGNsZWFyVGltZW91dCh0aGlzLnBpbmdUaW1lb3V0Rm4pO1xuICAgICAgdGhpcy5waW5nVGltZW91dEZuID0gc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgIHRoaXMucGluZ1RpbWVvdXQoKTtcbiAgICAgIH0sIFBJTkdfVElNRU9VVF9NUyk7XG4gICAgfSk7XG4gIH1cblxuICBwaW5nVGltZW91dCgpIHtcbiAgICBjb25zb2xlLmxvZyhcbiAgICAgICdUZW5kZXJtaW50IFdTIHBpbmcgdGltZWQgb3V0IChkaWQgbm90IHJlY2VpdmUgcGluZyBmcm9tIHNlcnZlcikuIFRlcm1pbmF0aW5nIGNvbmVuY3Rpb24uJyxcbiAgICAgIHRoaXMubmFtZVxuICAgICk7XG4gICAgLy8gbG9nZ2VyLmRlYnVnKHtcbiAgICAvLyAgIG1lc3NhZ2U6XG4gICAgLy8gICAgICdUZW5kZXJtaW50IFdTIHBpbmcgdGltZWQgb3V0IChkaWQgbm90IHJlY2VpdmUgcGluZyBmcm9tIHNlcnZlcikuIFRlcm1pbmF0aW5nIGNvbmVuY3Rpb24uJyxcbiAgICAvLyAgIG5hbWU6IHRoaXMubmFtZSxcbiAgICAvLyB9KTtcbiAgICB0aGlzLndzLnRlcm1pbmF0ZSgpO1xuICB9XG5cbiAgLyoqXG4gICAqXG4gICAqIEByZXR1cm5zIHtQcm9taXNlPE9iamVjdD59XG4gICAqL1xuICBzdGF0dXMoKSB7XG4gICAgcmV0dXJuIHRoaXMuX2NhbGwoJ3N0YXR1cycsIFtdKTtcbiAgfVxuXG4gIC8qKlxuICAgKlxuICAgKiBAcGFyYW0ge251bWJlcn0gaGVpZ2h0IEJsb2NrIGhlaWdodCB0byBxdWVyeVxuICAgKiBAcmV0dXJucyB7UHJvbWlzZTxPYmplY3Q+fVxuICAgKi9cbiAgYmxvY2soaGVpZ2h0KSB7XG4gICAgcmV0dXJuIHRoaXMuX2NhbGwoJ2Jsb2NrJywgW2Ake2hlaWdodH1gXSk7XG4gIH1cblxuICBibG9ja1Jlc3VsdHMoaGVpZ2h0KSB7XG4gICAgcmV0dXJuIHRoaXMuX2NhbGwoJ2Jsb2NrX3Jlc3VsdHMnLCBbYCR7aGVpZ2h0fWBdKTtcbiAgfVxuXG4gIHR4KGhhc2gsIHByb3ZlKSB7XG4gICAgcmV0dXJuIHRoaXMuX2NhbGwoJ3R4JywgeyBoYXNoOiBoYXNoLnRvU3RyaW5nKCdiYXNlNjQnKSwgcHJvdmUgfSk7XG4gIH1cblxuICBhYmNpUXVlcnkoZGF0YSwgaGVpZ2h0KSB7XG4gICAgY29uc3QgcGFyYW1zID0ge1xuICAgICAgZGF0YTogZGF0YS50b1N0cmluZygnaGV4JyksXG4gICAgfTtcbiAgICBpZiAoaGVpZ2h0KSB7XG4gICAgICBwYXJhbXMuaGVpZ2h0ID0gYCR7aGVpZ2h0fWA7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLl9jYWxsKCdhYmNpX3F1ZXJ5JywgcGFyYW1zKTtcbiAgfVxuXG4gIGJyb2FkY2FzdFR4Q29tbWl0KHR4KSB7XG4gICAgcmV0dXJuIHRoaXMuX2NhbGwoJ2Jyb2FkY2FzdF90eF9jb21taXQnLCB7IHR4OiB0eC50b1N0cmluZygnYmFzZTY0JykgfSk7XG4gIH1cblxuICBicm9hZGNhc3RUeFN5bmModHgpIHtcbiAgICByZXR1cm4gdGhpcy5fY2FsbCgnYnJvYWRjYXN0X3R4X3N5bmMnLCB7IHR4OiB0eC50b1N0cmluZygnYmFzZTY0JykgfSk7XG4gIH1cblxuICBzdWJzY3JpYmVUb05ld0Jsb2NrSGVhZGVyRXZlbnQoKSB7XG4gICAgaWYgKHRoaXMuY29ubmVjdGVkKSB7XG4gICAgICB0aGlzLndzLnNlbmQoXG4gICAgICAgIEpTT04uc3RyaW5naWZ5KHtcbiAgICAgICAgICBqc29ucnBjOiAnMi4wJyxcbiAgICAgICAgICBtZXRob2Q6ICdzdWJzY3JpYmUnLFxuICAgICAgICAgIHBhcmFtczogW1widG0uZXZlbnQgPSAnTmV3QmxvY2tIZWFkZXInXCJdLFxuICAgICAgICAgIGlkOiAnbmV3QmxvY2tIZWFkZXInLFxuICAgICAgICB9KVxuICAgICAgKTtcbiAgICB9XG4gIH1cblxuICBzdWJzY3JpYmVUb05ld0Jsb2NrRXZlbnQoKSB7XG4gICAgaWYgKHRoaXMuY29ubmVjdGVkKSB7XG4gICAgICB0aGlzLndzLnNlbmQoXG4gICAgICAgIEpTT04uc3RyaW5naWZ5KHtcbiAgICAgICAgICBqc29ucnBjOiAnMi4wJyxcbiAgICAgICAgICBtZXRob2Q6ICdzdWJzY3JpYmUnLFxuICAgICAgICAgIHBhcmFtczogW1widG0uZXZlbnQgPSAnTmV3QmxvY2snXCJdLFxuICAgICAgICAgIGlkOiAnbmV3QmxvY2snLFxuICAgICAgICB9KVxuICAgICAgKTtcbiAgICB9XG4gIH1cblxuICBzdWJzY3JpYmVUb1R4RXZlbnQoKSB7XG4gICAgaWYgKHRoaXMuY29ubmVjdGVkKSB7XG4gICAgICB0aGlzLndzLnNlbmQoXG4gICAgICAgIEpTT04uc3RyaW5naWZ5KHtcbiAgICAgICAgICBqc29ucnBjOiAnMi4wJyxcbiAgICAgICAgICBtZXRob2Q6ICdzdWJzY3JpYmUnLFxuICAgICAgICAgIHBhcmFtczogW1widG0uZXZlbnQgPSAnVHgnXCJdLFxuICAgICAgICAgIGlkOiAndHgnLFxuICAgICAgICB9KVxuICAgICAgKTtcbiAgICB9XG4gIH1cblxuICBjbG9zZSgpIHtcbiAgICBpZiAoIXRoaXMud3MpIHJldHVybjtcbiAgICB0aGlzLnJlY29ubmVjdCA9IGZhbHNlO1xuICAgIGNsZWFyVGltZW91dCh0aGlzLnJlY29ubmVjdFRpbWVvdXRGbik7XG4gICAgdGhpcy5yZWNvbm5lY3RUaW1lb3V0Rm4gPSBudWxsO1xuICAgIHRoaXMud3MuY2xvc2UoKTtcbiAgfVxuXG4gIF9jYWxsKG1ldGhvZCwgcGFyYW1zLCB3c09wdHMpIHtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgaWYgKCF0aGlzLmNvbm5lY3RlZCkge1xuICAgICAgICByZXR1cm4gcmVqZWN0KG5ldyBFcnJvcignc29ja2V0IGlzIG5vdCBjb25uZWN0ZWQnKSk7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IGlkID0gKyt0aGlzLnJwY0lkO1xuICAgICAgY29uc3QgbWVzc2FnZSA9IHtcbiAgICAgICAganNvbnJwYzogJzIuMCcsXG4gICAgICAgIG1ldGhvZDogbWV0aG9kLFxuICAgICAgICBwYXJhbXM6IHBhcmFtcyB8fCBudWxsLFxuICAgICAgICBpZDogaWQudG9TdHJpbmcoKSxcbiAgICAgIH07XG4gICAgICBjb25zb2xlLmxvZygnQ2FsbGluZyBUZW5kZXJtaW50IHRocm91Z2ggV1M6ICcsIHRoaXMubmFtZSwgbWVzc2FnZSk7XG5cbiAgICAgIC8vIGxvZ2dlci5kZWJ1Zyh7XG4gICAgICAvLyAgIG1lc3NhZ2U6ICdDYWxsaW5nIFRlbmRlcm1pbnQgdGhyb3VnaCBXUycsXG4gICAgICAvLyAgIG5hbWU6IHRoaXMubmFtZSxcbiAgICAgIC8vICAgcGF5bG9hZDogbWVzc2FnZSxcbiAgICAgIC8vIH0pO1xuICAgICAgdGhpcy53cy5zZW5kKEpTT04uc3RyaW5naWZ5KG1lc3NhZ2UpLCB3c09wdHMsIGVycm9yID0+IHtcbiAgICAgICAgaWYgKGVycm9yKSB7XG4gICAgICAgICAgcmV0dXJuIHJlamVjdCgnVGVuZGVybWludCBXUyBzZW5kIGVycm9yJyk7XG4gICAgICAgICAgLy8gcmV0dXJuIHJlamVjdChcbiAgICAgICAgICAvLyAgIG5ldyBDdXN0b21FcnJvcih7XG4gICAgICAgICAgLy8gICAgIG1lc3NhZ2U6ICdUZW5kZXJtaW50IFdTIHNlbmQgZXJyb3InLFxuICAgICAgICAgIC8vICAgICBkZXRhaWxzOiB7XG4gICAgICAgICAgLy8gICAgICAgZXJyb3IsXG4gICAgICAgICAgLy8gICAgICAgcnBjSWQ6IGlkLFxuICAgICAgICAgIC8vICAgICB9LFxuICAgICAgICAgIC8vICAgfSlcbiAgICAgICAgICAvLyApO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5xdWV1ZVtpZF0gPSB7IHByb21pc2U6IFtyZXNvbHZlLCByZWplY3RdIH07XG4gICAgICB9KTtcbiAgICB9KTtcbiAgfVxufVxuIl19