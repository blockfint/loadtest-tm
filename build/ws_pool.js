"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.initialize = initialize;
exports.connect = connect;
exports.getConnection = getConnection;
exports.closeAllConnections = closeAllConnections;

var _ws_client = _interopRequireDefault(require("./ws_client"));

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
// import logger from '../logger';
let tendermintWsConnections = 10; // import logger from '../logger';
// import CustomError from 'ndid-error/custom_error';
// import * as config from '../config';

/**
 * @type {Array.<TendermintWsClient>}
 */

const wsClients = [];
let wsClientIndex = 0;

function connectWS(wsClient) {
  return new Promise(resolve => {
    wsClient.once('connected', () => resolve());
    wsClient.connect();
  });
}

async function initialize(connect = true) {
  const promises = [];

  for (let i = 0; i < tendermintWsConnections; i++) {
    const tendermintWsClient = new _ws_client.default(`ws_pool_${i}`, false);
    wsClients.push(tendermintWsClient);

    if (connect) {
      promises.push(connectWS(tendermintWsClient));
    }
  }

  if (connect) {
    await Promise.all(promises);
  }
}

async function connect() {
  const promises = [];

  for (let i = 0; i < wsClients.length; i++) {
    promises.push(connectWS(wsClients[i]));
  }

  await Promise.all(promises);
}

function getNextConnectedConnectionClientIndex(curentIndex) {
  for (let i = curentIndex; i < wsClients.length; i++) {
    if (wsClients[i].connected) {
      return i;
    }
  }

  if (curentIndex !== 0) {
    for (let i = 0; i < curentIndex; i++) {
      if (wsClients[i].connected) {
        return i;
      }
    }
  }

  return null;
} // Round-robin


function getConnection() {
  wsClientIndex++;

  if (wsClientIndex >= wsClients.length) {
    wsClientIndex = 0;
  }

  if (!wsClients[wsClientIndex].connected) {
    const nextConnectedConnectionClientIndex = getNextConnectedConnectionClientIndex(wsClientIndex);

    if (nextConnectedConnectionClientIndex == null) {
      throw 'No connected WS available'; // throw new CustomError({
      //   message: 'No connected WS available',
      // });
    }
  }

  return wsClients[wsClientIndex];
}

function closeAllConnections() {
  for (let i = 0; i < wsClients.length; i++) {
    wsClients[i].close();
  }
}
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy93c19wb29sLmpzIl0sIm5hbWVzIjpbInRlbmRlcm1pbnRXc0Nvbm5lY3Rpb25zIiwid3NDbGllbnRzIiwid3NDbGllbnRJbmRleCIsImNvbm5lY3RXUyIsIndzQ2xpZW50IiwiUHJvbWlzZSIsInJlc29sdmUiLCJvbmNlIiwiY29ubmVjdCIsImluaXRpYWxpemUiLCJwcm9taXNlcyIsImkiLCJ0ZW5kZXJtaW50V3NDbGllbnQiLCJUZW5kZXJtaW50V3NDbGllbnQiLCJwdXNoIiwiYWxsIiwibGVuZ3RoIiwiZ2V0TmV4dENvbm5lY3RlZENvbm5lY3Rpb25DbGllbnRJbmRleCIsImN1cmVudEluZGV4IiwiY29ubmVjdGVkIiwiZ2V0Q29ubmVjdGlvbiIsIm5leHRDb25uZWN0ZWRDb25uZWN0aW9uQ2xpZW50SW5kZXgiLCJjbG9zZUFsbENvbm5lY3Rpb25zIiwiY2xvc2UiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7OztBQXFCQTs7QUFyQkE7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQXVCQTtBQUVBLElBQUlBLHVCQUF1QixHQUFHLEVBQTlCLEMsQ0FFQTtBQUVBO0FBRUE7O0FBRUE7Ozs7QUFHQSxNQUFNQyxTQUFTLEdBQUcsRUFBbEI7QUFFQSxJQUFJQyxhQUFhLEdBQUcsQ0FBcEI7O0FBRUEsU0FBU0MsU0FBVCxDQUFtQkMsUUFBbkIsRUFBNkI7QUFDM0IsU0FBTyxJQUFJQyxPQUFKLENBQVlDLE9BQU8sSUFBSTtBQUM1QkYsSUFBQUEsUUFBUSxDQUFDRyxJQUFULENBQWMsV0FBZCxFQUEyQixNQUFNRCxPQUFPLEVBQXhDO0FBQ0FGLElBQUFBLFFBQVEsQ0FBQ0ksT0FBVDtBQUNELEdBSE0sQ0FBUDtBQUlEOztBQUVNLGVBQWVDLFVBQWYsQ0FBMEJELE9BQU8sR0FBRyxJQUFwQyxFQUEwQztBQUMvQyxRQUFNRSxRQUFRLEdBQUcsRUFBakI7O0FBQ0EsT0FBSyxJQUFJQyxDQUFDLEdBQUcsQ0FBYixFQUFnQkEsQ0FBQyxHQUFHWCx1QkFBcEIsRUFBNkNXLENBQUMsRUFBOUMsRUFBa0Q7QUFDaEQsVUFBTUMsa0JBQWtCLEdBQUcsSUFBSUMsa0JBQUosQ0FBd0IsV0FBVUYsQ0FBRSxFQUFwQyxFQUF1QyxLQUF2QyxDQUEzQjtBQUNBVixJQUFBQSxTQUFTLENBQUNhLElBQVYsQ0FBZUYsa0JBQWY7O0FBQ0EsUUFBSUosT0FBSixFQUFhO0FBQ1hFLE1BQUFBLFFBQVEsQ0FBQ0ksSUFBVCxDQUFjWCxTQUFTLENBQUNTLGtCQUFELENBQXZCO0FBQ0Q7QUFDRjs7QUFDRCxNQUFJSixPQUFKLEVBQWE7QUFDWCxVQUFNSCxPQUFPLENBQUNVLEdBQVIsQ0FBWUwsUUFBWixDQUFOO0FBQ0Q7QUFDRjs7QUFFTSxlQUFlRixPQUFmLEdBQXlCO0FBQzlCLFFBQU1FLFFBQVEsR0FBRyxFQUFqQjs7QUFDQSxPQUFLLElBQUlDLENBQUMsR0FBRyxDQUFiLEVBQWdCQSxDQUFDLEdBQUdWLFNBQVMsQ0FBQ2UsTUFBOUIsRUFBc0NMLENBQUMsRUFBdkMsRUFBMkM7QUFDekNELElBQUFBLFFBQVEsQ0FBQ0ksSUFBVCxDQUFjWCxTQUFTLENBQUNGLFNBQVMsQ0FBQ1UsQ0FBRCxDQUFWLENBQXZCO0FBQ0Q7O0FBQ0QsUUFBTU4sT0FBTyxDQUFDVSxHQUFSLENBQVlMLFFBQVosQ0FBTjtBQUNEOztBQUVELFNBQVNPLHFDQUFULENBQStDQyxXQUEvQyxFQUE0RDtBQUMxRCxPQUFLLElBQUlQLENBQUMsR0FBR08sV0FBYixFQUEwQlAsQ0FBQyxHQUFHVixTQUFTLENBQUNlLE1BQXhDLEVBQWdETCxDQUFDLEVBQWpELEVBQXFEO0FBQ25ELFFBQUlWLFNBQVMsQ0FBQ1UsQ0FBRCxDQUFULENBQWFRLFNBQWpCLEVBQTRCO0FBQzFCLGFBQU9SLENBQVA7QUFDRDtBQUNGOztBQUNELE1BQUlPLFdBQVcsS0FBSyxDQUFwQixFQUF1QjtBQUNyQixTQUFLLElBQUlQLENBQUMsR0FBRyxDQUFiLEVBQWdCQSxDQUFDLEdBQUdPLFdBQXBCLEVBQWlDUCxDQUFDLEVBQWxDLEVBQXNDO0FBQ3BDLFVBQUlWLFNBQVMsQ0FBQ1UsQ0FBRCxDQUFULENBQWFRLFNBQWpCLEVBQTRCO0FBQzFCLGVBQU9SLENBQVA7QUFDRDtBQUNGO0FBQ0Y7O0FBQ0QsU0FBTyxJQUFQO0FBQ0QsQyxDQUVEOzs7QUFDTyxTQUFTUyxhQUFULEdBQXlCO0FBQzlCbEIsRUFBQUEsYUFBYTs7QUFDYixNQUFJQSxhQUFhLElBQUlELFNBQVMsQ0FBQ2UsTUFBL0IsRUFBdUM7QUFDckNkLElBQUFBLGFBQWEsR0FBRyxDQUFoQjtBQUNEOztBQUNELE1BQUksQ0FBQ0QsU0FBUyxDQUFDQyxhQUFELENBQVQsQ0FBeUJpQixTQUE5QixFQUF5QztBQUN2QyxVQUFNRSxrQ0FBa0MsR0FBR0oscUNBQXFDLENBQzlFZixhQUQ4RSxDQUFoRjs7QUFHQSxRQUFJbUIsa0NBQWtDLElBQUksSUFBMUMsRUFBZ0Q7QUFDOUMsWUFBTSwyQkFBTixDQUQ4QyxDQUU5QztBQUNBO0FBQ0E7QUFDRDtBQUNGOztBQUNELFNBQU9wQixTQUFTLENBQUNDLGFBQUQsQ0FBaEI7QUFDRDs7QUFFTSxTQUFTb0IsbUJBQVQsR0FBK0I7QUFDcEMsT0FBSyxJQUFJWCxDQUFDLEdBQUcsQ0FBYixFQUFnQkEsQ0FBQyxHQUFHVixTQUFTLENBQUNlLE1BQTlCLEVBQXNDTCxDQUFDLEVBQXZDLEVBQTJDO0FBQ3pDVixJQUFBQSxTQUFTLENBQUNVLENBQUQsQ0FBVCxDQUFhWSxLQUFiO0FBQ0Q7QUFDRiIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQ29weXJpZ2h0IChjKSAyMDE4LCAyMDE5IE5hdGlvbmFsIERpZ2l0YWwgSUQgQ09NUEFOWSBMSU1JVEVEXG4gKlxuICogVGhpcyBmaWxlIGlzIHBhcnQgb2YgTkRJRCBzb2Z0d2FyZS5cbiAqXG4gKiBORElEIGlzIHRoZSBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5IGl0IHVuZGVyXG4gKiB0aGUgdGVybXMgb2YgdGhlIEFmZmVybyBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnkgdGhlXG4gKiBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb24sIGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlIExpY2Vuc2UsIG9yIGFueSBsYXRlclxuICogdmVyc2lvbi5cbiAqXG4gKiBORElEIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLlxuICogU2VlIHRoZSBBZmZlcm8gR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBBZmZlcm8gR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2VcbiAqIGFsb25nIHdpdGggdGhlIE5ESUQgc291cmNlIGNvZGUuIElmIG5vdCwgc2VlIGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvYWdwbC50eHQuXG4gKlxuICogUGxlYXNlIGNvbnRhY3QgaW5mb0BuZGlkLmNvLnRoIGZvciBhbnkgZnVydGhlciBxdWVzdGlvbnNcbiAqXG4gKi9cbmltcG9ydCBUZW5kZXJtaW50V3NDbGllbnQgZnJvbSAnLi93c19jbGllbnQnO1xuXG4vLyBpbXBvcnQgbG9nZ2VyIGZyb20gJy4uL2xvZ2dlcic7XG5cbmxldCB0ZW5kZXJtaW50V3NDb25uZWN0aW9ucyA9IDEwO1xuXG4vLyBpbXBvcnQgbG9nZ2VyIGZyb20gJy4uL2xvZ2dlcic7XG5cbi8vIGltcG9ydCBDdXN0b21FcnJvciBmcm9tICduZGlkLWVycm9yL2N1c3RvbV9lcnJvcic7XG5cbi8vIGltcG9ydCAqIGFzIGNvbmZpZyBmcm9tICcuLi9jb25maWcnO1xuXG4vKipcbiAqIEB0eXBlIHtBcnJheS48VGVuZGVybWludFdzQ2xpZW50Pn1cbiAqL1xuY29uc3Qgd3NDbGllbnRzID0gW107XG5cbmxldCB3c0NsaWVudEluZGV4ID0gMDtcblxuZnVuY3Rpb24gY29ubmVjdFdTKHdzQ2xpZW50KSB7XG4gIHJldHVybiBuZXcgUHJvbWlzZShyZXNvbHZlID0+IHtcbiAgICB3c0NsaWVudC5vbmNlKCdjb25uZWN0ZWQnLCAoKSA9PiByZXNvbHZlKCkpO1xuICAgIHdzQ2xpZW50LmNvbm5lY3QoKTtcbiAgfSk7XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBpbml0aWFsaXplKGNvbm5lY3QgPSB0cnVlKSB7XG4gIGNvbnN0IHByb21pc2VzID0gW107XG4gIGZvciAobGV0IGkgPSAwOyBpIDwgdGVuZGVybWludFdzQ29ubmVjdGlvbnM7IGkrKykge1xuICAgIGNvbnN0IHRlbmRlcm1pbnRXc0NsaWVudCA9IG5ldyBUZW5kZXJtaW50V3NDbGllbnQoYHdzX3Bvb2xfJHtpfWAsIGZhbHNlKTtcbiAgICB3c0NsaWVudHMucHVzaCh0ZW5kZXJtaW50V3NDbGllbnQpO1xuICAgIGlmIChjb25uZWN0KSB7XG4gICAgICBwcm9taXNlcy5wdXNoKGNvbm5lY3RXUyh0ZW5kZXJtaW50V3NDbGllbnQpKTtcbiAgICB9XG4gIH1cbiAgaWYgKGNvbm5lY3QpIHtcbiAgICBhd2FpdCBQcm9taXNlLmFsbChwcm9taXNlcyk7XG4gIH1cbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGNvbm5lY3QoKSB7XG4gIGNvbnN0IHByb21pc2VzID0gW107XG4gIGZvciAobGV0IGkgPSAwOyBpIDwgd3NDbGllbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgcHJvbWlzZXMucHVzaChjb25uZWN0V1Mod3NDbGllbnRzW2ldKSk7XG4gIH1cbiAgYXdhaXQgUHJvbWlzZS5hbGwocHJvbWlzZXMpO1xufVxuXG5mdW5jdGlvbiBnZXROZXh0Q29ubmVjdGVkQ29ubmVjdGlvbkNsaWVudEluZGV4KGN1cmVudEluZGV4KSB7XG4gIGZvciAobGV0IGkgPSBjdXJlbnRJbmRleDsgaSA8IHdzQ2xpZW50cy5sZW5ndGg7IGkrKykge1xuICAgIGlmICh3c0NsaWVudHNbaV0uY29ubmVjdGVkKSB7XG4gICAgICByZXR1cm4gaTtcbiAgICB9XG4gIH1cbiAgaWYgKGN1cmVudEluZGV4ICE9PSAwKSB7XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBjdXJlbnRJbmRleDsgaSsrKSB7XG4gICAgICBpZiAod3NDbGllbnRzW2ldLmNvbm5lY3RlZCkge1xuICAgICAgICByZXR1cm4gaTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgcmV0dXJuIG51bGw7XG59XG5cbi8vIFJvdW5kLXJvYmluXG5leHBvcnQgZnVuY3Rpb24gZ2V0Q29ubmVjdGlvbigpIHtcbiAgd3NDbGllbnRJbmRleCsrO1xuICBpZiAod3NDbGllbnRJbmRleCA+PSB3c0NsaWVudHMubGVuZ3RoKSB7XG4gICAgd3NDbGllbnRJbmRleCA9IDA7XG4gIH1cbiAgaWYgKCF3c0NsaWVudHNbd3NDbGllbnRJbmRleF0uY29ubmVjdGVkKSB7XG4gICAgY29uc3QgbmV4dENvbm5lY3RlZENvbm5lY3Rpb25DbGllbnRJbmRleCA9IGdldE5leHRDb25uZWN0ZWRDb25uZWN0aW9uQ2xpZW50SW5kZXgoXG4gICAgICB3c0NsaWVudEluZGV4XG4gICAgKTtcbiAgICBpZiAobmV4dENvbm5lY3RlZENvbm5lY3Rpb25DbGllbnRJbmRleCA9PSBudWxsKSB7XG4gICAgICB0aHJvdyAnTm8gY29ubmVjdGVkIFdTIGF2YWlsYWJsZSc7XG4gICAgICAvLyB0aHJvdyBuZXcgQ3VzdG9tRXJyb3Ioe1xuICAgICAgLy8gICBtZXNzYWdlOiAnTm8gY29ubmVjdGVkIFdTIGF2YWlsYWJsZScsXG4gICAgICAvLyB9KTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIHdzQ2xpZW50c1t3c0NsaWVudEluZGV4XTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGNsb3NlQWxsQ29ubmVjdGlvbnMoKSB7XG4gIGZvciAobGV0IGkgPSAwOyBpIDwgd3NDbGllbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgd3NDbGllbnRzW2ldLmNsb3NlKCk7XG4gIH1cbn1cbiJdfQ==