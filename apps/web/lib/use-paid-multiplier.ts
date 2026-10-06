"use client";
import { useEffect, useMemo, useState } from "react";
import {
  readStackSubscriptions,
  type StackSubscription,
  subscribeCurrentStack,
} from "./current-stack";
import type { Recap } from "./recap";
import type { PlanChoice } from "./what-you-pay";

/** "Nx what you paid" for one recap, with what it was worked out from. */
export interface PaidFigure {
  /** "33×", whole from 10 up, one decimal below. */
  text: string;
  monthlyUsd: string;
  accounts: number;
  days: number;
}

/**
 * The "Nx what you paid" figure, from the plans saved in Settings. Undefined
 * when nothing is entered, a plan has no dollar price, or the recap has no
 * API-price value, so a surface that reads it has nothing to show.
 */
export function usePaidMultiplier(recap: Recap | undefined): PaidFigure | undefined {
  const [subscriptions, setSubscriptions] = useState<StackSubscription[]>([]);
  useEffect(() => {
    const refresh = () => setSubscriptions(readStackSubscriptions());
    refresh();
    return subscribeCurrentStack(refresh);
  }, []);
  const [calculator, setCalculator] = useState<{
    choices: PlanChoice[];
    module: typeof import("./what-you-pay");
  }>();
  const needed = subscriptions.length > 0;
  useEffect(() => {
    if (!needed) return;
    let active = true;
    void import("./what-you-pay").then((module) => {
      if (active)
        setCalculator({
          choices: module.payablePlans(new Date().toISOString().slice(0, 10)),
          module,
        });
    });
    return () => {
      active = false;
    };
  }, [needed]);
  return useMemo(() => {
    if (!recap?.priced || !calculator) return undefined;
    const pay = calculator.module.whatYouPay(subscriptions, calculator.choices);
    if (!pay?.monthlyUsd) return undefined;
    const days = recap.days.length;
    const multiplier = calculator.module.paidMultiplier(recap.usd, pay.monthlyUsd, days);
    return multiplier
      ? { text: multiplier.text, monthlyUsd: pay.monthlyUsd, accounts: pay.accounts, days }
      : undefined;
  }, [recap, subscriptions, calculator]);
}
