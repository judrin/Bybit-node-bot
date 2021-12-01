import dotenv from 'dotenv';
import { LinearClient } from 'bybit-api';
import { CryptoSymbol, IPlaceOrderResponse, Side } from './bybit';
import ByBitService, { IGetPosition } from './ByBitService';
import { calcPercentageChange } from './utils';
import ByBitRepo from './ByBitRepo';
import { docClient } from './dynamoDB';

dotenv.config();

const key = process.env.BYBIT_KEY;
const secretKey = process.env.BYBIT_SECRET_KEY;
const liveMode = false;

const client = new LinearClient(key, secretKey, liveMode, {
  recv_window: 100000,
});
const service = new ByBitService(client);
const repo = new ByBitRepo(docClient);

export const testService = async () => {
  await service.testService();
};

// Service methods
export const getActiveOrders = async (): Promise<IPlaceOrderResponse[]> => {
  const result = await service.getActiveOrderRequest(CryptoSymbol.BTCUSDT);
  return result as IPlaceOrderResponse[];
};

export const getPosition = async (): Promise<IGetPosition> => {
  return service.getPosition(CryptoSymbol.BTCUSDT);
};

export const placeInitOrder = async (
  qty: number,
  profit: number,
  extraOrderPercent: number,
  side: Side
) => {
  await service.cancelAllActiveOrders(CryptoSymbol.BTCUSDT);

  const result = await service.placeMarketOrder(
    CryptoSymbol.BTCUSDT,
    qty,
    side
  );
  const filledOrder = await service.waitAndgetOrderFilled(
    result.order_id,
    CryptoSymbol.BTCUSDT
  );

  if (!filledOrder) {
    throw Error('Order has not filled yet');
  }

  const orderPrice = filledOrder.last_exec_price;

  const limitOrderResult = await service.placeLimitOrder(
    CryptoSymbol.BTCUSDT,
    qty,
    calcPercentageChange(
      orderPrice,
      side === Side.Buy ? -extraOrderPercent : extraOrderPercent,
      2
    ),
    side
  );

  const limitCloseResult = await service.setLimitClose(
    side,
    CryptoSymbol.BTCUSDT,
    calcPercentageChange(orderPrice, side === Side.Buy ? profit : -profit, 2),
    filledOrder.qty
  );

  return {
    side,
    filledOrder,
    limitBuyOrder: limitOrderResult,
    limitCloseOrder: limitCloseResult,
  };
};

export const addActiveOrdersToCurrPosition = async (
  price: number,
  qty: number,
  profit: number,
  extraOrderPercent: number,
  side: Side
) => {
  await service.cancelAllActiveOrders(CryptoSymbol.BTCUSDT);
  const limitOrderResult = await service.placeLimitOrder(
    CryptoSymbol.BTCUSDT,
    qty,
    calcPercentageChange(
      price,
      side === Side.Buy ? -extraOrderPercent : extraOrderPercent,
      2
    ),
    side
  );

  const limitCloseResult = await service.setLimitClose(
    side,
    CryptoSymbol.BTCUSDT,
    calcPercentageChange(price, side === Side.Buy ? profit : -profit, 2),
    qty
  );

  return {
    side,
    limitBuyOrder: limitOrderResult,
    limitCloseOrder: limitCloseResult,
  };
};

// DB methods
export const initDB = async () => {
  try {
    await repo.getLastDocument();
  } catch (error) {
    throw Error(error);
  }
};

export const addDocument = async (data: any) => {
  await repo.addDocument(repo.toDbModel(data));
};
