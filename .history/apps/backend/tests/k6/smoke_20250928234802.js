import http from 'k6/http';
import { sleep, check } from 'k6';

export const options = {
  vus: 10,
  duration: '30s',
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<500'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'https://vah-api-staging.onrender.com';

export default function () {
  let res = http.get(`${BASE_URL}/api/healthz`);
  check(res, { 'health 200': (r) => r.status === 200 });

  res = http.get(`${BASE_URL}/api/plans`);
  check(res, { 'plans 2xx': (r) => r.status >= 200 && r.status < 300 });

  sleep(1);
}
