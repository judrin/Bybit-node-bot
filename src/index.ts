import {
  addActiveOrdersToCurrPosition,
  addDocument,
  getActiveOrders,
  getPosition,
  initDB,
  placeInitOrder,
  testService,
} from './app';
import { Side, TradeType } from './bybit';
import { checkTradeType, getExponent, logger } from './utils';

const MIN_QTY = 0.001;
const PROFIT = 0.5;
const NEXT_BUY_PERCENT = 1.5;
const MAX_HOLD_POSITIONS = 0.032;

const INTERVAL_TIME = 10000;

const app = async () => {
  await initDB();
  logger.info('DB initialized');
  await testService();
  logger.info('Bybit service initialized');

  const run = async () => {
    const position = await getPosition();
    const activeOrders = await getActiveOrders();
    if (position.buy.size >= MAX_HOLD_POSITIONS) {
      logger.warn('Max hold position exceeded');
    } else if (position.buy.size > 0) {
      let addActiveOrders = false;
      if (Array.isArray(activeOrders)) {
        const found = activeOrders.find((order) =>
          checkTradeType(order.side, order.reduce_only, TradeType.OpenLong)
        );

        addActiveOrders = !found;
      } else {
        addActiveOrders = !checkTradeType(
          activeOrders.side,
          activeOrders.reduce_only,
          TradeType.OpenLong
        );
      }

      if (addActiveOrders) {
        const orderResult = await addActiveOrdersToCurrPosition(
          position.buy.entry_price,
          position.buy.size,
          PROFIT,
          NEXT_BUY_PERCENT * getExponent(MIN_QTY, position.buy.size),
          Side.Buy
        );
        logger.info(`Added active orders (Side: ${Side.Buy})`);
        await addDocument(orderResult);
      }
    } else {
      const orderResult = await placeInitOrder(
        MIN_QTY,
        PROFIT,
        NEXT_BUY_PERCENT,
        Side.Buy
      );
      logger.info(`Placed order (Side: ${Side.Buy})`);
      await addDocument(orderResult);
    }

    // Kepp running app
    setTimeout(() => {
      (async () => {
        await run();
      })();
    }, INTERVAL_TIME);
  };

  await run();
};

app()
  .then(() => {})
  .catch((error) => {
    console.log(error);
    logger.error(error);
  });
