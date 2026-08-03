import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PetcareStoreService } from '../../application/petcare-store.service';
import {
  createId,
  Input,
  now,
  optionalString,
  stringValue,
  required,
} from '../shared/input';
import { User } from '../shared/petcare.types';

@Injectable()
export class UsersDomainService {
  constructor(private readonly store: PetcareStoreService) {}

  create(input: Input) {
    required(input, ['name', 'email', 'city']);
    const email = stringValue(input, 'email').trim().toLowerCase();
    if (
      this.store.data.users.some((user) => user.email.toLowerCase() === email)
    ) {
      throw new BadRequestException('El email ya está registrado');
    }

    const user: User = {
      id: createId('user'),
      name: stringValue(input, 'name'),
      email,
      phone: optionalString(input, 'phone'),
      city: stringValue(input, 'city'),
      createdAt: now(),
    };
    this.store.data.users.push(user);
    void this.store.persist();
    return user;
  }

  loginWithEmail(input: Input) {
    required(input, ['email']);
    const email = stringValue(input, 'email').trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      throw new BadRequestException('email debe ser válido');
    }
    const existing = this.store.data.users.find(
      (user) => user.email.toLowerCase() === email,
    );
    if (!existing) {
      throw new NotFoundException('No existe un usuario con ese correo');
    }
    return existing;
  }

  list() {
    return this.store.data.users;
  }

  getById(userId: string) {
    const user = this.store.data.users.find((item) => item.id === userId);
    if (!user) throw new NotFoundException('Usuario no encontrado');
    return user;
  }
}
