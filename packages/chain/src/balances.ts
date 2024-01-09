import {
  RuntimeModule,
  runtimeModule,
  state,
  runtimeMethod,
} from "@proto-kit/module";
import { State, StateMap, assert } from "@proto-kit/protocol";
import { PublicKey, UInt64 } from "o1js";

interface BalancesConfig { }

@runtimeModule()
export class Balances extends RuntimeModule<BalancesConfig> {
  @state() public balancesBitcoin = StateMap.from<PublicKey, UInt64>(
    PublicKey,
    UInt64
  );

  @state() public balancesDollar = StateMap.from<PublicKey, UInt64>(
    PublicKey,
    UInt64
  );

  @runtimeMethod()
  public addBitcoin(address: PublicKey, amount: UInt64): void {
    const currentBalance = this.balancesBitcoin.get(address)
    const newBalance = currentBalance.value.add(amount)
    this.balancesBitcoin.set(address, newBalance)
  }

  @runtimeMethod()
  public addDollar(address: PublicKey, amount: UInt64): void {
    const currentBalance = this.balancesDollar.get(address)
    const newBalance = currentBalance.value.add(amount)
    this.balancesDollar.set(address, newBalance)
  }

  @runtimeMethod()
  public subBitcoin(address: PublicKey, amount: UInt64): void {
    const currentBalance = this.balancesBitcoin.get(address)
    const newBalance = currentBalance.value.sub(amount)
    this.balancesBitcoin.set(address, newBalance)
  }

  @runtimeMethod()
  public subDollar(address: PublicKey, amount: UInt64): void {
    const currentBalance = this.balancesDollar.get(address)
    const newBalance = currentBalance.value.sub(amount)
    this.balancesDollar.set(address, newBalance)
  }
}
