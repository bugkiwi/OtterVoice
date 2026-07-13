import { proxyOpenRouter } from '../../../openrouter-proxy.js';

export const maxDuration = 60;

export default {
  fetch(request: Request): Promise<Response> {
    return proxyOpenRouter(request);
  },
};
