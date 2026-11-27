import { diffDays } from "./dates";
import { round2 } from "./format";

export interface PeriodItem {
  itemId: string;
  name: string;
  qty: number;
  dailyRate: number;
  startDate?: string;
  endDate?: string;
  daysOverride?: number | null;
}
export interface PeriodInput {
  id: string;
  sequence: number;
  startDate: Date;
  endDate: Date;
  dueDate: Date;
  amount: number;
  items: PeriodItem[];
}

/** Apenas o último período pode gerar excedentes; renovar cobre os dias seguintes sem duplicá-los. */
export function calcPeriods(periods: PeriodInput[], paid: number, now: Date, chargeOverdue: boolean,
  returns: { itemId: string; qty: number; date: Date }[], paymentRequired = false) {
  let credit = Math.max(0, paid);
  const sorted = [...periods].sort((a, b) => a.sequence - b.sequence);
  return sorted.map((p, idx) => {
    let excess = 0;
    if (idx === sorted.length - 1) {
      for (const item of p.items) {
        const returned = returns.filter((r) => r.itemId === item.itemId && r.date >= p.startDate);
        const remaining = Math.max(0, item.qty - returned.reduce((s, r) => s + r.qty, 0));
        const days = returned.reduce((s, r) => s + r.qty * Math.max(0, diffDays(p.endDate, r.date)), 0)
          + remaining * Math.max(0, diffDays(p.endDate, now));
        excess += item.dailyRate * days;
      }
    }
    excess = round2(excess);
    const total = round2(p.amount + (chargeOverdue ? excess : 0));
    const allocated = round2(Math.min(credit, total));
    credit = round2(credit - allocated);
    const open = round2(total - allocated);
    return { ...p, total, paid: allocated, open, excess, overdue: open > 0.009 && (paymentRequired || p.dueDate < now) };
  });
}
