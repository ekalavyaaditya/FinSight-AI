const fs = require('node:fs');
const { execFileSync } = require('node:child_process');

const lock = JSON.parse(execFileSync('git', ['show', 'HEAD:frontend/package-lock.json'], { encoding: 'utf8' }));
lock.packages[''].dependencies['chart.js'] = '^4.6.1';
lock.packages[''].dependencies['react-chartjs-2'] = '^5.3.1';
lock.packages['node_modules/@kurkle/color'] = {
  version: '0.3.4',
  resolved: 'https://registry.npmjs.org/@kurkle/color/-/color-0.3.4.tgz',
  integrity: 'sha512-M5UknZPHRu3DEDWoipU6sE8PdkZ6Z/S+v4dD+Ke8IaNlpdSQah50lz1KtcFBa2vsdOnwbbnxJwVM4wty6udA5w==',
  license: 'MIT',
};
lock.packages['node_modules/chart.js'] = {
  version: '4.6.1',
  resolved: 'https://registry.npmjs.org/chart.js/-/chart.js-4.6.1.tgz',
  integrity: 'sha512-hJyniucsFmq//EvXYvJ6c6mahPoI3kaxdjVH8awTaJ/fDNWeSqqqArixMJWkWNN6fcYvPU3HneSANFNYtRi61g==',
  license: 'MIT',
  dependencies: { '@kurkle/color': '^0.3.0' },
  engines: { pnpm: '>=8' },
};
lock.packages['node_modules/react-chartjs-2'] = {
  version: '5.3.1',
  resolved: 'https://registry.npmjs.org/react-chartjs-2/-/react-chartjs-2-5.3.1.tgz',
  integrity: 'sha512-h5IPXKg9EXpjoBzUfyWJvllMjG2mQ4EiuHQFhms/AjUm0XSZHhyRy2xVmLXHKrtcdrPO4mnGqRtYoD0vp95A0A==',
  license: 'MIT',
  peerDependencies: {
    'chart.js': '^4.1.1',
    react: '^16.8.0 || ^17.0.0 || ^18.0.0 || ^19.0.0',
  },
};

fs.writeFileSync('frontend/package-lock.json', `${JSON.stringify(lock, null, 2)}\n`);
