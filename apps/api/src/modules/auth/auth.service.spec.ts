import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { RefreshTokenStore } from './refresh-token.store';
import { PrismaService } from '../../prisma/prisma.service';

describe('AuthService', () => {
  let service: AuthService;

  const mockUsersService = {
    findByEmail: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
  };

  const mockPrismaService = {
    user: { create: jest.fn(), update: jest.fn() },
  };

  const mockJwtService = {
    signAsync: jest.fn().mockResolvedValue('mock_token'),
  };

  const mockRefreshTokenStore = {
    store: jest.fn(),
    exists: jest.fn(),
    remove: jest.fn(),
  };

  const configMap: Record<string, string> = {
    'jwt.accessSecret': 'access_secret',
    'jwt.refreshSecret': 'refresh_secret',
    'jwt.accessExpiresIn': '15m',
    'jwt.refreshExpiresIn': '7d',
    'google.clientId': 'google_client_id',
  };

  const mockConfigService = {
    get: jest.fn((key: string) => configMap[key]),
    getOrThrow: jest.fn((key: string) => configMap[key]),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: mockUsersService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: RefreshTokenStore, useValue: mockRefreshTokenStore },
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
