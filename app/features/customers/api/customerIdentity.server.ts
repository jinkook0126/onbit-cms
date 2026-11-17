import { prisma } from '~/lib/db.server';

export function customerIdentityKey(name: string, phone: string): string {
  return `${name}\u0000${phone}`;
}

export async function readTakenCustomerKeys(
  companyId: string,
  customers: { name: string; phone: string }[],
): Promise<Set<string>> {
  const unique = new Map<string, { name: string; phone: string }>();
  for (const customer of customers) {
    unique.set(customerIdentityKey(customer.name, customer.phone), customer);
  }
  if (unique.size === 0) {
    return new Set();
  }

  const found = await prisma.customer.findMany({
    where: {
      companyId,
      OR: [...unique.values()].map((customer) => ({
        name: customer.name,
        phone: customer.phone,
      })),
    },
    select: { name: true, phone: true },
  });
  return new Set(found.map((customer) => customerIdentityKey(customer.name, customer.phone)));
}
