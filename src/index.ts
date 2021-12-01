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
import { checkTradeType, logger } from './utils';

const MIN_QTY = 0.001;
const PROFIT = 0.5;
const NEXT_BUY_PERCENT = 1.5;

const INTERVAL_TIME = 10000;

const app = async () => {
  await initDB();
  logger.info('DB initialized');
  await testService();
  logger.info('Bybit service initialized');

  const run = async () => {
    const position = await getPosition();
    const activeOrders = await getActiveOrders();

    if (position.buy.size > 0) {
      const found = activeOrders.find((order) =>
        checkTradeType(order.side, order.reduce_only, TradeType.CloseLong)
      );

      if (!found) {
        const orderResult = await addActiveOrdersToCurrPosition(
          position.buy.position_value,
          position.buy.size,
          PROFIT,
          NEXT_BUY_PERCENT,
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
