const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  try {
    const user = await prisma.user.findFirst({
      include: {
        plants: true,
        _count: { select: { plants: true } }
      }
    });
    
    console.log('✅ Schema check:');
    console.log('User has', user.plants.length, 'plants');
    console.log('Plants:', user.plants.map(p => ({ type: p.type, stage: p.stage })));
  } catch (e) {
    console.log('❌', e.message);
  } finally {
    await prisma.$disconnect();
  }
}

check();
