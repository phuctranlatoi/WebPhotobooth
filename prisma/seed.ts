import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { createHash } from 'crypto';
import * as dotenv from 'dotenv';
dotenv.config();

const connectionString = `${process.env.DATABASE_URL}`;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const apiKey = process.env.BOOTH_API_KEY || "booth_1_secret_key";
  const pepper = process.env.BOOTH_KEY_PEPPER || 'random_pepper_for_booth_key_hash';
  const hash = createHash('sha256').update(apiKey + pepper).digest('hex');

  const booth = await prisma.booth.upsert({
    where: { api_key_hash: hash },
    update: {},
    create: {
      name: "Booth Demo",
      api_key_hash: hash,
      status: "ACTIVE"
    }
  });

  console.log("Created Booth:", booth.id);
  console.log("Your API Key to use in Android App is: booth_1_secret_key");
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
