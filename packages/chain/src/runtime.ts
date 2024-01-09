import { UInt64 } from "o1js";
import { Balances } from "./balances";
import { OrderBook } from "./order-book";

export default {
  modules: {
    Balances,
    OrderBook,
  },
  config: {
    Balances: {},
    OrderBook: {}
  },
};
