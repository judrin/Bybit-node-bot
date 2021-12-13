import dotenv from 'dotenv';
import App from './App';
import { CryptoSymbol } from './bybit';
import { logger } from './utils';

const INTERVAL_TIME = 10000;
dotenv.config();

const key = process.env.BYBIT_KEY;
const secretKey = process.env.BYBIT_SECRET_KEY;
const liveMode = false;

const app = new App(key, secretKey, liveMode, CryptoSymbol.BTCUSDT);
const run = async () => {
  await app.loadCurrPosition();
  await app.loadActiveOrders();
  await app.runLong();
  await app.runShort();
  await app.loadCurrPosition();

  // setTimeout(() => {
  //   (async () => {
  //     await run();
  //   })();
  // }, INTERVAL_TIME);
};

app
  .init()
  .then(async () => {
    try {
      await run();
    } catch (error) {
      console.error(error);
      logger.error(error);
      await run();
    }
  })
  .catch((error) => {});
