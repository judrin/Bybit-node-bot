import dotenv from 'dotenv';
import { LinearClient } from 'bybit-api';
import { CryptoSymbol, IPlaceOrderResponse, Side, TradeType } from './bybit';
import ByBitService, { IGetPosition } from './ByBitService';
import {
  calcPercentageChange,
  checkTradeType,
  getExponent,
  logger,
} from './utils';
import ByBitRepo, { IByBitConfigDocument } from './ByBitRepo';
import { docClient } from './dynamoDB';

interface IAppConfig {
  maxHoldPositions: number;
  shortProfit: number;
  longProfit: number;
  longNextEntry: number;
  shortNextEntry: number;
  minQty: number;
}

export interface IActiveOrders {
  long: IPlaceOrderResponse[];
  short: IPlaceOrderResponse[];
}

class App {
  private service: ByBitService;
  private repo: ByBitRepo;
  private config: IAppConfig;
  private position: IGetPosition;
  private activeOrders: IPlaceOrderResponse | IPlaceOrderResponse[];
  private longEnabled: boolean = false;
  private shortEnabled: boolean = false;
  private longSizeExceeded: boolean = false;
  private shortSizeExceeded: boolean = false;

  constructor(
    key: string,
    secretKey: string,
    liveMode: boolean,
    private symbol: CryptoSymbol
  ) {
    const client = new LinearClient(key, secretKey, liveMode, {
      recv_window: 100000,
    });

    this.service = new ByBitService(client);
    logger.info('Bybit service initialized');
    this.repo = new ByBitRepo(docClient);
    logger.info('DB initialized');
  }

  private setConfig(config: IByBitConfigDocument) {
    this.config = {
      maxHoldPositions: config.max_hold_positions,
      shortProfit: config.short_profit,
      longProfit: config.long_profit,
      longNextEntry: config.long_next_entry,
      shortNextEntry: config.short_next_entry,
      minQty: config.min_qty,
    };
  }

  public async init() {
    try {
      const config = await this.repo.getConfig();
      const posStatus = await this.repo.getPositionStatus();

      this.setConfig(config);
      this.longEnabled = posStatus.long_trigger;
      this.shortEnabled = posStatus.short_trigger;
    } catch (error) {
      throw Error(error);
    }
  }

  public async placeInitOrder(
    qty: number,
    profit: number,
    extraOrderPercent: number,
    side: Side
  ) {
    const result = await this.service.placeMarketOrder(this.symbol, qty, side);
    const filledOrder = await this.service.waitAndgetOrderFilled(
      result.order_id,
      this.symbol
    );

    if (!filledOrder) {
      throw Error('Order has not filled yet');
    }

    const orderPrice = filledOrder.last_exec_price;

    const limitOrderResult = await this.service.placeLimitOrder(
      this.symbol,
      qty,
      calcPercentageChange(
        orderPrice,
        side === Side.Buy ? -extraOrderPercent : extraOrderPercent,
        2
      ),
      side
    );

    const limitCloseResult = await this.service.setLimitClose(
      side,
      this.symbol,
      calcPercentageChange(orderPrice, side === Side.Buy ? profit : -profit, 2),
      filledOrder.qty
    );

    return {
      side,
      filledOrder,
      limitBuyOrder: limitOrderResult,
      limitCloseOrder: limitCloseResult,
    };
  }

  public async addActiveOrdersToCurrPosition(
    price: number,
    qty: number,
    profit: number,
    extraOrderPercent: number,
    side: Side
  ) {
    const limitOrderResult = await this.service.placeLimitOrder(
      this.symbol,
      qty,
      calcPercentageChange(
        price,
        side === Side.Buy ? -extraOrderPercent : extraOrderPercent,
        2
      ),
      side
    );

    const limitCloseResult = await this.service.setLimitClose(
      side,
      this.symbol,
      calcPercentageChange(price, side === Side.Buy ? profit : -profit, 2),
      qty
    );

    return {
      side,
      limitBuyOrder: limitOrderResult,
      limitCloseOrder: limitCloseResult,
    };
  }

  public async loadCurrPosition() {
    this.position = await this.service.getPosition(this.symbol);
  }

  public async loadActiveOrders() {
    this.activeOrders = await this.service.getActiveOrderRequest(this.symbol);
  }

  public async runLong(): Promise<void> {
    if (!this.longEnabled) return;
    const filteredActiveOrders = this.filterActiveOrders(this.activeOrders);

    if (this.position.buy.size >= this.config.maxHoldPositions) {
      if (!this.longSizeExceeded) {
        logger.warn('Max hold position exceeded');
        this.longSizeExceeded = true;
      }
    } else if (this.position.buy.size > 0) {
      this.longSizeExceeded = false;
      const buyOrderFound =
        filteredActiveOrders.long.filter((order) =>
          checkTradeType(order.side, order.reduce_only, TradeType.OpenLong)
        ).length > 0;
      const sellOrderFound =
        filteredActiveOrders.long.filter((order) =>
          checkTradeType(order.side, order.reduce_only, TradeType.CloseLong)
        ).length > 0;

      if (!buyOrderFound || !sellOrderFound) {
        await this.service.cancelActiveOrders(
          this.symbol,
          filteredActiveOrders.long.map<string>((order) => order.order_id)
        );
      }

      if (!buyOrderFound) {
        const orderResult = await this.addActiveOrdersToCurrPosition(
          this.position.buy.entry_price,
          this.position.buy.size,
          this.config.longProfit,
          this.config.longNextEntry *
            getExponent(this.config.minQty, this.position.buy.size),
          Side.Buy
        );
        logger.info(`Added active orders (Side: ${Side.Buy})`);
        await this.repo.addDocument(this.repo.toDbModel(orderResult));
      }
    } else {
      await this.service.cancelActiveOrders(
        this.symbol,
        filteredActiveOrders.long.map<string>((order) => order.order_id)
      );
      const orderResult = await this.placeInitOrder(
        this.config.minQty,
        this.config.longProfit,
        this.config.longNextEntry,
        Side.Buy
      );
      logger.info(`Placed order (Side: ${Side.Buy})`);
      await this.repo.addDocument(this.repo.toDbModel(orderResult));
    }
  }

  public async runShort(): Promise<void> {
    if (!this.shortEnabled) return;
    const filteredActiveOrders = this.filterActiveOrders(this.activeOrders);

    if (this.position.sell.size >= this.config.maxHoldPositions) {
      if (!this.shortSizeExceeded) {
        logger.warn('Max hold position exceeded');
        this.shortSizeExceeded = true;
      }
    } else if (this.position.sell.size > 0) {
      this.shortSizeExceeded = false;
      const buyOrderFound =
        filteredActiveOrders.short.filter((order) =>
          checkTradeType(order.side, order.reduce_only, TradeType.OpenShort)
        ).length > 0;
      const sellOrderFound =
        filteredActiveOrders.short.filter((order) =>
          checkTradeType(order.side, order.reduce_only, TradeType.CloseShort)
        ).length > 0;

      if (!buyOrderFound || !sellOrderFound) {
        await this.service.cancelActiveOrders(
          this.symbol,
          filteredActiveOrders.short.map<string>((order) => order.order_id)
        );
      }

      if (!buyOrderFound) {
        const orderResult = await this.addActiveOrdersToCurrPosition(
          this.position.sell.entry_price,
          this.position.sell.size,
          this.config.shortProfit,
          this.config.shortNextEntry *
            getExponent(this.config.minQty, this.position.sell.size),
          Side.Sell
        );
        logger.info(`Added active orders (Side: ${Side.Sell})`);
        await this.repo.addDocument(this.repo.toDbModel(orderResult));
      }
    } else {
      await this.service.cancelActiveOrders(
        this.symbol,
        filteredActiveOrders.short.map<string>((order) => order.order_id)
      );
      const orderResult = await this.placeInitOrder(
        this.config.minQty,
        this.config.shortProfit,
        this.config.shortNextEntry,
        Side.Sell
      );
      logger.info(`Placed order (Side: ${Side.Sell})`);
      await this.repo.addDocument(this.repo.toDbModel(orderResult));
    }
  }

  public async addDocument(data: any) {
    await this.repo.addDocument(this.repo.toDbModel(data));
  }

  private filterActiveOrders(
    orders: IPlaceOrderResponse | IPlaceOrderResponse[]
  ): IActiveOrders {
    const long: IPlaceOrderResponse[] = [];
    const short: IPlaceOrderResponse[] = [];

    const checkLongOrShort = (order: IPlaceOrderResponse) => {
      const isOpenLong = checkTradeType(
        order.side,
        order.reduce_only,
        TradeType.OpenLong
      );
      const isCloseLong = checkTradeType(
        order.side,
        order.reduce_only,
        TradeType.CloseLong
      );
      const isOpenShort = checkTradeType(
        order.side,
        order.reduce_only,
        TradeType.OpenShort
      );
      const isCloseShort = checkTradeType(
        order.side,
        order.reduce_only,
        TradeType.CloseShort
      );

      if (isOpenLong || isCloseLong) long.push(order);
      if (isOpenShort || isCloseShort) short.push(order);
    };

    if (Array.isArray(orders)) {
      orders.forEach((order: IPlaceOrderResponse) => {
        checkLongOrShort(order);
      });
    } else {
      checkLongOrShort(orders);
    }

    return { long, short };
  }
}

export default App;
