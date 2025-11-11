import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app/app.module';
import { SeedersModule } from './seeders.module';
import { SeederService } from './seeder.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const seedersModule = app.select(SeedersModule);
  const seeder = seedersModule.get(SeederService);
  await seeder.seed();
  await app.close();
}

bootstrap()
  .then(() => {
    console.log('Seeding completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Seeding failed:', error);
    process.exit(1);
  });

