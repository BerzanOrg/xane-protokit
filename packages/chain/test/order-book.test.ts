import { TestingAppChain } from "@proto-kit/sdk";
import { Bool, PrivateKey, UInt64 } from "o1js";
import { Balances } from "../src/balances";
import { OrderBook } from "../src/order-book";
import { log } from "@proto-kit/common";

log.setLevel("ERROR");

describe("balances", () => {
  it("can run", async () => {
    const appChain = TestingAppChain.fromRuntime({
      modules: {
        Balances,
        OrderBook,
      },
      config: {
        Balances: {},
        OrderBook: {},
      },
    });

    await appChain.start();

    const alicePrivateKey = PrivateKey.random();
    const alice = alicePrivateKey.toPublicKey();
    const bobPrivateKey = PrivateKey.random();
    const bob = bobPrivateKey.toPublicKey();

    appChain.setSigner(alicePrivateKey);

    const balances = appChain.runtime.resolve("Balances");
    const orderBook = appChain.runtime.resolve("OrderBook");

    const tx1 = await appChain.transaction(alice, () => {
      balances.addBitcoin(alice, UInt64.from(21));
    });

    await tx1.sign();
    await tx1.send();

    const block1 = await appChain.produceBlock();
    expect(block1?.txs[0].status).toBe(true);


    appChain.setSigner(bobPrivateKey);

    const tx2 = await appChain.transaction(bob, () => {
      balances.addDollar(bob, UInt64.from(1_000_000));
    });

    await tx2.sign();
    await tx2.send();

    const block2 = await appChain.produceBlock();
    expect(block2?.txs[0].status).toBe(true);

    const aliceBitcoinBalance2 = await appChain.query.runtime.Balances.balancesBitcoin.get(alice);
    const bobDollarBalance2 = await appChain.query.runtime.Balances.balancesDollar.get(bob);
    expect(aliceBitcoinBalance2?.toBigInt()).toBe(21n);
    expect(bobDollarBalance2?.toBigInt()).toBe(1_000_000n);


    appChain.setSigner(alicePrivateKey);
    const tx3 = await appChain.transaction(alice, () => {
      orderBook.placeOrder(Bool(false), new UInt64(1), new UInt64(45_000))
    });

    await tx3.sign();
    await tx3.send();

    const block3 = await appChain.produceBlock();
    expect(block3?.txs[0].status).toBe(true);
    const aliceBitcoinBalance3 = await appChain.query.runtime.Balances.balancesBitcoin.get(alice);
    expect(aliceBitcoinBalance3?.toBigInt()).toBe(20n);


    appChain.setSigner(alicePrivateKey);

    const tx4 = await appChain.transaction(alice, () => {
      orderBook.cancelOrder(new UInt64(0))
    });

    await tx4.sign();
    await tx4.send();

    const block4 = await appChain.produceBlock();
    expect(block4?.txs[0].status).toBe(true);
    const aliceBitcoinBalance4 = await appChain.query.runtime.Balances.balancesBitcoin.get(alice);
    expect(aliceBitcoinBalance4?.toBigInt()).toBe(21n);



    appChain.setSigner(alicePrivateKey);
    const tx5 = await appChain.transaction(alice, () => {
      orderBook.placeOrder(Bool(false), new UInt64(1), new UInt64(45_000))
    });

    await tx5.sign();
    await tx5.send();

    const block5 = await appChain.produceBlock();
    expect(block5?.txs[0].status).toBe(true);
    const aliceBitcoinBalance5 = await appChain.query.runtime.Balances.balancesBitcoin.get(alice);
    expect(aliceBitcoinBalance5?.toBigInt()).toBe(20n);



    appChain.setSigner(bobPrivateKey);
    const tx6 = await appChain.transaction(alice, () => {
      orderBook.executeOrder(new UInt64(1))
    });

    await tx6.sign();
    await tx6.send();

    const block6 = await appChain.produceBlock();
    expect(block6?.txs[0].status).toBe(true);
    const aliceBitcoinBalance6 = await appChain.query.runtime.Balances.balancesBitcoin.get(alice);
    const bobBitcoinBalance6 = await appChain.query.runtime.Balances.balancesBitcoin.get(bob);
    const aliceDollarBalance6 = await appChain.query.runtime.Balances.balancesDollar.get(alice);
    const bobDollarBalance6 = await appChain.query.runtime.Balances.balancesDollar.get(bob);
    expect(aliceBitcoinBalance6?.toBigInt()).toBe(20n);
    expect(bobBitcoinBalance6?.toBigInt()).toBe(1n);
    expect(aliceDollarBalance6?.toBigInt()).toBe(45_000n);
    expect(bobDollarBalance6?.toBigInt()).toBe(1_000_000n - 45_000n);
  }, 1_000_000);
});
