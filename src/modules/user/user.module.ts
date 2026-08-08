import { Module, forwardRef } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProviderModule } from '../provider/provider.module';
import { PASSWORD_HASHER } from './application/ports/password-hasher.port';
import { AuthApplicationService } from './application/auth.application.service';
import { UsersApplicationService } from './application/users.application.service';
import { USER_REPOSITORY } from './domain/repositories/user.repository';
import { UserOrmEntity } from './infrastructure/persistence/entities/user.orm-entity';
import { TypeOrmUserRepository } from './infrastructure/persistence/repositories/typeorm-user.repository';
import { JwtAuthGuard } from './infrastructure/security/jwt-auth.guard';
import { ScryptPasswordHasher } from './infrastructure/security/scrypt-password-hasher';
import { AuthController } from './presentation/http/controllers/auth.controller';
import { UsersController } from './presentation/http/controllers/users.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserOrmEntity]),
    forwardRef(() => ProviderModule),
    JwtModule.register({
      secret: jwtSecret(),
      signOptions: {
        expiresIn: Number(process.env.AUTH_JWT_EXPIRES_IN_SECONDS ?? 3600),
      },
    }),
  ],
  controllers: [AuthController, UsersController],
  providers: [
    TypeOrmUserRepository,
    {
      provide: USER_REPOSITORY,
      useExisting: TypeOrmUserRepository,
    },
    {
      provide: PASSWORD_HASHER,
      useClass: ScryptPasswordHasher,
    },
    AuthApplicationService,
    UsersApplicationService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
  exports: [
    USER_REPOSITORY,
    PASSWORD_HASHER,
    AuthApplicationService,
    UsersApplicationService,
  ],
})
export class UserModule {}

function jwtSecret() {
  const configured = process.env.AUTH_JWT_SECRET?.trim();
  if (configured) {
    if (configured.length < 32) {
      throw new Error('AUTH_JWT_SECRET must contain at least 32 characters');
    }
    return configured;
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Missing required environment variable: AUTH_JWT_SECRET');
  }
  return 'petcare-local-development-secret-change-me';
}
