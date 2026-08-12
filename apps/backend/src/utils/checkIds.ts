import { prisma } from '../db/prisma';

async function main() {
  const invoices = await prisma.invoice.findMany({ select: { id: true, invoiceNumber: true } });
  const pos = await prisma.purchaseOrder.findMany({ select: { id: true, poNumber: true } });
  const challans = await prisma.salesChallan.findMany({ select: { id: true, challanNumber: true } });

  console.log('--- INVOICES ---');
  console.log(JSON.stringify(invoices));
  console.log('--- PURCHASE ORDERS ---');
  console.log(JSON.stringify(pos));
  console.log('--- CHALLANS ---');
  console.log(JSON.stringify(challans));
}

main().catch(console.error);
