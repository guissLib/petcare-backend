import dataSource from '../data-source';
import { seedBaseData } from './base.seed';

async function run() {
  await dataSource.initialize();
  try {
    const adminId = await dataSource.transaction((manager) =>
      seedBaseData(manager),
    );
    console.log(`Base seed completed. Administrator: ${adminId}`);
  } finally {
    await dataSource.destroy();
  }
}

void run().catch((error: unknown) => {
  console.error('Base seed failed', error);
  process.exitCode = 1;
});
