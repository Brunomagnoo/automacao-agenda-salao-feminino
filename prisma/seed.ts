import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create admin user (Byanca - Cabeleireira)
  const adminPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.upsert({
    where: { phone: '66999871535' },
    update: {},
    create: {
      uniqueCode: 'BS-0001',
      name: 'Byanca - Beauty Salon',
      phone: '66999871535',
      passwordHash: adminPassword,
      role: 'ADMIN',
    },
  });
  console.log(`✅ Admin created: ${admin.name} (${admin.uniqueCode})`);

  // Create services - Cabelo
  const cabeloServices = [
    { name: 'Corte', durationMin: 40, basePrice: 45.0, displayOrder: 1 },
    { name: 'Selagem com formol', durationMin: 210, basePrice: 150.0, displayOrder: 2 },
    { name: 'Selagem sem formol', durationMin: 210, basePrice: 150.0, displayOrder: 3 },
    { name: 'Botox', durationMin: 90, basePrice: 100.0, displayOrder: 4 },
    { name: 'Cauterização', durationMin: 60, basePrice: 140.0, displayOrder: 5 },
    { name: 'Ozônio terapia', durationMin: 90, basePrice: 150.0, displayOrder: 6 },
    { name: 'Cronogramas', durationMin: 90, basePrice: 260.0, displayOrder: 7 },
    { name: 'Mechas', durationMin: 390, basePrice: 400.0, displayOrder: 8 },
    { name: 'Coloração', durationMin: 90, basePrice: 75.0, displayOrder: 9 },
  ];

  for (const service of cabeloServices) {
    await prisma.service.upsert({
      where: { id: `cabelo-${service.displayOrder}` },
      update: { ...service, category: 'CABELO' },
      create: {
        id: `cabelo-${service.displayOrder}`,
        ...service,
        category: 'CABELO',
      },
    });
  }
  console.log(`✅ ${cabeloServices.length} serviços de cabelo criados`);

  // Create services - Manicure
  const manicureServices = [
    { name: 'Manicure simples', durationMin: 120, basePrice: 35.0, displayOrder: 10 },
    { name: 'Pedicure simples', durationMin: 120, basePrice: 35.0, displayOrder: 11 },
    { name: 'Manicure + Pedicure simples', durationMin: 120, basePrice: 60.0, displayOrder: 12 },
  ];

  for (const service of manicureServices) {
    await prisma.service.upsert({
      where: { id: `manicure-${service.displayOrder}` },
      update: { ...service, category: 'MANICURE' },
      create: {
        id: `manicure-${service.displayOrder}`,
        ...service,
        category: 'MANICURE',
      },
    });
  }
  console.log(`✅ ${manicureServices.length} serviços de manicure criados`);

  // Create time slots for the next 2 weeks (Terça a Sábado)
  const workingDays = [2, 3, 4, 5, 6]; // Terça=2 a Sábado=6
  const startSlots = [
    '13:30',
    '14:00',
    '14:30',
    '15:00',
    '15:30',
    '16:00',
    '16:30',
    '17:00',
    '17:30',
    '18:00',
    '18:30',
    '19:00',
    '19:30',
  ];

  const today = new Date();
  let slotsCreated = 0;

  for (let i = 1; i <= 14; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() + i);

    if (!workingDays.includes(date.getDay())) continue;

    const dateStr = date.toISOString().split('T')[0];

    for (const startTime of startSlots) {
      const [h, m] = startTime.split(':').map(Number);
      const endMinutes = h * 60 + m + 30;
      const endTime = `${String(Math.floor(endMinutes / 60)).padStart(2, '0')}:${String(endMinutes % 60).padStart(2, '0')}`;

      // Only create if end time is within working hours
      if (endMinutes <= 20 * 60) {
        await prisma.timeSlot.upsert({
          where: { id: `slot-${dateStr}-${startTime}` },
          update: {},
          create: {
            id: `slot-${dateStr}-${startTime}`,
            date: new Date(dateStr),
            startTime,
            endTime,
            isAvailable: true,
          },
        });
        slotsCreated++;
      }
    }
  }
  console.log(`✅ ${slotsCreated} slots de horário criados (próximas 2 semanas)`);

  console.log('\n🎉 Seed concluído com sucesso!');
}

main()
  .catch((e) => {
    console.error('❌ Erro no seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
