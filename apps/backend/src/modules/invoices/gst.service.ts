import { Prisma } from '@prisma/client';

export interface GstInputItem {
  amount: number | Prisma.Decimal;
  gstRate: number | Prisma.Decimal | null;
}

export interface GstCalculationResult {
  subtotal: Prisma.Decimal;
  cgstAmount: Prisma.Decimal;
  sgstAmount: Prisma.Decimal;
  igstAmount: Prisma.Decimal;
  totalAmount: Prisma.Decimal;
  hasUnconfiguredGst: boolean;
}

export class GstService {
  static calculateGst(
    customerState: string | null,
    items: GstInputItem[]
  ): GstCalculationResult {
    const homeState = (process.env.COMPANY_HOME_STATE || 'Maharashtra').trim().toLowerCase();
    const targetState = (customerState || '').trim().toLowerCase();

    // If customerState is null/empty or matches COMPANY_HOME_STATE -> Intra-state
    const isIntraState = !targetState || targetState === homeState;

    let subtotal = new Prisma.Decimal(0);
    let cgstAmount = new Prisma.Decimal(0);
    let sgstAmount = new Prisma.Decimal(0);
    let igstAmount = new Prisma.Decimal(0);
    let hasUnconfiguredGst = false;

    for (const item of items) {
      const amt = new Prisma.Decimal(item.amount);
      subtotal = subtotal.add(amt);

      if (item.gstRate === null) {
        hasUnconfiguredGst = true;
        continue;
      }

      const ratePercent = new Prisma.Decimal(item.gstRate).div(100);
      const taxForLine = amt.mul(ratePercent);

      if (isIntraState) {
        const halfTax = taxForLine.div(2);
        cgstAmount = cgstAmount.add(halfTax);
        sgstAmount = sgstAmount.add(halfTax);
      } else {
        igstAmount = igstAmount.add(taxForLine);
      }
    }

    const totalAmount = subtotal.add(cgstAmount).add(sgstAmount).add(igstAmount);

    return {
      subtotal,
      cgstAmount,
      sgstAmount,
      igstAmount,
      totalAmount,
      hasUnconfiguredGst,
    };
  }
}
