import { proxyVoice } from '../../../../../generated/voice-proxy.js';

export const maxDuration = 60;

export default {
  fetch(request: Request): Promise<Response> {
    return proxyVoice(request);
  },
};
