const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const slots = await prisma.timeSlot.findMany({ where: { date: new Date('2026-07-21') }});
  console.log('Total slots on July 21:', slots.length);
  const counts = {};
  slots.forEach(s => counts[s.startTime] = (counts[s.startTime] || 0) + 1);
  console.log('Duplicates:', Object.entries(counts).filter(([k,v]) => v > 1));
}
main();
