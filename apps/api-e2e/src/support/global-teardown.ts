import { killPort } from '@nx/node/utils';

module.exports = async function () {
  // Put clean up logic here (e.g. stopping services, docker-compose, etc.).
  // Hint: `globalThis` is shared between setup and teardown.
  const port = process.env.PORT ? Number(process.env.PORT) : 3000;

  try {
    await killPort(port);
  } catch (error) {
    console.error(`Failed to kill port ${port}:`, error);
  }

  if (globalThis.__TEARDOWN_MESSAGE__) {
    console.log(globalThis.__TEARDOWN_MESSAGE__);
  }
};
