import 'dotenv/config';
import { PrismaClient, Prisma } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed process...');

  // Clean existing data in correct sequence to prevent FK constraint violations
  await prisma.payment.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.purchaseReceiptItem.deleteMany();
  await prisma.purchaseReceipt.deleteMany();
  await prisma.purchaseOrderItem.deleteMany();
  await prisma.purchaseOrder.deleteMany();
  await prisma.vendor.deleteMany();
  await prisma.customerInteraction.deleteMany();

  await prisma.challanItem.deleteMany();
  await prisma.stockMovement.deleteMany();
  await prisma.salesChallan.deleteMany();
  await prisma.followUpNote.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.product.deleteMany();
  await prisma.user.deleteMany();

  // 1. Hash default password
  const passwordHash = await bcrypt.hash('Passw0rd!', 10);

  // 2. Create Users (1 per role)
  console.log('👤 Seeding Users...');
  const adminUser = await prisma.user.create({
    data: {
      name: 'Admin Manager',
      email: 'admin@demo.com',
      passwordHash,
      role: 'ADMIN',
    },
  });

  const salesUser = await prisma.user.create({
    data: {
      name: 'Sales Executive',
      email: 'sales@demo.com',
      passwordHash,
      role: 'SALES',
    },
  });

  const warehouseUser = await prisma.user.create({
    data: {
      name: 'Warehouse Keeper',
      email: 'warehouse@demo.com',
      passwordHash,
      role: 'WAREHOUSE',
    },
  });

  const accountsUser = await prisma.user.create({
    data: {
      name: 'Accounts Specialist',
      email: 'accounts@demo.com',
      passwordHash,
      role: 'ACCOUNTS',
    },
  });

  console.log(`✅ Created 4 users (Admin, Sales, Warehouse, Accounts).`);

  // 3. Create 5 Customers with states
  console.log('👥 Seeding Customers...');
  const customer1 = await prisma.customer.create({
    data: {
      name: 'Apex Retailers',
      mobile: '+919876543210',
      email: 'contact@apexretail.com',
      businessName: 'Apex Retail Private Limited',
      gstNumber: '27AAAAA0000A1Z5',
      customerType: 'RETAIL',
      address: '101 Commercial Street, Sector 17, Mumbai, MH',
      state: 'Maharashtra',
      status: 'LEAD',
      followUpDate: new Date(Date.now() + 86400000 * 3), // 3 days from now
      createdById: salesUser.id,
    },
  });

  const customer2 = await prisma.customer.create({
    data: {
      name: 'Bharat Wholesalers',
      mobile: '+919876543211',
      email: 'orders@bharatwholesale.com',
      businessName: 'Bharat Wholesale & Co',
      gstNumber: '27BBBBB1111B2Z4',
      customerType: 'WHOLESALE',
      address: '45 Industrial Area, Phase 2, Pune, MH',
      state: 'Maharashtra',
      status: 'ACTIVE',
      createdById: salesUser.id,
    },
  });

  const customer3 = await prisma.customer.create({
    data: {
      name: 'Capital Distributors',
      mobile: '+919876543212',
      email: 'info@capitaldist.com',
      businessName: 'Capital Distribution House',
      gstNumber: '27CCCCC2222C3Z3',
      customerType: 'DISTRIBUTOR',
      address: '88 Logistics Hub, Highway 4, Thane, MH',
      state: 'Gujarat',
      status: 'ACTIVE',
      createdById: salesUser.id,
    },
  });

  await prisma.customer.create({
    data: {
      name: 'Delta Enterprises',
      mobile: '+919876543213',
      email: 'support@deltaenterprises.com',
      businessName: 'Delta Traders',
      gstNumber: '27DDDDD3333D4Z2',
      customerType: 'RETAIL',
      address: '12 Market Yard, Nashik, MH',
      state: 'Maharashtra',
      status: 'INACTIVE',
      createdById: salesUser.id,
    },
  });

  await prisma.customer.create({
    data: {
      name: 'Elite Supplies',
      mobile: '+919876543214',
      email: 'procurement@elitesupplies.com',
      businessName: 'Elite Industrial Goods',
      gstNumber: '27EEEEE4444E5Z1',
      customerType: 'WHOLESALE',
      address: '99 MIDC Complex, Nagpur, MH',
      state: 'Madhya Pradesh',
      status: 'LEAD',
      followUpDate: new Date(Date.now() + 86400000 * 7),
      createdById: salesUser.id,
    },
  });

  // Seed Follow-up note for customer 1
  await prisma.followUpNote.create({
    data: {
      customerId: customer1.id,
      note: 'Initial inquiry regarding bulk purchase of Industrial Bolts and Helmets. Requested price list.',
      createdById: salesUser.id,
    },
  });

  console.log(`✅ Created 5 customers with follow-up notes and state fields.`);

  // 4. Create 10 Products with gstRates
  console.log('📦 Seeding Products...');
  const prod1 = await prisma.product.create({
    data: {
      name: 'Industrial Bolt Pack M8',
      sku: 'BOLT-M8-100',
      category: 'Fasteners',
      unitPrice: 450.00,
      currentStock: 150,
      minStockAlert: 20,
      location: 'Aisle 1 - Shelf B',
      gstRate: 18.00,
    },
  });

  const prod2 = await prisma.product.create({
    data: {
      name: 'Heavy Duty Safety Helmet',
      sku: 'HELMET-HD-01',
      category: 'Safety Equipment',
      unitPrice: 850.00,
      currentStock: 45,
      minStockAlert: 10,
      location: 'Aisle 3 - Shelf A',
      gstRate: 12.00,
    },
  });

  // Low Stock Product 1
  const prod3 = await prisma.product.create({
    data: {
      name: 'High Precision Digital Caliper',
      sku: 'CALIPER-DIG-02',
      category: 'Measurement Tools',
      unitPrice: 2400.00,
      currentStock: 5,
      minStockAlert: 10, // Stock (5) <= Alert (10)
      location: 'Aisle 2 - Shelf C',
      gstRate: 18.00,
    },
  });

  const prod4 = await prisma.product.create({
    data: {
      name: 'Electric Drill Machine 750W',
      sku: 'DRILL-750W',
      category: 'Power Tools',
      unitPrice: 3800.00,
      currentStock: 18,
      minStockAlert: 5,
      location: 'Aisle 4 - Shelf D',
      gstRate: 18.00,
    },
  });

  // Low Stock Product 2
  const prod5 = await prisma.product.create({
    data: {
      name: 'Stainless Steel Screws Set',
      sku: 'SCREW-SS-500',
      category: 'Fasteners',
      unitPrice: 650.00,
      currentStock: 2,
      minStockAlert: 25, // Stock (2) <= Alert (25)
      location: 'Aisle 1 - Shelf A',
      gstRate: 18.00,
    },
  });

  await prisma.product.createMany({
    data: [
      { name: 'Heavy Duty Work Gloves', sku: 'GLOVES-WORK-XL', category: 'Safety Equipment', unitPrice: 250.00, currentStock: 80, minStockAlert: 15, location: 'Aisle 3 - Shelf C', gstRate: 12.00 },
      { name: 'Hydraulic Floor Jack 3-Ton', sku: 'JACK-HYD-3T', category: 'Machinery', unitPrice: 6200.00, currentStock: 12, minStockAlert: 3, location: 'Aisle 5 - Bay 1', gstRate: 18.00 },
      { name: 'Industrial Safety Goggles', sku: 'GOGGLES-IND-01', category: 'Safety Equipment', unitPrice: 320.00, currentStock: 60, minStockAlert: 10, location: 'Aisle 3 - Shelf B', gstRate: 12.00 },
      { name: 'Angle Grinder 850W', sku: 'GRINDER-850W', category: 'Power Tools', unitPrice: 2900.00, currentStock: 22, minStockAlert: 5, location: 'Aisle 4 - Shelf B', gstRate: 18.00 },
      { name: 'Measuring Tape 10m', sku: 'TAPE-10M', category: 'Measurement Tools', unitPrice: 180.00, currentStock: 100, minStockAlert: 20, location: 'Aisle 2 - Shelf A', gstRate: 18.00 },
    ],
  });

  console.log(`✅ Created 10 products (including 2 low-stock alert items and GST rates).`);

  // 5. Create 2 Sample Sales Challans
  console.log('📄 Seeding Sales Challans...');

  const draftChallan = await prisma.salesChallan.create({
    data: {
      challanNumber: 'CH-2026-0001',
      customerId: customer1.id,
      status: 'DRAFT',
      totalQuantity: 5,
      totalAmount: 4250.00,
      createdById: salesUser.id,
      items: {
        create: [
          {
            productId: prod2.id,
            productNameSnapshot: prod2.name,
            skuSnapshot: prod2.sku,
            unitPriceSnapshot: prod2.unitPrice,
            quantity: 5,
            lineTotal: 4250.00,
          },
        ],
      },
    },
  });

  const confirmedChallan = await prisma.salesChallan.create({
    data: {
      challanNumber: 'CH-2026-0002',
      customerId: customer2.id,
      status: 'CONFIRMED',
      totalQuantity: 10,
      totalAmount: 4500.00,
      createdById: salesUser.id,
      items: {
        create: [
          {
            productId: prod1.id,
            productNameSnapshot: prod1.name,
            skuSnapshot: prod1.sku,
            unitPriceSnapshot: prod1.unitPrice,
            quantity: 10,
            lineTotal: 4500.00,
          },
        ],
      },
    },
  });

  await prisma.stockMovement.create({
    data: {
      productId: prod1.id,
      quantityChanged: 10,
      movementType: 'OUT',
      reason: `Sales challan confirmed: ${confirmedChallan.challanNumber}`,
      createdById: salesUser.id,
      referenceChallanId: confirmedChallan.id,
    },
  });

  console.log(`✅ Created 2 Sales Challans (CH-2026-0001 DRAFT, CH-2026-0002 CONFIRMED).`);

  // 6. Seed 3 Vendors (additive)
  console.log('🏭 Seeding Vendors...');
  const vendor1 = await prisma.vendor.create({
    data: {
      name: 'Industrial Supplies Co',
      contactPerson: 'Mr. Rajesh Kumar',
      phone: '+919988776655',
      email: 'sales@industrialsupplies.com',
      gstNumber: '27AAAAA5555A1Z1',
      address: 'Plot 12, MIDC, Andheri, Mumbai, MH',
    },
  });

  const vendor2 = await prisma.vendor.create({
    data: {
      name: 'Precision Tooling Ltd',
      contactPerson: 'Ms. Anita Deshmukh',
      phone: '+918877665544',
      email: 'info@precisiontools.in',
      gstNumber: '27BBBBB5555B2Z2',
      address: 'Phase III, Hinjewadi IT Park, Pune, MH',
    },
  });

  const vendor3 = await prisma.vendor.create({
    data: {
      name: 'Safety First Gear',
      contactPerson: 'Mr. Vinay Shah',
      phone: '+917766554433',
      email: 'support@safetyfirst.com',
      gstNumber: '24CCCCC5555C3Z3',
      address: 'GIDC Industrial Estate, Vadodara, GJ',
    },
  });

  console.log(`✅ Created 3 Vendors.`);

  // 7. Seed PO + Receipt for low-stock product
  console.log('📦 Seeding Purchase Orders & Receipts...');
  const po1 = await prisma.purchaseOrder.create({
    data: {
      poNumber: 'PO-2026-0001',
      vendorId: vendor2.id,
      status: 'RECEIVED',
      createdById: adminUser.id,
      items: {
        create: [
          {
            productId: prod3.id,
            productNameSnapshot: prod3.name,
            skuSnapshot: prod3.sku,
            quantityOrdered: 15,
            unitCost: 1800.00,
          },
        ],
      },
    },
  });

  const receipt1 = await prisma.purchaseReceipt.create({
    data: {
      poId: po1.id,
      vendorId: vendor2.id,
      receivedById: warehouseUser.id,
      items: {
        create: [
          {
            productId: prod3.id,
            quantityReceived: 15,
            unitCost: 1800.00,
          },
        ],
      },
    },
  });

  // Log incoming stock movement linking back to the purchase receipt
  await prisma.stockMovement.create({
    data: {
      productId: prod3.id,
      quantityChanged: 15,
      movementType: 'IN',
      reason: `Stock received against PO: ${po1.poNumber}`,
      createdById: warehouseUser.id,
      referencePurchaseReceiptId: receipt1.id,
    },
  });

  // Update currentStock for prod3
  await prisma.product.update({
    where: { id: prod3.id },
    data: { currentStock: prod3.currentStock + 15 },
  });

  console.log(`✅ Created PO-2026-0001 (RECEIVED) and linked receipt.`);

  // 8. Seed Invoice and Payment
  console.log('💳 Seeding Invoices & Payments...');
  // Challan subtotal = 4500.00, 18% GST (Maharashtra is COMPANY_HOME_STATE, customer is Maharashtra -> 9% CGST + 9% SGST)
  const subtotal = new Prisma.Decimal(4500.00);
  const cgstAmount = new Prisma.Decimal(405.00);
  const sgstAmount = new Prisma.Decimal(405.00);
  const igstAmount = new Prisma.Decimal(0.00);
  const totalAmount = new Prisma.Decimal(5310.00);

  const invoice1 = await prisma.invoice.create({
    data: {
      invoiceNumber: 'INV-2026-0001',
      challanId: confirmedChallan.id,
      customerId: customer2.id,
      subtotal,
      cgstAmount,
      sgstAmount,
      igstAmount,
      totalAmount,
      status: 'PARTIALLY_PAID',
      createdById: adminUser.id,
    },
  });

  await prisma.payment.create({
    data: {
      invoiceId: invoice1.id,
      amount: 2000.00,
      method: 'BANK_TRANSFER',
      paidAt: new Date(),
      recordedById: accountsUser.id,
    },
  });

  console.log(`✅ Created Invoice INV-2026-0001 (PARTIALLY_PAID) with payment.`);
  console.log('🎉 Database seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
