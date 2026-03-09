import { NestFactory } from '@nestjs/core';

import { DemoDataSeederService } from './demo-data-seeder.service';
import { DemoDataSeedersModule } from './demo-data-seeders.module';
import { AppModule } from '../app/app.module';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const demoModule = app.select(DemoDataSeedersModule);
  const seeder = demoModule.get(DemoDataSeederService);
  await seeder.seed();
  await app.close();
}

bootstrap()
  .then(() => {
    console.log('Demo seeding completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Demo seeding failed:', error);
    process.exit(1);
  });
