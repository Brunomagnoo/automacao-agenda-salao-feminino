/**
 * Script de limpeza — remove todos os agendamentos e libera todos os horários.
 * Uso: node --env-file=.env.local scripts/cleanup-appointments.mjs
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔄 Iniciando limpeza do banco de dados...\n');

  // 1. Delete all AppointmentService join records first (FK dependency)
  const deletedServices = await prisma.appointmentService.deleteMany({});
  console.log(`✅ AppointmentService deletados: ${deletedServices.count}`);

  // 2. Delete all Appointments
  const deletedAppointments = await prisma.appointment.deleteMany({});
  console.log(`✅ Agendamentos deletados:        ${deletedAppointments.count}`);

  // 3. Delete all TimeSlots so they regenerate fresh on next visit
  const deletedSlots = await prisma.timeSlot.deleteMany({});
  console.log(`✅ Horários (TimeSlots) deletados: ${deletedSlots.count}`);

  console.log('\n🎉 Banco de dados limpo com sucesso!');
  console.log('   Os horários serão recriados automaticamente ao acessar o calendário.');
}

main()
  .catch((e) => {
    console.error('❌ Erro durante a limpeza:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
