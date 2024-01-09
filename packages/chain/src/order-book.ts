import {
    RuntimeModule,
    runtimeModule,
    runtimeMethod,
    state,
} from "@proto-kit/module";
import { State, StateMap, assert, } from "@proto-kit/protocol";
import { Bool, Field, PublicKey, Struct, UInt64, Provable } from "o1js";
import { inject } from "tsyringe";
import { Balances } from "./balances";
import "reflect-metadata"

interface OrderBookConfig { }

@runtimeModule()
export class OrderBook extends RuntimeModule<OrderBookConfig> {
    public constructor(@inject("Balances") private balances: Balances) { super() }

    @state() public orders = StateMap.from<UInt64, Order>(
        UInt64,
        Order
    );

    @state() public nextOrderId = State.from<UInt64>(UInt64)

    @runtimeMethod()
    public placeOrder(isBuy: Bool, amount: UInt64, price: UInt64): void {
        const sender = this.transaction.sender

        const balanceDollar = this.balances.balancesDollar.get(sender).value
        const balanceBitcoin = this.balances.balancesBitcoin.get(sender).value

        const amountDollar = amount.mul(price)
        const amountBitcoin = amount

        Provable.if<Bool>(isBuy, Bool, balanceDollar.greaterThanOrEqual(amountDollar), balanceBitcoin.greaterThanOrEqual(amountBitcoin)).assertTrue('balance is not enough')

        const newBalanceDollar = Provable.if<UInt64>(isBuy, UInt64, balanceDollar.sub(amountDollar), balanceDollar)
        const newBalanceBitcoin = Provable.if<UInt64>(isBuy, UInt64, balanceBitcoin, balanceBitcoin.sub(amountBitcoin))

        const orderId = this.nextOrderId.get().value
        const order = new Order({
            isBuy,
            isCancelled: Bool(false),
            isExecuted: Bool(false),
            amount,
            price,
            maker: sender,
        })


        this.balances.balancesDollar.set(sender, newBalanceDollar)
        this.balances.balancesBitcoin.set(sender, newBalanceBitcoin)
        this.orders.set(orderId, order)
        this.nextOrderId.set(orderId.add(UInt64.one))
    }

    @runtimeMethod()
    public cancelOrder(orderId: UInt64): void {
        const sender = this.transaction.sender
        const order = this.orders.get(orderId).value

        order.isCancelled.assertFalse('order is already cancelled')
        order.isExecuted.assertFalse('order is already executed')
        sender.equals(order.maker).assertTrue("sender doesn't match order maker")

        const balanceDollar = this.balances.balancesDollar.get(sender).value
        const balanceBitcoin = this.balances.balancesBitcoin.get(sender).value

        const amountDollar = order.amount.mul(order.price)
        const amountBitcoin = order.amount

        const newBalanceDollar = Provable.if<UInt64>(order.isBuy, UInt64, balanceDollar.add(amountDollar), balanceDollar)
        const newBalanceBitcoin = Provable.if<UInt64>(order.isBuy, UInt64, balanceBitcoin, balanceBitcoin.add(amountBitcoin))

        this.balances.balancesDollar.set(sender, newBalanceDollar)
        this.balances.balancesBitcoin.set(sender, newBalanceBitcoin)
        this.orders.set(orderId, order.asCancelled())
    }

    @runtimeMethod()
    public executeOrder(orderId: UInt64): void {
        const sender = this.transaction.sender
        const order = this.orders.get(orderId).value

        sender.equals(order.maker).assertFalse("sender can't execute his own order")
        order.isCancelled.assertFalse('order is already cancelled')
        order.isExecuted.assertFalse('order is already executed')

        const senderBalanceDollar = this.balances.balancesDollar.get(sender).value
        const senderBalanceBitcoin = this.balances.balancesBitcoin.get(sender).value
        const makerBalanceDollar = this.balances.balancesDollar.get(order.maker).value
        const makerBalanceBitcoin = this.balances.balancesBitcoin.get(order.maker).value

        const amountDollar = order.amount.mul(order.price)
        const amountBitcoin = order.amount

        Provable.if<Bool>(order.isBuy, Bool, senderBalanceBitcoin.greaterThanOrEqual(amountBitcoin), senderBalanceDollar.greaterThanOrEqual(amountDollar)).assertTrue('balance is not enough')

        const newSenderBalanceDollar = Provable.if<UInt64>(order.isBuy, UInt64, senderBalanceDollar, senderBalanceDollar.sub(amountDollar))
        const newSenderBalanceBitcoin = Provable.if<UInt64>(order.isBuy, UInt64, senderBalanceBitcoin.sub(amountBitcoin), senderBalanceBitcoin)
        const newMakerBalanceDollar = Provable.if<UInt64>(order.isBuy, UInt64, makerBalanceDollar, makerBalanceDollar.add(amountDollar))
        const newMakerBalanceBitcoin = Provable.if<UInt64>(order.isBuy, UInt64, makerBalanceBitcoin.add(amountBitcoin), makerBalanceBitcoin)

        this.balances.balancesDollar.set(sender, newSenderBalanceDollar)
        this.balances.balancesBitcoin.set(sender, newSenderBalanceBitcoin)
        this.balances.balancesDollar.set(order.maker, newMakerBalanceDollar)
        this.balances.balancesBitcoin.set(order.maker, newMakerBalanceBitcoin)
        this.orders.set(orderId, order.asExecuted())
    }
}

export class Order extends Struct({
    isBuy: Bool,
    isCancelled: Bool,
    isExecuted: Bool,
    amount: UInt64,
    price: UInt64,
    maker: PublicKey,
}) {
    asCancelled(): Order {
        return new Order({
            ...this,
            isCancelled: Bool(true)
        })
    }

    asExecuted(): Order {
        return new Order({
            ...this,
            isExecuted: Bool(true)
        })
    }
}