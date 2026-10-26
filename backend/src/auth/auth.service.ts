import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { QueryFailedError } from 'typeorm';
import { UsersService } from '../users/users.service';

const KEY_LENGTH = 64;

function deriveKey(password: string, salt: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, KEY_LENGTH, (error, derivedKey) => {
      if (error) {
        reject(error);
      } else {
        resolve(derivedKey);
      }
    });
  });
}

function isUniqueConstraintViolation(error: unknown): boolean {
  if (!(error instanceof QueryFailedError)) {
    return false;
  }

  const driverError: unknown = error.driverError;
  return (
    typeof driverError === 'object' &&
    driverError !== null &&
    'code' in driverError &&
    driverError.code === '23505'
  );
}

@Injectable()
export class AuthService {
  constructor(private readonly usersService: UsersService) {}

  async register(name: string, email: string, password: string) {
    if (await this.usersService.findByEmail(email)) {
      throw new ConflictException('An account with this email already exists');
    }

    const salt = randomBytes(32).toString('hex');
    const passwordHash = `scrypt:${salt}:${(await deriveKey(password, salt)).toString('hex')}`;

    try {
      const user = await this.usersService.create(name, email, passwordHash);
      return this.toPublicUser(user);
    } catch (error) {
      if (isUniqueConstraintViolation(error)) {
        throw new ConflictException(
          'An account with this email already exists',
        );
      }
      throw error;
    }
  }

  async login(email: string, password: string) {
    const user = await this.usersService.findByEmailWithHash(email);
    if (!user || !(await this.verifyPassword(password, user.passwordHash))) {
      throw new UnauthorizedException('Invalid email or password');
    }

    return this.toPublicUser(user);
  }

  async getCurrentUser(userId: number) {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new UnauthorizedException('Session user no longer exists');
    }

    return this.toPublicUser(user);
  }

  private async verifyPassword(password: string, storedHash: string) {
    const [algorithm, salt, expectedHash, ...extra] = storedHash.split(':');
    if (
      algorithm !== 'scrypt' ||
      !salt ||
      !expectedHash ||
      extra.length > 0 ||
      !/^[a-f\d]{128}$/i.test(expectedHash)
    ) {
      return false;
    }

    const expected = Buffer.from(expectedHash, 'hex');
    const actual = await deriveKey(password, salt);
    return (
      actual.length === expected.length && timingSafeEqual(actual, expected)
    );
  }

  private toPublicUser(user: {
    id: number;
    name: string;
    email: string;
    createdAt: Date;
  }) {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt,
    };
  }
}
