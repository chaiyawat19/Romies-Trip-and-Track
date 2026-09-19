import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcryptjs';
import * as fs from 'fs';
import * as path from 'path';

const connectionString = process.env.DATABASE_URL;
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

const mockUsers = [
  {
    name: 'สมชาย สายเที่ยว (Somchai)',
    email: 'somchai@roamies.app',
    avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80',
  },
  {
    name: 'พิมพ์ใจ ชอบกิน (Pimjai)',
    email: 'pimjai@roamies.app',
    avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80',
  },
  {
    name: 'อเล็กซ์ ขาลุย (Alex Walker)',
    email: 'alex@roamies.app',
    avatarUrl: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=200&q=80',
  },
  {
    name: 'ณิชา ผู้จัดการเงิน (Nicha Finance)',
    email: 'nicha@roamies.app',
    avatarUrl: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=200&q=80',
  },
  {
    name: 'ต้นไม้ คนขับรถ (Tonmai Driver)',
    email: 'tonmai@roamies.app',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
  },
];

async function main() {
  console.log('🌱 Starting database seed for Users...');
  const defaultPasswordHash = await bcrypt.hash('password123', 10);

  for (const user of mockUsers) {
    const upsertedUser = await prisma.user.upsert({
      where: { email: user.email },
      update: {
        name: user.name,
        avatarUrl: user.avatarUrl,
        password: defaultPasswordHash,
      },
      create: {
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
        password: defaultPasswordHash,
      },
    });
    console.log(`✓ User upserted: ${upsertedUser.name} (${upsertedUser.email}) [ID: ${upsertedUser.id}]`);
  }

  const count = await prisma.user.count();
  console.log(`\n🎉 Seed completed for users! Total users in database: ${count}`);

  console.log('\n🌱 Starting database seed for 77 Provinces of Thailand...');
  const jsonPath = path.join(__dirname, '../src/common/data/provinces.json');
  const provincesRaw = fs.readFileSync(jsonPath, 'utf-8');
  const provinces = JSON.parse(provincesRaw);

  for (const province of provinces) {
    await prisma.province.upsert({
      where: { nameTh: province.nameTh },
      update: {
        nameEn: province.nameEn,
        region: province.region,
      },
      create: {
        nameTh: province.nameTh,
        nameEn: province.nameEn,
        region: province.region,
      },
    });
  }

  const provinceCount = await prisma.province.count();
  console.log(`🎉 Seed completed! Total provinces in database: ${provinceCount}`);
}

main()
  .catch((e) => {
    console.error('❌ Error during seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
