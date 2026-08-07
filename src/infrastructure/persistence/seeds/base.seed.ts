import { Email } from '../../../domain/value-objects/email.vo';
import { User } from '../../../domain/entities/user.entity';
import { ProviderOrmEntity } from '../entities/provider.orm-entity';
import { ProviderScheduleOrmEntity } from '../entities/provider-schedule.orm-entity';
import { ProviderServiceOrmEntity } from '../entities/provider-service.orm-entity';
import { PromotionOrmEntity } from '../entities/promotion.orm-entity';
import { PromotionServiceTypeOrmEntity } from '../entities/promotion-service-type.orm-entity';
import { UserOrmEntity } from '../entities/user.orm-entity';
import { hashWithScrypt } from '../../security/scrypt-password-hasher';
import type { EntityManager } from 'typeorm';

const ADMIN_ID = 'user_admin';

export async function seedBaseData(manager: EntityManager) {
  const admin = await seedAdmin(manager);
  await seedProviders(manager);
  await seedPromotion(manager);
  return admin.id;
}

async function seedAdmin(manager: EntityManager) {
  const email = requiredEnvironment('ADMIN_SEED_EMAIL').toLowerCase();
  const password = requiredEnvironment('ADMIN_SEED_PASSWORD');
  if (password.length < 12) {
    throw new Error('ADMIN_SEED_PASSWORD must have at least 12 characters');
  }

  const existing = await manager.getRepository(UserOrmEntity).findOne({
    where: { email },
  });
  if (existing && existing.role !== 'administrator') {
    throw new Error(
      `Cannot seed administrator: ${email} belongs to a non-administrator user`,
    );
  }
  const user = User.create({
    id: existing?.id ?? ADMIN_ID,
    name: process.env.ADMIN_SEED_NAME?.trim() || 'PetCare Administrator',
    email: Email.create(email).value,
    role: 'administrator',
    passwordHash: await hashWithScrypt(password),
    city: optionalEnvironment('ADMIN_SEED_CITY'),
    phone: optionalEnvironment('ADMIN_SEED_PHONE'),
    createdAt: existing?.createdAt.toISOString() ?? new Date().toISOString(),
  });

  await manager.getRepository(UserOrmEntity).save({
    id: user.id,
    name: user.toPrimitives().name,
    email: user.email,
    role: user.role,
    passwordHash: user.toPrimitives().passwordHash,
    city: user.toPrimitives().city ?? null,
    phone: user.toPrimitives().phone ?? null,
    createdAt: new Date(user.toPrimitives().createdAt),
  });
  return user;
}

async function seedProviders(manager: EntityManager) {
  const providers = [
    {
      id: 'provider_centro',
      name: 'PetCare Centro',
      type: 'employee',
      city: 'Bogotá',
      address: 'Calle 100 # 12-30',
      latitude: '4.6760000',
      longitude: '-74.0480000',
      capacity: 8,
      acceptsHomeVisits: true,
      services: ['grooming', 'veterinary', 'walking', 'home-visit'],
      schedule: [1, 2, 3, 4, 5, 6].map((dayOfWeek) => ({
        dayOfWeek,
        startTime: '08:00:00',
        endTime: '18:00:00',
      })),
    },
    {
      id: 'provider_norte',
      name: 'PetCare Norte',
      type: 'franchise',
      city: 'Medellín',
      address: 'Carrera 43A # 10-20',
      latitude: '6.2080000',
      longitude: '-75.5670000',
      capacity: 5,
      acceptsHomeVisits: false,
      services: ['grooming', 'boarding', 'veterinary'],
      schedule: [1, 2, 3, 4, 5].map((dayOfWeek) => ({
        dayOfWeek,
        startTime: '09:00:00',
        endTime: '17:00:00',
      })),
    },
  ];

  const providerRepository = manager.getRepository(ProviderOrmEntity);
  const serviceRepository = manager.getRepository(ProviderServiceOrmEntity);
  const scheduleRepository = manager.getRepository(ProviderScheduleOrmEntity);

  for (const provider of providers) {
    const existing = await providerRepository.findOne({
      where: { id: provider.id },
    });
    await providerRepository.save({
      id: provider.id,
      operatorUserId: existing?.operatorUserId ?? null,
      name: provider.name,
      type: provider.type,
      city: provider.city,
      address: provider.address,
      latitude: provider.latitude,
      longitude: provider.longitude,
      capacity: provider.capacity,
      acceptsHomeVisits: provider.acceptsHomeVisits,
    });

    await serviceRepository.delete({ providerId: provider.id });
    await serviceRepository.save(
      provider.services.map((serviceType) => ({
        providerId: provider.id,
        serviceType,
      })),
    );

    await scheduleRepository.delete({ providerId: provider.id });
    await scheduleRepository.save(
      provider.schedule.map((schedule) => ({
        providerId: provider.id,
        dayOfWeek: schedule.dayOfWeek,
        startTime: schedule.startTime,
        endTime: schedule.endTime,
      })),
    );
  }
}

async function seedPromotion(manager: EntityManager) {
  const promotionRepository = manager.getRepository(PromotionOrmEntity);
  await promotionRepository.save({
    id: 'promo_nacional_10',
    name: 'Bienvenida PetCare',
    description: 'Descuento nacional',
    discountPercent: '10.00',
    scope: 'national',
    city: null,
    providerId: null,
    startsAt: new Date('2020-01-01T00:00:00.000Z'),
    endsAt: new Date('2099-12-31T23:59:59.999Z'),
    active: true,
  });

  const services = manager.getRepository(PromotionServiceTypeOrmEntity);
  await services.delete({ promotionId: 'promo_nacional_10' });
}

function requiredEnvironment(name: string) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function optionalEnvironment(name: string) {
  const value = process.env[name]?.trim();
  return value || undefined;
}
