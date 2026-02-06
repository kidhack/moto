import { Actor } from '@dfinity/agent';
import { idlFactory } from './moto.did.js';

export { idlFactory };

/**
 * @param {string} canisterId
 * @param {{ agent: import('@dfinity/agent').HttpAgent }} options
 */
export const createActor = (canisterId, options) => {
  const { agent } = options || {};
  if (!agent) {
    throw new Error('createActor: options.agent is required');
  }
  return Actor.createActor(idlFactory, {
    agent,
    canisterId,
  });
};
