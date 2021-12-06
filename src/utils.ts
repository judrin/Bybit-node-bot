import { createRollingFileLogger } from 'simple-node-logger';
import { OrderType, Side, TradeType } from './bybit';

export const calcPercentageChange = (
  price: number,
  change: number,
  toFixed?: number
): number => {
  let updatedPrice = price * (1 + change / 100);

  if (toFixed) {
    updatedPrice = Number(updatedPrice.toFixed(toFixed));
  }

  return updatedPrice;
};

export const logger = createRollingFileLogger({
  logDirectory: `./logs`,
  fileNamePattern: 'logs-<DATE>.log',
});

export const checkTradeType = (
  side: Side,
  reduceOnly: boolean,
  tradeTypeToCheck: TradeType
) => {
  switch (tradeTypeToCheck) {
    case TradeType.OpenLong:
      return side === Side.Buy && !reduceOnly;
    case TradeType.CloseLong:
      return side === Side.Sell && reduceOnly;
    case TradeType.OpenShort:
      return side === Side.Sell && !reduceOnly;
    case TradeType.CloseShort:
      return side === Side.Buy && reduceOnly;
    default:
      return false;
  }
};

export const getExponent = (base: number, pow: number): number => {
  let exponent = 1;
  let temp = pow / base;
  while (temp > 1) {
    temp = temp / 2;
    exponent++;
  }

  return exponent;
};
