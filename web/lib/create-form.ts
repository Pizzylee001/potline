import { parseUnits } from "viem";
import { USDG } from "./chain";

/** SavingsCircle reverts above this, so the form refuses it before the wallet. */
export const MAX_MEMBERS = 50;
export const MIN_MEMBERS = 1;

/** The two presets the create form offers as plain buttons. */
export const PRESETS = [
  { label: "50 USDG, up to 4 members", amount: "50", cap: "4" },
  { label: "200 USDG, up to 10 members", amount: "200", cap: "10" },
] as const;

export interface CreateFormValues {
  amount: string;
  cap: string;
}

export type CreateFormCheck =
  | { ok: true; amount: bigint; cap: bigint }
  | { ok: false; amountError: string | null; capError: string | null };

/**
 * Client-side check of the create form. The amount must sit above zero with at
 * most USDG.decimals places, the cap must be a whole number between 1 and 50.
 * Same shape as bidValidation so both forms read the same way.
 */
export function validateCreateForm(values: CreateFormValues): CreateFormCheck {
  const amountRaw = values.amount.trim();
  const capRaw = values.cap.trim();

  let amountError: string | null = null;
  let capError: string | null = null;
  let amount = 0n;

  if (amountRaw.length === 0) {
    amountError = `Enter the contribution amount in ${USDG.symbol}.`;
  } else if (!/^\d*\.?\d*$/.test(amountRaw) || amountRaw === ".") {
    amountError = "Use numbers only, for example 50";
  } else {
    const decimals = amountRaw.split(".")[1]?.length ?? 0;
    if (decimals > USDG.decimals) {
      amountError = `${USDG.symbol} has ${USDG.decimals} decimals, so use at most ${USDG.decimals}.`;
    } else {
      try {
        amount = parseUnits(amountRaw, USDG.decimals);
      } catch {
        amountError = `Enter a valid ${USDG.symbol} amount.`;
      }
      if (!amountError && amount <= 0n) {
        amountError = "Enter an amount above zero.";
      }
    }
  }

  if (capRaw.length === 0) {
    capError = "Enter the member cap.";
  } else if (!/^\d+$/.test(capRaw)) {
    capError = "The member cap must be a whole number.";
  } else {
    const cap = Number(capRaw);
    if (cap < MIN_MEMBERS || cap > MAX_MEMBERS) {
      capError = `The member cap must be between ${MIN_MEMBERS} and ${MAX_MEMBERS}.`;
    }
  }

  if (amountError || capError) return { ok: false, amountError, capError };

  return { ok: true, amount, cap: BigInt(capRaw) };
}