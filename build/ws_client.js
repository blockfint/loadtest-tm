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
let tendermintAddress = process.env.TENDERMINT_ADDRESS || '207.46.237.44:26000'; // import { tendermintAddress } from '../config';
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy93c19jbGllbnQuanMiXSwibmFtZXMiOlsidGVuZGVybWludEFkZHJlc3MiLCJwcm9jZXNzIiwiZW52IiwiVEVOREVSTUlOVF9BRERSRVNTIiwiUElOR19USU1FT1VUX01TIiwiVGVuZGVybWludFdzQ2xpZW50IiwiRXZlbnRFbWl0dGVyIiwiY29uc3RydWN0b3IiLCJuYW1lIiwiY29ubmVjdCIsImNvbm5lY3RlZCIsInJlY29ubmVjdCIsInJwY0lkIiwicXVldWUiLCJiYWNrb2ZmIiwiRXhwb25lbnRpYWxCYWNrb2ZmIiwibWluIiwibWF4IiwiZmFjdG9yIiwiaml0dGVyIiwiY29uc29sZSIsImxvZyIsIndzIiwiV2ViU29ja2V0Iiwib24iLCJyZXNldCIsInJlY29ubmVjdFRpbWVvdXRGbiIsImVtaXQiLCJwaW5nVGltZW91dEZuIiwic2V0VGltZW91dCIsInBpbmdUaW1lb3V0IiwiY29kZSIsInJlYXNvbiIsInByb21pc2UiLCJlcnJvciIsImNsZWFyVGltZW91dCIsImJhY2tvZmZUaW1lIiwibmV4dCIsIm1lc3NhZ2UiLCJKU09OIiwicGFyc2UiLCJwYXJzZUludCIsImlkIiwicmVzdWx0IiwidGVybWluYXRlIiwic3RhdHVzIiwiX2NhbGwiLCJibG9jayIsImhlaWdodCIsImJsb2NrUmVzdWx0cyIsInR4IiwiaGFzaCIsInByb3ZlIiwidG9TdHJpbmciLCJhYmNpUXVlcnkiLCJkYXRhIiwicGFyYW1zIiwiYnJvYWRjYXN0VHhDb21taXQiLCJicm9hZGNhc3RUeFN5bmMiLCJzdWJzY3JpYmVUb05ld0Jsb2NrSGVhZGVyRXZlbnQiLCJzZW5kIiwic3RyaW5naWZ5IiwianNvbnJwYyIsIm1ldGhvZCIsInN1YnNjcmliZVRvTmV3QmxvY2tFdmVudCIsInN1YnNjcmliZVRvVHhFdmVudCIsImNsb3NlIiwid3NPcHRzIiwiUHJvbWlzZSIsInJlc29sdmUiLCJyZWplY3QiLCJFcnJvciJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7O0FBcUJBOztBQUVB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YykgMjAxOCwgMjAxOSBOYXRpb25hbCBEaWdpdGFsIElEIENPTVBBTlkgTElNSVRFRFxuICpcbiAqIFRoaXMgZmlsZSBpcyBwYXJ0IG9mIE5ESUQgc29mdHdhcmUuXG4gKlxuICogTkRJRCBpcyB0aGUgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeSBpdCB1bmRlclxuICogdGhlIHRlcm1zIG9mIHRoZSBBZmZlcm8gR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5IHRoZVxuICogRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uLCBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvciBhbnkgbGF0ZXJcbiAqIHZlcnNpb24uXG4gKlxuICogTkRJRCBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS5cbiAqIFNlZSB0aGUgQWZmZXJvIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgQWZmZXJvIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlXG4gKiBhbG9uZyB3aXRoIHRoZSBORElEIHNvdXJjZSBjb2RlLiBJZiBub3QsIHNlZSBodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzL2FncGwudHh0LlxuICpcbiAqIFBsZWFzZSBjb250YWN0IGluZm9AbmRpZC5jby50aCBmb3IgYW55IGZ1cnRoZXIgcXVlc3Rpb25zXG4gKlxuICovXG5pbXBvcnQgRXZlbnRFbWl0dGVyIGZyb20gJ2V2ZW50cyc7XG5cbmltcG9ydCBXZWJTb2NrZXQgZnJvbSAnd3MnO1xuaW1wb3J0IHsgRXhwb25lbnRpYWxCYWNrb2ZmIH0gZnJvbSAnc2ltcGxlLWJhY2tvZmYnO1xuXG5sZXQgdGVuZGVybWludEFkZHJlc3MgPVxuICBwcm9jZXNzLmVudi5URU5ERVJNSU5UX0FERFJFU1MgfHwgJzIwNy40Ni4yMzcuNDQ6MjYwMDAnO1xuLy8gaW1wb3J0IHsgdGVuZGVybWludEFkZHJlc3MgfSBmcm9tICcuLi9jb25maWcnO1xuLy8gaW1wb3J0IEN1c3RvbUVycm9yIGZyb20gJ25kaWQtZXJyb3IvY3VzdG9tX2Vycm9yJztcblxuLy8gY29uc3QgUElOR19JTlRFUlZBTCA9IDMwMDAwO1xuY29uc3QgUElOR19USU1FT1VUX01TID0gNjAwMDA7XG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFRlbmRlcm1pbnRXc0NsaWVudCBleHRlbmRzIEV2ZW50RW1pdHRlciB7XG4gIGNvbnN0cnVjdG9yKG5hbWUgPSAnJywgY29ubmVjdCkge1xuICAgIHN1cGVyKCk7XG4gICAgdGhpcy5uYW1lID0gbmFtZTtcbiAgICB0aGlzLmNvbm5lY3RlZCA9IGZhbHNlO1xuICAgIC8vIHRoaXMuaXNBbGl2ZSA9IGZhbHNlO1xuICAgIHRoaXMucmVjb25uZWN0ID0gdHJ1ZTtcbiAgICB0aGlzLnJwY0lkID0gMDtcbiAgICB0aGlzLnF1ZXVlID0gW107XG4gICAgdGhpcy5iYWNrb2ZmID0gbmV3IEV4cG9uZW50aWFsQmFja29mZih7XG4gICAgICBtaW46IDEwMDAsXG4gICAgICBtYXg6IDE1MDAwLFxuICAgICAgZmFjdG9yOiAyLFxuICAgICAgaml0dGVyOiAwLFxuICAgIH0pO1xuICAgIGlmIChjb25uZWN0KSB7XG4gICAgICB0aGlzLmNvbm5lY3QoKTtcbiAgICB9XG4gIH1cblxuICBjb25uZWN0KCkge1xuICAgIGNvbnNvbGUubG9nKCdUZW5kZXJtaW50IFdTIGNvbm5lY3RpbmcgOiAnLCB0aGlzLm5hbWUpO1xuICAgIC8vIGxvZ2dlci5pbmZvKHtcbiAgICAvLyAgIG1lc3NhZ2U6ICdUZW5kZXJtaW50IFdTIGNvbm5lY3RpbmcnLFxuICAgIC8vICAgbmFtZTogdGhpcy5uYW1lLFxuICAgIC8vIH0pO1xuICAgIHRoaXMud3MgPSBuZXcgV2ViU29ja2V0KGB3czovLyR7dGVuZGVybWludEFkZHJlc3N9L3dlYnNvY2tldGApO1xuICAgIHRoaXMud3Mub24oJ29wZW4nLCAoKSA9PiB7XG4gICAgICBjb25zb2xlLmxvZygnVGVuZGVybWludCBXUyBjb25uZWN0ZWQgOiAnLCB0aGlzLm5hbWUpO1xuICAgICAgLy8gbG9nZ2VyLmluZm8oe1xuICAgICAgLy8gICBtZXNzYWdlOiAnVGVuZGVybWludCBXUyBjb25uZWN0ZWQnLFxuICAgICAgLy8gICBuYW1lOiB0aGlzLm5hbWUsXG4gICAgICAvLyB9KTtcbiAgICAgIC8vIFJlc2V0IGJhY2tvZmYgaW50ZXJ2YWxcbiAgICAgIHRoaXMuYmFja29mZi5yZXNldCgpO1xuICAgICAgdGhpcy5yZWNvbm5lY3RUaW1lb3V0Rm4gPSBudWxsO1xuXG4gICAgICB0aGlzLmNvbm5lY3RlZCA9IHRydWU7XG5cbiAgICAgIHRoaXMuZW1pdCgnY29ubmVjdGVkJyk7XG5cbiAgICAgIHRoaXMucGluZ1RpbWVvdXRGbiA9IHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICB0aGlzLnBpbmdUaW1lb3V0KCk7XG4gICAgICB9LCBQSU5HX1RJTUVPVVRfTVMpO1xuICAgIH0pO1xuXG4gICAgdGhpcy53cy5vbignY2xvc2UnLCAoY29kZSwgcmVhc29uKSA9PiB7XG4gICAgICBpZiAodGhpcy5jb25uZWN0ZWQgPT09IHRydWUpIHtcbiAgICAgICAgY29uc29sZS5sb2coJ1RlbmRlcm1pbnQgV1MgZGlzY29ubmVjdGVkICcsIHRoaXMubmFtZSwgY29kZSwgcmVhc29uKTtcbiAgICAgICAgLy8gbG9nZ2VyLmluZm8oe1xuICAgICAgICAvLyAgIG1lc3NhZ2U6ICdUZW5kZXJtaW50IFdTIGRpc2Nvbm5lY3RlZCcsXG4gICAgICAgIC8vICAgbmFtZTogdGhpcy5uYW1lLFxuICAgICAgICAvLyAgIGNvZGUsXG4gICAgICAgIC8vICAgcmVhc29uLFxuICAgICAgICAvLyB9KTtcblxuICAgICAgICAvLyBSZWplY3QgYWxsIGBfY2FsbGAgcHJvbWlzZXNcbiAgICAgICAgZm9yIChsZXQgcnBjSWQgaW4gdGhpcy5xdWV1ZSkge1xuICAgICAgICAgIGNvbnNvbGUubG9nKCdDb25uZWN0aW9uIGNsb3NlZDogJywgcnBjSWQpO1xuICAgICAgICAgIC8vIGNvbnN0IGVycm9yID0gbmV3IEN1c3RvbUVycm9yKHtcbiAgICAgICAgICAvLyAgIG1lc3NhZ2U6ICdDb25uZWN0aW9uIGNsb3NlZCcsXG4gICAgICAgICAgLy8gICBkZXRhaWxzOiB7XG4gICAgICAgICAgLy8gICAgIHJwY0lkLFxuICAgICAgICAgIC8vICAgfSxcbiAgICAgICAgICAvLyB9KTtcbiAgICAgICAgICB0aGlzLnF1ZXVlW3JwY0lkXS5wcm9taXNlWzFdKGVycm9yKTtcbiAgICAgICAgICBkZWxldGUgdGhpcy5xdWV1ZVtycGNJZF07XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLmVtaXQoJ2Rpc2Nvbm5lY3RlZCcpO1xuICAgICAgfVxuXG4gICAgICB0aGlzLmNvbm5lY3RlZCA9IGZhbHNlO1xuICAgICAgLy8gdGhpcy5pc0FsaXZlID0gZmFsc2U7XG4gICAgICAvLyBjbGVhckludGVydmFsKHRoaXMucGluZ0ludGVydmFsRm4pO1xuICAgICAgLy8gdGhpcy5waW5nSW50ZXJ2YWxGbiA9IG51bGw7XG4gICAgICBjbGVhclRpbWVvdXQodGhpcy5waW5nVGltZW91dEZuKTtcbiAgICAgIHRoaXMucGluZ1RpbWVvdXRGbiA9IG51bGw7XG5cbiAgICAgIGlmICh0aGlzLnJlY29ubmVjdCkge1xuICAgICAgICAvLyBUcnkgcmVjb25uZWN0XG4gICAgICAgIGNvbnN0IGJhY2tvZmZUaW1lID0gdGhpcy5iYWNrb2ZmLm5leHQoKTtcbiAgICAgICAgY29uc29sZS5sb2coYFRlbmRlcm1pbnQgV1MgdHJ5IHJlY29ubmVjdCBpbiAke2JhY2tvZmZUaW1lfSBtc2ApO1xuICAgICAgICAvLyBsb2dnZXIuZGVidWcoe1xuICAgICAgICAvLyAgIG1lc3NhZ2U6IGBUZW5kZXJtaW50IFdTIHRyeSByZWNvbm5lY3QgaW4gJHtiYWNrb2ZmVGltZX0gbXNgLFxuICAgICAgICAvLyAgIG5hbWU6IHRoaXMubmFtZSxcbiAgICAgICAgLy8gfSk7XG4gICAgICAgIHRoaXMucmVjb25uZWN0VGltZW91dEZuID0gc2V0VGltZW91dCgoKSA9PiB0aGlzLmNvbm5lY3QoKSwgYmFja29mZlRpbWUpO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgdGhpcy53cy5vbignZXJyb3InLCBlcnJvciA9PiB7XG4gICAgICBjb25zb2xlLmxvZygnVGVuZGVybWludCBXUyBlcnJvcjogJywgdGhpcy5uYW1lLCBlcnJvcik7XG4gICAgICAvLyBsb2dnZXIuZXJyb3Ioe1xuICAgICAgLy8gICBtZXNzYWdlOiAnVGVuZGVybWludCBXUyBlcnJvcicsXG4gICAgICAvLyAgIG5hbWU6IHRoaXMubmFtZSxcbiAgICAgIC8vICAgZXJyb3IsXG4gICAgICAvLyB9KTtcbiAgICAgIC8vIHRoaXMuZW1pdCgnZXJyb3InLCBlcnJvcik7XG4gICAgfSk7XG5cbiAgICB0aGlzLndzLm9uKCdtZXNzYWdlJywgbWVzc2FnZSA9PiB7XG4gICAgICAvLyBsb2dnZXIuZGVidWcoe1xuICAgICAgLy8gICBtZXNzYWdlOiAnRGF0YSByZWNlaXZlZCBmcm9tIHRlbmRlcm1pbnQgV1MnLFxuICAgICAgLy8gICBuYW1lOiB0aGlzLm5hbWUsXG4gICAgICAvLyAgIGRhdGE6IG1lc3NhZ2UsXG4gICAgICAvLyB9KTtcbiAgICAgIHRyeSB7XG4gICAgICAgIG1lc3NhZ2UgPSBKU09OLnBhcnNlKG1lc3NhZ2UpO1xuICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgY29uc29sZS5sb2coXG4gICAgICAgICAgJ0Vycm9yIEpTT04gcGFyc2luZyBtZXNzYWdlIHJlY2VpdmVkIGZyb20gdGVuZGVybWludDogJyxcbiAgICAgICAgICB0aGlzLm5hbWUsXG4gICAgICAgICAgbWVzc2FnZVxuICAgICAgICApO1xuICAgICAgICAvLyBsb2dnZXIud2Fybih7XG4gICAgICAgIC8vICAgbWVzc2FnZTogJ0Vycm9yIEpTT04gcGFyc2luZyBtZXNzYWdlIHJlY2VpdmVkIGZyb20gdGVuZGVybWludCcsXG4gICAgICAgIC8vICAgbmFtZTogdGhpcy5uYW1lLFxuICAgICAgICAvLyAgIGRhdGE6IG1lc3NhZ2UsXG4gICAgICAgIC8vICAgZXJyb3IsXG4gICAgICAgIC8vIH0pO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IHJwY0lkID0gcGFyc2VJbnQobWVzc2FnZS5pZCk7XG4gICAgICBpZiAodGhpcy5xdWV1ZVtycGNJZF0pIHtcbiAgICAgICAgaWYgKG1lc3NhZ2UuZXJyb3IpIHtcbiAgICAgICAgICBjb25zb2xlLmxvZygnSlNPTi1SUEMgRVJST1I6ICcsIG1lc3NhZ2UuZXJyb3IsIHJwY0lkKTtcbiAgICAgICAgICAvLyBjb25zdCBlcnJvciA9IG5ldyBDdXN0b21FcnJvcih7XG4gICAgICAgICAgLy8gICBtZXNzYWdlOiAnSlNPTi1SUEMgRVJST1InLFxuICAgICAgICAgIC8vICAgZGV0YWlsczoge1xuICAgICAgICAgIC8vICAgICBlcnJvcjogbWVzc2FnZS5lcnJvcixcbiAgICAgICAgICAvLyAgICAgcnBjSWQsXG4gICAgICAgICAgLy8gICB9LFxuICAgICAgICAgIC8vIH0pO1xuICAgICAgICAgIHRoaXMucXVldWVbcnBjSWRdLnByb21pc2VbMV0oZXJyb3IpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHRoaXMucXVldWVbcnBjSWRdLnByb21pc2VbMF0obWVzc2FnZS5yZXN1bHQpO1xuICAgICAgICB9XG5cbiAgICAgICAgZGVsZXRlIHRoaXMucXVldWVbcnBjSWRdO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIHRoaXMuZW1pdChtZXNzYWdlLmlkLCBtZXNzYWdlLmVycm9yLCBtZXNzYWdlLnJlc3VsdCk7XG4gICAgfSk7XG5cbiAgICAvLyB0aGlzLndzLm9uKCdwb25nJywgKCkgPT4ge1xuICAgIC8vICAgdGhpcy5pc0FsaXZlID0gdHJ1ZTtcbiAgICAvLyB9KTtcblxuICAgIHRoaXMud3Mub24oJ3BpbmcnLCAoKSA9PiB7XG4gICAgICAvLyBjb25zb2xlLmxvZygnPj4+UkVDRUlWRUQgUElORzw8PCcsIERhdGUubm93KCkpXG4gICAgICBjbGVhclRpbWVvdXQodGhpcy5waW5nVGltZW91dEZuKTtcbiAgICAgIHRoaXMucGluZ1RpbWVvdXRGbiA9IHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICB0aGlzLnBpbmdUaW1lb3V0KCk7XG4gICAgICB9LCBQSU5HX1RJTUVPVVRfTVMpO1xuICAgIH0pO1xuICB9XG5cbiAgcGluZ1RpbWVvdXQoKSB7XG4gICAgY29uc29sZS5sb2coXG4gICAgICAnVGVuZGVybWludCBXUyBwaW5nIHRpbWVkIG91dCAoZGlkIG5vdCByZWNlaXZlIHBpbmcgZnJvbSBzZXJ2ZXIpLiBUZXJtaW5hdGluZyBjb25lbmN0aW9uLicsXG4gICAgICB0aGlzLm5hbWVcbiAgICApO1xuICAgIC8vIGxvZ2dlci5kZWJ1Zyh7XG4gICAgLy8gICBtZXNzYWdlOlxuICAgIC8vICAgICAnVGVuZGVybWludCBXUyBwaW5nIHRpbWVkIG91dCAoZGlkIG5vdCByZWNlaXZlIHBpbmcgZnJvbSBzZXJ2ZXIpLiBUZXJtaW5hdGluZyBjb25lbmN0aW9uLicsXG4gICAgLy8gICBuYW1lOiB0aGlzLm5hbWUsXG4gICAgLy8gfSk7XG4gICAgdGhpcy53cy50ZXJtaW5hdGUoKTtcbiAgfVxuXG4gIC8qKlxuICAgKlxuICAgKiBAcmV0dXJucyB7UHJvbWlzZTxPYmplY3Q+fVxuICAgKi9cbiAgc3RhdHVzKCkge1xuICAgIHJldHVybiB0aGlzLl9jYWxsKCdzdGF0dXMnLCBbXSk7XG4gIH1cblxuICAvKipcbiAgICpcbiAgICogQHBhcmFtIHtudW1iZXJ9IGhlaWdodCBCbG9jayBoZWlnaHQgdG8gcXVlcnlcbiAgICogQHJldHVybnMge1Byb21pc2U8T2JqZWN0Pn1cbiAgICovXG4gIGJsb2NrKGhlaWdodCkge1xuICAgIHJldHVybiB0aGlzLl9jYWxsKCdibG9jaycsIFtgJHtoZWlnaHR9YF0pO1xuICB9XG5cbiAgYmxvY2tSZXN1bHRzKGhlaWdodCkge1xuICAgIHJldHVybiB0aGlzLl9jYWxsKCdibG9ja19yZXN1bHRzJywgW2Ake2hlaWdodH1gXSk7XG4gIH1cblxuICB0eChoYXNoLCBwcm92ZSkge1xuICAgIHJldHVybiB0aGlzLl9jYWxsKCd0eCcsIHsgaGFzaDogaGFzaC50b1N0cmluZygnYmFzZTY0JyksIHByb3ZlIH0pO1xuICB9XG5cbiAgYWJjaVF1ZXJ5KGRhdGEsIGhlaWdodCkge1xuICAgIGNvbnN0IHBhcmFtcyA9IHtcbiAgICAgIGRhdGE6IGRhdGEudG9TdHJpbmcoJ2hleCcpLFxuICAgIH07XG4gICAgaWYgKGhlaWdodCkge1xuICAgICAgcGFyYW1zLmhlaWdodCA9IGAke2hlaWdodH1gO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5fY2FsbCgnYWJjaV9xdWVyeScsIHBhcmFtcyk7XG4gIH1cblxuICBicm9hZGNhc3RUeENvbW1pdCh0eCkge1xuICAgIHJldHVybiB0aGlzLl9jYWxsKCdicm9hZGNhc3RfdHhfY29tbWl0JywgeyB0eDogdHgudG9TdHJpbmcoJ2Jhc2U2NCcpIH0pO1xuICB9XG5cbiAgYnJvYWRjYXN0VHhTeW5jKHR4KSB7XG4gICAgcmV0dXJuIHRoaXMuX2NhbGwoJ2Jyb2FkY2FzdF90eF9zeW5jJywgeyB0eDogdHgudG9TdHJpbmcoJ2Jhc2U2NCcpIH0pO1xuICB9XG5cbiAgc3Vic2NyaWJlVG9OZXdCbG9ja0hlYWRlckV2ZW50KCkge1xuICAgIGlmICh0aGlzLmNvbm5lY3RlZCkge1xuICAgICAgdGhpcy53cy5zZW5kKFxuICAgICAgICBKU09OLnN0cmluZ2lmeSh7XG4gICAgICAgICAganNvbnJwYzogJzIuMCcsXG4gICAgICAgICAgbWV0aG9kOiAnc3Vic2NyaWJlJyxcbiAgICAgICAgICBwYXJhbXM6IFtcInRtLmV2ZW50ID0gJ05ld0Jsb2NrSGVhZGVyJ1wiXSxcbiAgICAgICAgICBpZDogJ25ld0Jsb2NrSGVhZGVyJyxcbiAgICAgICAgfSlcbiAgICAgICk7XG4gICAgfVxuICB9XG5cbiAgc3Vic2NyaWJlVG9OZXdCbG9ja0V2ZW50KCkge1xuICAgIGlmICh0aGlzLmNvbm5lY3RlZCkge1xuICAgICAgdGhpcy53cy5zZW5kKFxuICAgICAgICBKU09OLnN0cmluZ2lmeSh7XG4gICAgICAgICAganNvbnJwYzogJzIuMCcsXG4gICAgICAgICAgbWV0aG9kOiAnc3Vic2NyaWJlJyxcbiAgICAgICAgICBwYXJhbXM6IFtcInRtLmV2ZW50ID0gJ05ld0Jsb2NrJ1wiXSxcbiAgICAgICAgICBpZDogJ25ld0Jsb2NrJyxcbiAgICAgICAgfSlcbiAgICAgICk7XG4gICAgfVxuICB9XG5cbiAgc3Vic2NyaWJlVG9UeEV2ZW50KCkge1xuICAgIGlmICh0aGlzLmNvbm5lY3RlZCkge1xuICAgICAgdGhpcy53cy5zZW5kKFxuICAgICAgICBKU09OLnN0cmluZ2lmeSh7XG4gICAgICAgICAganNvbnJwYzogJzIuMCcsXG4gICAgICAgICAgbWV0aG9kOiAnc3Vic2NyaWJlJyxcbiAgICAgICAgICBwYXJhbXM6IFtcInRtLmV2ZW50ID0gJ1R4J1wiXSxcbiAgICAgICAgICBpZDogJ3R4JyxcbiAgICAgICAgfSlcbiAgICAgICk7XG4gICAgfVxuICB9XG5cbiAgY2xvc2UoKSB7XG4gICAgaWYgKCF0aGlzLndzKSByZXR1cm47XG4gICAgdGhpcy5yZWNvbm5lY3QgPSBmYWxzZTtcbiAgICBjbGVhclRpbWVvdXQodGhpcy5yZWNvbm5lY3RUaW1lb3V0Rm4pO1xuICAgIHRoaXMucmVjb25uZWN0VGltZW91dEZuID0gbnVsbDtcbiAgICB0aGlzLndzLmNsb3NlKCk7XG4gIH1cblxuICBfY2FsbChtZXRob2QsIHBhcmFtcywgd3NPcHRzKSB7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgIGlmICghdGhpcy5jb25uZWN0ZWQpIHtcbiAgICAgICAgcmV0dXJuIHJlamVjdChuZXcgRXJyb3IoJ3NvY2tldCBpcyBub3QgY29ubmVjdGVkJykpO1xuICAgICAgfVxuXG4gICAgICBjb25zdCBpZCA9ICsrdGhpcy5ycGNJZDtcbiAgICAgIGNvbnN0IG1lc3NhZ2UgPSB7XG4gICAgICAgIGpzb25ycGM6ICcyLjAnLFxuICAgICAgICBtZXRob2Q6IG1ldGhvZCxcbiAgICAgICAgcGFyYW1zOiBwYXJhbXMgfHwgbnVsbCxcbiAgICAgICAgaWQ6IGlkLnRvU3RyaW5nKCksXG4gICAgICB9O1xuICAgICAgY29uc29sZS5sb2coJ0NhbGxpbmcgVGVuZGVybWludCB0aHJvdWdoIFdTOiAnLCB0aGlzLm5hbWUsIG1lc3NhZ2UpO1xuXG4gICAgICAvLyBsb2dnZXIuZGVidWcoe1xuICAgICAgLy8gICBtZXNzYWdlOiAnQ2FsbGluZyBUZW5kZXJtaW50IHRocm91Z2ggV1MnLFxuICAgICAgLy8gICBuYW1lOiB0aGlzLm5hbWUsXG4gICAgICAvLyAgIHBheWxvYWQ6IG1lc3NhZ2UsXG4gICAgICAvLyB9KTtcbiAgICAgIHRoaXMud3Muc2VuZChKU09OLnN0cmluZ2lmeShtZXNzYWdlKSwgd3NPcHRzLCBlcnJvciA9PiB7XG4gICAgICAgIGlmIChlcnJvcikge1xuICAgICAgICAgIHJldHVybiByZWplY3QoJ1RlbmRlcm1pbnQgV1Mgc2VuZCBlcnJvcicpO1xuICAgICAgICAgIC8vIHJldHVybiByZWplY3QoXG4gICAgICAgICAgLy8gICBuZXcgQ3VzdG9tRXJyb3Ioe1xuICAgICAgICAgIC8vICAgICBtZXNzYWdlOiAnVGVuZGVybWludCBXUyBzZW5kIGVycm9yJyxcbiAgICAgICAgICAvLyAgICAgZGV0YWlsczoge1xuICAgICAgICAgIC8vICAgICAgIGVycm9yLFxuICAgICAgICAgIC8vICAgICAgIHJwY0lkOiBpZCxcbiAgICAgICAgICAvLyAgICAgfSxcbiAgICAgICAgICAvLyAgIH0pXG4gICAgICAgICAgLy8gKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMucXVldWVbaWRdID0geyBwcm9taXNlOiBbcmVzb2x2ZSwgcmVqZWN0XSB9O1xuICAgICAgfSk7XG4gICAgfSk7XG4gIH1cbn1cbiJdfQ==