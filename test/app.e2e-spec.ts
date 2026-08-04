import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/ (GET)', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect('Hello World!');
  });

  it('creates a booking after a confirmed payment event', async () => {
    const userResponse = await request(app.getHttpServer())
      .post('/users')
      .send({
        name: 'Ana Pérez',
        email: 'ana-event@example.com',
        city: 'Bogotá',
      })
      .expect(201);
    const user = userResponse.body as { id: string };

    const petResponse = await request(app.getHttpServer())
      .post(`/users/${user.id}/pets`)
      .send({ name: 'Luna', species: 'dog' })
      .expect(201);
    const pet = petResponse.body as { id: string };

    const paymentResponse = await request(app.getHttpServer())
      .post('/payments')
      .send({
        amount: 45000,
        method: 'online',
        booking: {
          userId: user.id,
          petId: pet.id,
          providerId: 'provider_centro',
          serviceType: 'grooming',
          visitMode: 'at-location',
          scheduledAt: '2030-01-01T10:00:00.000Z',
        },
      })
      .expect(201);
    const payment = paymentResponse.body as {
      id: string;
      bookingStatus: string;
    };

    expect(payment.bookingStatus).toBe('queued');
    const bookingResponse = await request(app.getHttpServer())
      .get(`/bookings?paymentId=${payment.id}`)
      .expect(200);
    const bookings = bookingResponse.body as Array<{ payment: { id: string } }>;

    expect(bookings).toHaveLength(1);
    expect(bookings[0].payment.id).toBe(payment.id);
  });

  afterEach(async () => {
    await app.close();
  });
});
