export enum APIMode {
  Live = 'live',
  Test = 'test',
}

export enum CryptoSymbol {
  BTCUSDT = 'BTCUSDT',
}

export enum OrderStatus {
  Filled = 'Filled',
  New = 'New',
}

export enum OrderType {
  Limit = 'Limit',
  Market = 'Market',
}

export enum Side {
  Buy = 'Buy',
  Sell = 'Sell',
}

export enum TradeType {
  OpenLong = 'OpenLong',
  CloseLong = 'CloseLong',
  OpenShort = 'OpenShort',
  CloseShort = 'CloseShort',
}

export enum TimeInForce {
  GTC = 'GoodTillCancel',
}

export enum TriggerPriceType {
  LastPrice = 'LastPrice',
  IndexPrice = 'IndexPrice',
  MarkPrice = 'MarkPrice',
}

export enum TickDirection {
  PlusTick = 'PlusTick',
  ZeroPlusTick = 'ZeroPlusTick',
  MinusTick = 'MinusTick',
  ZeroMinusTic = 'ZeroMinusTic',
}

export interface IOrderRequest {
  side: Side;
  symbol: CryptoSymbol;
  order_type: OrderType;
  qty: number;
  price?: number;
  time_in_force: TimeInForce;
  close_on_trigger: boolean;
  take_profit?: number;
  stop_loss?: number;
  tp_trigger_by?: TriggerPriceType;
  sl_trigger_by?: TriggerPriceType;
  reduce_only?: boolean;
  recv_window?: number;
}

export interface ITradingStop {
  symbol: CryptoSymbol;
  side: Side;
  take_profit?: number;
  stop_loss?: number;
  trailing_stop?: number;
  tp_trigger_by?: TriggerPriceType;
  sl_trigger_by?: TriggerPriceType;
  sl_size?: number;
  tp_size?: number;
  recv_window?: number;
}

export interface IPosition {
  user_id: number;
  symbol: CryptoSymbol;
  side: Side;
  size: number;
  position_value: number;
  entry_price: number;
  liq_price: number;
  bust_price: number;
  leverage: number;
  auto_add_margin: number;
  is_isolated: boolean;
  position_margin: number;
  occ_closing_fee: number;
  realised_pnl: number;
  cum_realised_pnl: number;
  free_qty: number;
  tp_sl_mode: string;
  deleverage_indicator: number;
  unrealised_pnl: number;
  risk_id: number;
  take_profit: number;
  stop_loss: number;
  trailing_stop: number;
}

export interface IPlaceOrderResponse {
  order_id: string;
  user_id: number;
  symbol: CryptoSymbol;
  side: Side;
  order_type: string;
  price: number;
  qty: number;
  time_in_force: TimeInForce;
  order_status: string;
  last_exec_price: number;
  cum_exec_qty: number;
  cum_exec_value: number;
  cum_exec_fee: number;
  reduce_only: boolean;
  close_on_trigger: boolean;
  order_link_id: string;
  created_time: string;
  updated_time: string;
  take_profit: number;
  stop_loss: number;
  tp_trigger_by: TriggerPriceType;
  sl_trigger_by: TriggerPriceType;
}

export interface ITicker {
  symbol: CryptoSymbol;
  bid_price: string;
  ask_price: string;
  last_price: string;
  tick_direction: TickDirection;
  prev_price_24h: string;
  price_24h_pcnt: string;
  high_price_24h: string;
  low_price_24h: string;
  prev_price_1h: string;
  price_1h_pcnt: string;
  mark_price: string;
  index_price: string;
  open_interest: number;
  open_value: string;
  total_turnover: string;
  turnover_24h: string;
  total_volume: number;
  volume_24h: number;
  funding_rate: string;
  predicted_funding_rate: string;
  next_funding_time: string;
  countdown_hour: number;
  delivery_fee_rate: string;
  predicted_delivery_price: string;
  delivery_time: string;
}
