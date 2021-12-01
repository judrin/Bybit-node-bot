import { LinearClient } from 'bybit-api';
import {
  CryptoSymbol,
  IOrderRequest,
  OrderType,
  Side,
  TimeInForce,
  ITradingStop,
  IPosition,
  IPlaceOrderResponse,
  OrderStatus,
  ITicker,
} from './bybit';
import dayjs from 'dayjs';

export interface IGetPosition {
  buy: IPosition;
  sell: IPosition;
}

class ByBitService {
  constructor(private client: LinearClient) {}

  public async testService() {
    await this.client.getServerTime();
  }

  public async placeMarketOrder(
    symbol: CryptoSymbol,
    qty: number,
    side: Side
  ): Promise<IPlaceOrderResponse> {
    const data: IOrderRequest = {
      side,
      order_type: OrderType.Market,
      qty,
      symbol,
      time_in_force: TimeInForce.GTC,
      close_on_trigger: false,
      reduce_only: false,
    };

    const orderResponse = await this.client.placeActiveOrder(data);

    if (orderResponse.ret_code !== 0) {
      throw Error(orderResponse.ret_msg);
    }

    return orderResponse.result as IPlaceOrderResponse;
  }

  public async placeLimitOrder(
    symbol: CryptoSymbol,
    qty: number,
    price: number,
    side: Side
  ): Promise<IPlaceOrderResponse> {
    const data: IOrderRequest = {
      side,
      order_type: OrderType.Limit,
      qty,
      symbol,
      price,
      time_in_force: TimeInForce.GTC,
      close_on_trigger: false,
      reduce_only: false,
    };

    const orderResponse = await this.client.placeActiveOrder(data);

    if (orderResponse.ret_code !== 0) {
      throw Error(orderResponse.ret_msg);
    }

    return orderResponse.result as IPlaceOrderResponse;
  }

  public async waitAndgetOrderFilled(
    orderId: string,
    symbol: CryptoSymbol
  ): Promise<IPlaceOrderResponse | undefined> {
    return new Promise(async (resolve, reject) => {
      try {
        const maxTimeout = 10;
        const startTime = dayjs();
        let filled = false;
        while (dayjs().diff(startTime, 'second') < maxTimeout) {
          await new Promise((r) => setTimeout(r, 500));
          const result = (await this.getActiveOrderRequest(
            symbol,
            orderId
          )) as IPlaceOrderResponse;

          if (result && result.order_status == OrderStatus.Filled) {
            filled = true;
            resolve(result);
          }
        }

        if (!filled) {
          throw Error('Active order request timeout');
        }
      } catch (error) {
        console.error(error);
        reject(undefined);
      }
    });
  }

  public async setLimitClose(
    side: Side,
    symbol: CryptoSymbol,
    price: number,
    qty: number
  ): Promise<IPlaceOrderResponse> {
    const data: IOrderRequest = {
      side: side === Side.Buy ? Side.Sell : Side.Buy,
      order_type: OrderType.Limit,
      qty,
      price,
      symbol: symbol,
      time_in_force: TimeInForce.GTC,
      close_on_trigger: false,
      reduce_only: true,
    };

    // calcPercentageChange(price, side === Side.Sell ? -profit : profit, 2);

    const orderResult = await this.client.placeActiveOrder(data);

    if (orderResult.ret_code !== 0) {
      throw Error(orderResult.ret_msg);
    }

    return orderResult.result as IPlaceOrderResponse;
  }

  public async setTradingStop(
    side: Side,
    symbol: CryptoSymbol,
    price: number
  ): Promise<void> {
    const tp: ITradingStop = {
      symbol,
      side,
      stop_loss: price,
    };

    // calcPercentageChange(price, side === Side.Sell ? stoploss : -stoploss, 2);

    const tradingStopResult = await this.client.setTradingStop(tp);

    if (tradingStopResult.ret_code !== 0) {
      throw Error(tradingStopResult.ret_msg);
    }
  }

  public async getPosition(symbol: CryptoSymbol): Promise<IGetPosition> {
    const position = await this.client.getPosition({
      symbol,
    });

    if (position.ret_code !== 0) {
      throw Error(position.ret_msg);
    }

    return { buy: position.result[0], sell: position.result[1] };
  }

  public async getActiveOrderRequest(
    symbol: CryptoSymbol,
    orderId?: string
  ): Promise<IPlaceOrderResponse | IPlaceOrderResponse[]> {
    const params = {
      symbol,
    } as any;

    if (orderId) {
      params.order_id = orderId;
    }

    const response = await this.client.queryActiveOrder(params);

    if (response.ret_code !== 0) {
      throw Error(response.ret_msg);
    }

    return response.result;
  }

  public async getLastestSymbolInfo(symbol: CryptoSymbol): Promise<ITicker> {
    const response = await this.client.getTickers({ symbol });

    if (response.ret_code !== 0) {
      throw Error(response.ret_msg);
    }

    return response.result[0] as ITicker;
  }

  public async cancelAllActiveOrders(symbol: CryptoSymbol): Promise<void> {
    const response = await this.client.cancelAllActiveOrders({ symbol });

    if (response.ret_code !== 0) {
      throw Error(response.ret_msg);
    }
  }
}

export default ByBitService;
