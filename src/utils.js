import fs from 'fs';
import crypto from 'crypto';
import path from 'path';

const privateKey = fs.readFileSync(path.join(__dirname, '..', 'keys', 'rp_1'));

export async function createSignature(messageToSign, nodeId, useMasterKey) {
  if (typeof messageToSign !== 'string') {
    throw new CustomError({
      message: 'Expected message to sign to be a string',
    });
  }
  // const messageToSignHash = hash(messageToSign);

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
    key,
  });
}

export function hash(dataToHash) {
  const hashBuffer = sha256(dataToHash);
  return hashBuffer.toString('base64');
}

export function sha256(dataToHash) {
  const hash = crypto.createHash('sha256');
  hash.update(dataToHash);
  const hashBuffer = hash.digest();
  return hashBuffer;
}

export function cryptoCreateSignature(message, privateKey) {
  return crypto
    .createSign('SHA256')
    .update(message)
    .sign(privateKey);
}

export function randomBufferBytes(length) {
  return crypto.randomBytes(length);
}

export function getNonce() {
  return randomBufferBytes(32);
}
