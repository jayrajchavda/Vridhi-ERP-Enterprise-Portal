import { Prisma } from '@prisma/client';
import { prisma } from '../../db/prisma';
import { AppError } from '../../utils/AppError';
import { CreateCustomerInput, UpdateCustomerInput, QueryCustomerInput, CreateNoteInput, CreateInteractionInput } from './customer.schemas';

export class CustomerService {
  static async createCustomer(input: CreateCustomerInput, userId: string) {
    const existingMobile = await prisma.customer.findUnique({
      where: { mobile: input.mobile },
    });

    if (existingMobile) {
      throw new AppError(409, 'DUPLICATE_MOBILE', 'A customer with this mobile number already exists');
    }

    const customer = await prisma.customer.create({
      data: {
        name: input.name,
        mobile: input.mobile,
        email: input.email || null,
        businessName: input.businessName || null,
        gstNumber: input.gstNumber || null,
        customerType: input.customerType,
        address: input.address || null,
        state: input.state || null,
        status: input.status || 'LEAD',
        followUpDate: input.followUpDate ? new Date(input.followUpDate) : null,
        createdById: userId,
      },
    });

    return customer;
  }

  static async getCustomers(query: QueryCustomerInput) {
    const { page, limit, q, status, customerType, sortBy, order } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.CustomerWhereInput = {};

    if (status) {
      where.status = status;
    }

    if (customerType) {
      where.customerType = customerType;
    }

    if (q) {
      where.OR = [
        { name: { contains: q } },
        { mobile: { contains: q } },
        { businessName: { contains: q } },
        { email: { contains: q } },
      ];
    }

    const [total, data] = await Promise.all([
      prisma.customer.count({ where }),
      prisma.customer.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: order },
        include: {
          createdBy: {
            select: { id: true, name: true, email: true },
          },
        },
      }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  }

  static async getCustomerById(id: string) {
    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        createdBy: {
          select: { id: true, name: true, email: true },
        },
        followUpNotes: {
          orderBy: { createdAt: 'desc' },
          include: {
            createdBy: {
              select: { id: true, name: true },
            },
          },
        },
        challans: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            challanNumber: true,
            status: true,
            totalQuantity: true,
            totalAmount: true,
            createdAt: true,
          },
        },
      },
    });

    if (!customer) {
      throw new AppError(404, 'CUSTOMER_NOT_FOUND', `Customer with ID '${id}' not found`);
    }

    return customer;
  }

  static async updateCustomer(id: string, input: UpdateCustomerInput) {
    const existing = await prisma.customer.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError(404, 'CUSTOMER_NOT_FOUND', `Customer with ID '${id}' not found`);
    }

    if (input.mobile && input.mobile !== existing.mobile) {
      const duplicateMobile = await prisma.customer.findUnique({
        where: { mobile: input.mobile },
      });
      if (duplicateMobile) {
        throw new AppError(409, 'DUPLICATE_MOBILE', 'A customer with this mobile number already exists');
      }
    }

    const updated = await prisma.customer.update({
      where: { id },
      data: {
        ...(input.name !== undefined && { name: input.name }),
        ...(input.mobile !== undefined && { mobile: input.mobile }),
        ...(input.email !== undefined && { email: input.email || null }),
        ...(input.businessName !== undefined && { businessName: input.businessName || null }),
        ...(input.gstNumber !== undefined && { gstNumber: input.gstNumber || null }),
        ...(input.customerType !== undefined && { customerType: input.customerType }),
        ...(input.address !== undefined && { address: input.address || null }),
        ...(input.state !== undefined && { state: input.state || null }),
        ...(input.status !== undefined && { status: input.status }),
        ...(input.followUpDate !== undefined && {
          followUpDate: input.followUpDate ? new Date(input.followUpDate) : null,
        }),
      },
    });

    return updated;
  }

  static async deleteCustomer(id: string) {
    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        _count: {
          select: { challans: true },
        },
      },
    });

    if (!customer) {
      throw new AppError(404, 'CUSTOMER_NOT_FOUND', `Customer with ID '${id}' not found`);
    }

    if (customer._count.challans > 0) {
      throw new AppError(
        409,
        'CUSTOMER_HAS_CHALLANS',
        `Cannot delete customer with ${customer._count.challans} existing sales challans`
      );
    }

    await prisma.customer.delete({ where: { id } });
    return { message: 'Customer deleted successfully' };
  }

  static async addNote(customerId: string, input: CreateNoteInput, userId: string) {
    const customer = await prisma.customer.findUnique({ where: { id: customerId } });
    if (!customer) {
      throw new AppError(404, 'CUSTOMER_NOT_FOUND', `Customer with ID '${customerId}' not found`);
    }

    const note = await prisma.followUpNote.create({
      data: {
        customerId,
        note: input.note,
        createdById: userId,
      },
      include: {
        createdBy: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return note;
  }

  static async getNotes(customerId: string) {
    const customer = await prisma.customer.findUnique({ where: { id: customerId } });
    if (!customer) {
      throw new AppError(404, 'CUSTOMER_NOT_FOUND', `Customer with ID '${customerId}' not found`);
    }

    const notes = await prisma.followUpNote.findMany({
      where: { customerId },
      orderBy: { createdAt: 'desc' },
      include: {
        createdBy: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return notes;
  }

  static async getFollowUps(range: 'overdue' | 'today' | 'upcoming') {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
    sevenDaysFromNow.setHours(23, 59, 59, 999);

    const where: Prisma.CustomerWhereInput = {};

    if (range === 'overdue') {
      where.followUpDate = { lt: startOfToday };
    } else if (range === 'today') {
      where.followUpDate = { gte: startOfToday, lte: endOfToday };
    } else if (range === 'upcoming') {
      where.followUpDate = { gt: endOfToday, lte: sevenDaysFromNow };
    }

    const data = await prisma.customer.findMany({
      where,
      orderBy: { followUpDate: 'asc' },
      select: {
        id: true,
        name: true,
        mobile: true,
        businessName: true,
        status: true,
        followUpDate: true,
        interactions: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { notes: true, createdAt: true },
        },
      },
    });

    return data.map((c) => ({
      id: c.id,
      name: c.name,
      mobile: c.mobile,
      businessName: c.businessName,
      status: c.status,
      followUpDate: c.followUpDate,
      lastInteraction: c.interactions[0] || null,
    }));
  }

  static async createInteraction(customerId: string, input: CreateInteractionInput, userId: string) {
    const customer = await prisma.customer.findUnique({ where: { id: customerId } });
    if (!customer) {
      throw new AppError(404, 'CUSTOMER_NOT_FOUND', `Customer with ID '${customerId}' not found`);
    }

    return prisma.$transaction(async (tx) => {
      const interaction = await tx.customerInteraction.create({
        data: {
          customerId,
          type: input.type,
          notes: input.notes,
          createdById: userId,
        },
      });

      if (input.nextFollowUpDate !== undefined) {
        await tx.customer.update({
          where: { id: customerId },
          data: {
            followUpDate: input.nextFollowUpDate ? new Date(input.nextFollowUpDate) : null,
          },
        });
      }

      return interaction;
    });
  }

  static async getInteractions(customerId: string, query: { page: number; limit: number }) {
    const { page, limit } = query;
    const skip = (page - 1) * limit;

    const customer = await prisma.customer.findUnique({ where: { id: customerId } });
    if (!customer) {
      throw new AppError(404, 'CUSTOMER_NOT_FOUND', `Customer with ID '${customerId}' not found`);
    }

    const [total, data] = await Promise.all([
      prisma.customerInteraction.count({ where: { customerId } }),
      prisma.customerInteraction.findMany({
        where: { customerId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          createdBy: { select: { id: true, name: true, email: true } },
        },
      }),
    ]);

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }
}
