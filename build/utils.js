"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.createSignature = createSignature;
exports.hash = hash;
exports.sha256 = sha256;
exports.cryptoCreateSignature = cryptoCreateSignature;
exports.randomBufferBytes = randomBufferBytes;
exports.getNonce = getNonce;

var _fs = _interopRequireDefault(require("fs"));

var _crypto = _interopRequireDefault(require("crypto"));

var _path = _interopRequireDefault(require("path"));

const privateKey = _fs.default.readFileSync(_path.default.join(__dirname, '..', 'keys', 'rp_1'));

async function createSignature(messageToSign, nodeId, useMasterKey) {
  if (typeof messageToSign !== 'string') {
    throw new CustomError({
      message: 'Expected message to sign to be a string'
    });
  } // const messageToSignHash = hash(messageToSign);
  // if (config.useExternalCryptoService) {
  //   return await externalCryptoService.createSignature(
  //     messageToSign,
  //     messageToSignHash,
  //     nodeId,
  //     useMasterKey
  //   );
  // }


  const key = privateKey;
  return cryptoCreateSignature(messageToSign, {
    key
  });
}

function hash(dataToHash) {
  const hashBuffer = sha256(dataToHash);
  return hashBuffer.toString('base64');
}

function sha256(dataToHash) {
  const hash = _crypto.default.createHash('sha256');

  hash.update(dataToHash);
  const hashBuffer = hash.digest();
  return hashBuffer;
}

function cryptoCreateSignature(message, privateKey) {
  return _crypto.default.createSign('SHA256').update(message).sign(privateKey);
}

function randomBufferBytes(length) {
  return _crypto.default.randomBytes(length);
}

function getNonce() {
  return randomBufferBytes(32);
}
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy91dGlscy5qcyJdLCJuYW1lcyI6WyJwcml2YXRlS2V5IiwiZnMiLCJyZWFkRmlsZVN5bmMiLCJwYXRoIiwiam9pbiIsIl9fZGlybmFtZSIsImNyZWF0ZVNpZ25hdHVyZSIsIm1lc3NhZ2VUb1NpZ24iLCJub2RlSWQiLCJ1c2VNYXN0ZXJLZXkiLCJDdXN0b21FcnJvciIsIm1lc3NhZ2UiLCJrZXkiLCJjcnlwdG9DcmVhdGVTaWduYXR1cmUiLCJoYXNoIiwiZGF0YVRvSGFzaCIsImhhc2hCdWZmZXIiLCJzaGEyNTYiLCJ0b1N0cmluZyIsImNyeXB0byIsImNyZWF0ZUhhc2giLCJ1cGRhdGUiLCJkaWdlc3QiLCJjcmVhdGVTaWduIiwic2lnbiIsInJhbmRvbUJ1ZmZlckJ5dGVzIiwibGVuZ3RoIiwicmFuZG9tQnl0ZXMiLCJnZXROb25jZSJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7QUFBQTs7QUFDQTs7QUFDQTs7QUFFQSxNQUFNQSxVQUFVLEdBQUdDLFlBQUdDLFlBQUgsQ0FBZ0JDLGNBQUtDLElBQUwsQ0FBVUMsU0FBVixFQUFxQixJQUFyQixFQUEyQixNQUEzQixFQUFtQyxNQUFuQyxDQUFoQixDQUFuQjs7QUFFTyxlQUFlQyxlQUFmLENBQStCQyxhQUEvQixFQUE4Q0MsTUFBOUMsRUFBc0RDLFlBQXRELEVBQW9FO0FBQ3pFLE1BQUksT0FBT0YsYUFBUCxLQUF5QixRQUE3QixFQUF1QztBQUNyQyxVQUFNLElBQUlHLFdBQUosQ0FBZ0I7QUFDcEJDLE1BQUFBLE9BQU8sRUFBRTtBQURXLEtBQWhCLENBQU47QUFHRCxHQUx3RSxDQU16RTtBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7OztBQUVBLFFBQU1DLEdBQUcsR0FBR1osVUFBWjtBQUVBLFNBQU9hLHFCQUFxQixDQUFDTixhQUFELEVBQWdCO0FBQzFDSyxJQUFBQTtBQUQwQyxHQUFoQixDQUE1QjtBQUdEOztBQUVNLFNBQVNFLElBQVQsQ0FBY0MsVUFBZCxFQUEwQjtBQUMvQixRQUFNQyxVQUFVLEdBQUdDLE1BQU0sQ0FBQ0YsVUFBRCxDQUF6QjtBQUNBLFNBQU9DLFVBQVUsQ0FBQ0UsUUFBWCxDQUFvQixRQUFwQixDQUFQO0FBQ0Q7O0FBRU0sU0FBU0QsTUFBVCxDQUFnQkYsVUFBaEIsRUFBNEI7QUFDakMsUUFBTUQsSUFBSSxHQUFHSyxnQkFBT0MsVUFBUCxDQUFrQixRQUFsQixDQUFiOztBQUNBTixFQUFBQSxJQUFJLENBQUNPLE1BQUwsQ0FBWU4sVUFBWjtBQUNBLFFBQU1DLFVBQVUsR0FBR0YsSUFBSSxDQUFDUSxNQUFMLEVBQW5CO0FBQ0EsU0FBT04sVUFBUDtBQUNEOztBQUVNLFNBQVNILHFCQUFULENBQStCRixPQUEvQixFQUF3Q1gsVUFBeEMsRUFBb0Q7QUFDekQsU0FBT21CLGdCQUNKSSxVQURJLENBQ08sUUFEUCxFQUVKRixNQUZJLENBRUdWLE9BRkgsRUFHSmEsSUFISSxDQUdDeEIsVUFIRCxDQUFQO0FBSUQ7O0FBRU0sU0FBU3lCLGlCQUFULENBQTJCQyxNQUEzQixFQUFtQztBQUN4QyxTQUFPUCxnQkFBT1EsV0FBUCxDQUFtQkQsTUFBbkIsQ0FBUDtBQUNEOztBQUVNLFNBQVNFLFFBQVQsR0FBb0I7QUFDekIsU0FBT0gsaUJBQWlCLENBQUMsRUFBRCxDQUF4QjtBQUNEIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IGZzIGZyb20gJ2ZzJztcbmltcG9ydCBjcnlwdG8gZnJvbSAnY3J5cHRvJztcbmltcG9ydCBwYXRoIGZyb20gJ3BhdGgnO1xuXG5jb25zdCBwcml2YXRlS2V5ID0gZnMucmVhZEZpbGVTeW5jKHBhdGguam9pbihfX2Rpcm5hbWUsICcuLicsICdrZXlzJywgJ3JwXzEnKSk7XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBjcmVhdGVTaWduYXR1cmUobWVzc2FnZVRvU2lnbiwgbm9kZUlkLCB1c2VNYXN0ZXJLZXkpIHtcbiAgaWYgKHR5cGVvZiBtZXNzYWdlVG9TaWduICE9PSAnc3RyaW5nJykge1xuICAgIHRocm93IG5ldyBDdXN0b21FcnJvcih7XG4gICAgICBtZXNzYWdlOiAnRXhwZWN0ZWQgbWVzc2FnZSB0byBzaWduIHRvIGJlIGEgc3RyaW5nJyxcbiAgICB9KTtcbiAgfVxuICAvLyBjb25zdCBtZXNzYWdlVG9TaWduSGFzaCA9IGhhc2gobWVzc2FnZVRvU2lnbik7XG5cbiAgLy8gaWYgKGNvbmZpZy51c2VFeHRlcm5hbENyeXB0b1NlcnZpY2UpIHtcbiAgLy8gICByZXR1cm4gYXdhaXQgZXh0ZXJuYWxDcnlwdG9TZXJ2aWNlLmNyZWF0ZVNpZ25hdHVyZShcbiAgLy8gICAgIG1lc3NhZ2VUb1NpZ24sXG4gIC8vICAgICBtZXNzYWdlVG9TaWduSGFzaCxcbiAgLy8gICAgIG5vZGVJZCxcbiAgLy8gICAgIHVzZU1hc3RlcktleVxuICAvLyAgICk7XG4gIC8vIH1cblxuICBjb25zdCBrZXkgPSBwcml2YXRlS2V5O1xuXG4gIHJldHVybiBjcnlwdG9DcmVhdGVTaWduYXR1cmUobWVzc2FnZVRvU2lnbiwge1xuICAgIGtleSxcbiAgfSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBoYXNoKGRhdGFUb0hhc2gpIHtcbiAgY29uc3QgaGFzaEJ1ZmZlciA9IHNoYTI1NihkYXRhVG9IYXNoKTtcbiAgcmV0dXJuIGhhc2hCdWZmZXIudG9TdHJpbmcoJ2Jhc2U2NCcpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gc2hhMjU2KGRhdGFUb0hhc2gpIHtcbiAgY29uc3QgaGFzaCA9IGNyeXB0by5jcmVhdGVIYXNoKCdzaGEyNTYnKTtcbiAgaGFzaC51cGRhdGUoZGF0YVRvSGFzaCk7XG4gIGNvbnN0IGhhc2hCdWZmZXIgPSBoYXNoLmRpZ2VzdCgpO1xuICByZXR1cm4gaGFzaEJ1ZmZlcjtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGNyeXB0b0NyZWF0ZVNpZ25hdHVyZShtZXNzYWdlLCBwcml2YXRlS2V5KSB7XG4gIHJldHVybiBjcnlwdG9cbiAgICAuY3JlYXRlU2lnbignU0hBMjU2JylcbiAgICAudXBkYXRlKG1lc3NhZ2UpXG4gICAgLnNpZ24ocHJpdmF0ZUtleSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiByYW5kb21CdWZmZXJCeXRlcyhsZW5ndGgpIHtcbiAgcmV0dXJuIGNyeXB0by5yYW5kb21CeXRlcyhsZW5ndGgpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2V0Tm9uY2UoKSB7XG4gIHJldHVybiByYW5kb21CdWZmZXJCeXRlcygzMik7XG59XG4iXX0=