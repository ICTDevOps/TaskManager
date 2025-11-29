const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  // Check if admin already exists
  const existingAdmin = await prisma.user.findUnique({
    where: { username: 'admin' }
  });

  if (existingAdmin) {
    console.log('Admin user already exists, skipping seed.');
    return;
  }

  // Create default admin user
  const passwordHash = await bcrypt.hash('admin', 10);

  const admin = await prisma.user.create({
    data: {
      email: 'admin@taskmanager.local',
      username: 'admin',
      passwordHash,
      firstName: 'Admin',
      lastName: 'System',
      role: 'admin',
      mustChangePassword: true,
      isActive: true
    }
  });

  console.log('Default admin user created:');
  console.log('  Username: admin');
  console.log('  Password: admin');
  console.log('  (You must change this password on first login)');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
