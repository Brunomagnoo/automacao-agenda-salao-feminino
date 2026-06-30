const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
  if (admin) {
    const isValid = await bcrypt.compare('123456', admin.passwordHash);
    console.log('Password 123456 is valid:', isValid);

    // If not valid, let's just reset it to 123456
    if (!isValid) {
      console.log('Resetting password to 123456...');
      const newHash = await bcrypt.hash('123456', 10);
      await prisma.user.update({
        where: { id: admin.id },
        data: { passwordHash: newHash },
      });
      console.log('Password reset successfully!');
    }
  } else {
    console.log('Admin not found');
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
