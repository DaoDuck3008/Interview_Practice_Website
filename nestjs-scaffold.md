# Prompt: Dựng khung NestJS Backend — Interview Practice App

## Mục tiêu

Tạo bộ khung NestJS cho ứng dụng luyện phỏng vấn tiếng Việt.
Đây là **khung (scaffold)** — chưa cần implement business logic chi tiết,
nhưng phải đúng cấu trúc, đúng convention, chạy được ngay.

**Phạm vi lần này**: Auth, Users, Topics, Questions.
Module `interview` (Groq, DeepSeek, scoring) sẽ làm sau — **không tạo**.

---

## Monorepo structure

Project là monorepo, backend nằm trong thư mục `apps/api`:

```
interview-app/
├── apps/
│   ├── api/                    ← NestJS backend (TẠO Ở ĐÂY)
│   │   ├── src/
│   │   ├── test/
│   │   ├── .env
│   │   ├── .env.example
│   │   └── package.json
│   └── web/                    ← Next.js frontend (chưa cần tạo)
├── docker-compose.yml
└── package.json
```

Tạo NestJS app:
```bash
cd apps
nest new api --package-manager npm --skip-git
```

---

## Tech stack

```
Framework:   NestJS (latest)
Language:    TypeScript (strict mode)
ORM:         Prisma + PostgreSQL
Auth:        JWT Access Token + Refresh Token (@nestjs/jwt, @nestjs/passport)
Validation:  class-validator + class-transformer
Config:      @nestjs/config + Joi validation
Testing:     Jest (unit test)
```

---

## Cài đặt dependencies

```bash
npm install @nestjs/config @nestjs/jwt @nestjs/passport
npm install passport passport-jwt passport-local
npm install @prisma/client prisma
npm install class-validator class-transformer
npm install bcrypt
npm install joi

npm install -D @types/passport-jwt @types/passport-local @types/bcrypt

npx prisma init
```

---

## Cấu trúc thư mục `src/`

```
src/
├── main.ts
├── app.module.ts
│
├── common/
│   ├── decorators/
│   │   ├── current-user.decorator.ts
│   │   └── roles.decorator.ts
│   ├── guards/
│   │   ├── jwt-auth.guard.ts
│   │   └── roles.guard.ts
│   ├── filters/
│   │   └── http-exception.filter.ts
│   └── interceptors/
│       └── response.interceptor.ts
│
├── config/
│   └── configuration.ts
│
├── prisma/
│   ├── prisma.module.ts
│   └── prisma.service.ts
│
├── auth/
│   ├── auth.module.ts
│   ├── auth.controller.ts
│   ├── auth.service.ts
│   ├── strategies/
│   │   ├── jwt.strategy.ts
│   │   ├── jwt-refresh.strategy.ts
│   │   └── local.strategy.ts
│   └── dto/
│       ├── login.dto.ts
│       ├── register.dto.ts
│       └── refresh-token.dto.ts
│
├── users/
│   ├── users.module.ts
│   ├── users.service.ts
│   └── dto/
│       └── update-user.dto.ts
│
├── topics/
│   ├── topics.module.ts
│   ├── topics.controller.ts
│   ├── topics.service.ts
│   └── dto/
│       └── create-topic.dto.ts
│
└── questions/
    ├── questions.module.ts
    ├── questions.controller.ts
    ├── questions.service.ts
    └── dto/
        ├── create-question.dto.ts
        └── query-question.dto.ts
```

---

## Chi tiết từng file

### `main.ts`

```typescript
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  app.setGlobalPrefix('api/v1');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new ResponseInterceptor());

  app.enableCors({
    origin: config.get('FRONTEND_URL'),
    credentials: true,
  });

  await app.listen(config.get('PORT') ?? 3001);
}
bootstrap();
```

### `config/configuration.ts`

```typescript
import * as Joi from 'joi';

export const validationSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  PORT: Joi.number().default(3001),
  DATABASE_URL: Joi.string().required(),
  JWT_ACCESS_SECRET: Joi.string().required(),
  JWT_ACCESS_EXPIRES_IN: Joi.string().default('15m'),
  JWT_REFRESH_SECRET: Joi.string().required(),
  JWT_REFRESH_EXPIRES_IN: Joi.string().default('7d'),
  FRONTEND_URL: Joi.string().default('http://localhost:3000'),
});

export default () => ({
  port: parseInt(process.env.PORT ?? '3001', 10),
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET,
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? '15m',
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
  },
  frontendUrl: process.env.FRONTEND_URL,
});
```

### `app.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import configuration, { validationSchema } from './config/configuration';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { TopicsModule } from './topics/topics.module';
import { QuestionsModule } from './questions/questions.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validationSchema,
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    TopicsModule,
    QuestionsModule,
  ],
})
export class AppModule {}
```

### `prisma/prisma.service.ts`

```typescript
import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  async onModuleInit() {
    await this.$connect();
  }
}
```

### `prisma/prisma.module.ts`

```typescript
import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
```

### `common/decorators/current-user.decorator.ts`

```typescript
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
```

### `common/decorators/roles.decorator.ts`

```typescript
import { SetMetadata } from '@nestjs/common';
import { Role } from '@prisma/client';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
```

### `common/guards/jwt-auth.guard.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
```

### `common/guards/roles.guard.ts`

```typescript
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (!required) return true;
    const { user } = ctx.switchToHttp().getRequest();
    return required.includes(user.role);
  }
}
```

### `common/filters/http-exception.filter.ts`

```typescript
import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? exception.getResponse()
        : 'Internal server error';

    response.status(status).json({
      success: false,
      statusCode: status,
      message,
      timestamp: new Date().toISOString(),
    });
  }
}
```

### `common/interceptors/response.interceptor.ts`

```typescript
import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable, map } from 'rxjs';

@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  intercept(_ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      map((data) => ({
        success: true,
        data,
        timestamp: new Date().toISOString(),
      })),
    );
  }
}
```

### `auth/strategies/jwt.strategy.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: config.get('jwt.accessSecret'),
    });
  }

  async validate(payload: { sub: string; email: string; role: string }) {
    return { id: payload.sub, email: payload.email, role: payload.role };
  }
}
```

### `auth/strategies/jwt-refresh.strategy.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromBodyField('refreshToken'),
      secretOrKey: config.get('jwt.refreshSecret'),
      passReqToCallback: true,
    });
  }

  async validate(req: Request, payload: { sub: string; email: string }) {
    return { id: payload.sub, email: payload.email, refreshToken: req.body.refreshToken };
  }
}
```

### `auth/strategies/local.strategy.ts`

```typescript
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';
import { AuthService } from '../auth.service';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private authService: AuthService) {
    super({ usernameField: 'email' });
  }

  async validate(email: string, password: string) {
    const user = await this.authService.validateUser(email, password);
    if (!user) throw new UnauthorizedException('Email hoặc mật khẩu không đúng');
    return user;
  }
}
```

### `auth/dto/register.dto.ts`

```typescript
import { IsEmail, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @IsString()
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;
}
```

### `auth/dto/login.dto.ts`

```typescript
import { IsEmail, IsString } from 'class-validator';

export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  password: string;
}
```

### `auth/dto/refresh-token.dto.ts`

```typescript
import { IsString } from 'class-validator';

export class RefreshTokenDto {
  @IsString()
  refreshToken: string;
}
```

### `auth/auth.service.ts` (stub — implement logic sau)

```typescript
import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcrypt';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private config: ConfigService,
  ) {}

  async validateUser(email: string, password: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) return null;
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    return isMatch ? user : null;
  }

  async register(dto: RegisterDto) {
    const passwordHash = await bcrypt.hash(dto.password, 10);
    return this.usersService.create({ ...dto, passwordHash });
  }

  async login(user: { id: string; email: string; role: string }) {
    const payload = { sub: user.id, email: user.email, role: user.role };
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.config.get('jwt.accessSecret'),
        expiresIn: this.config.get('jwt.accessExpiresIn'),
      }),
      this.jwtService.signAsync(payload, {
        secret: this.config.get('jwt.refreshSecret'),
        expiresIn: this.config.get('jwt.refreshExpiresIn'),
      }),
    ]);
    return { accessToken, refreshToken };
  }

  async refresh(user: { id: string; email: string }) {
    const payload = { sub: user.id, email: user.email };
    const accessToken = await this.jwtService.signAsync(payload, {
      secret: this.config.get('jwt.accessSecret'),
      expiresIn: this.config.get('jwt.accessExpiresIn'),
    });
    return { accessToken };
  }
}
```

### `auth/auth.controller.ts`

```typescript
import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @UseGuards(AuthGuard('local'))
  @Post('login')
  login(@CurrentUser() user: any) {
    return this.authService.login(user);
  }

  @UseGuards(AuthGuard('jwt-refresh'))
  @Post('refresh')
  refresh(@CurrentUser() user: any) {
    return this.authService.refresh(user);
  }

  @Post('logout')
  logout() {
    // Stateless JWT — client tự xóa token
    return { message: 'Logged out' };
  }
}
```

### `auth/auth.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtRefreshStrategy } from './strategies/jwt-refresh.strategy';
import { LocalStrategy } from './strategies/local.strategy';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [UsersModule, PassportModule, JwtModule],
  providers: [AuthService, JwtStrategy, JwtRefreshStrategy, LocalStrategy],
  controllers: [AuthController],
})
export class AuthModule {}
```

### `users/users.service.ts` (stub)

```typescript
import { ConflictException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async findById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, name: true, role: true, createdAt: true },
    });
  }

  async create(data: { name: string; email: string; passwordHash: string }) {
    const exists = await this.findByEmail(data.email);
    if (exists) throw new ConflictException('Email đã được sử dụng');
    return this.prisma.user.create({
      data,
      select: { id: true, email: true, name: true, role: true, createdAt: true },
    });
  }
}
```

### `users/users.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { UsersService } from './users.service';

@Module({
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
```

### `topics/topics.service.ts` (stub)

```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TopicsService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.topic.findMany({ orderBy: { name: 'asc' } });
  }

  create(data: { slug: string; name: string }) {
    return this.prisma.topic.create({ data });
  }
}
```

### `topics/topics.controller.ts`

```typescript
import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { TopicsService } from './topics.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('topics')
export class TopicsController {
  constructor(private topicsService: TopicsService) {}

  @Get()
  findAll() {
    return this.topicsService.findAll();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Post()
  create(@Body() body: { slug: string; name: string }) {
    return this.topicsService.create(body);
  }
}
```

### `topics/topics.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { TopicsService } from './topics.service';
import { TopicsController } from './topics.controller';

@Module({
  providers: [TopicsService],
  controllers: [TopicsController],
})
export class TopicsModule {}
```

### `questions/dto/query-question.dto.ts`

```typescript
import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { Level } from '@prisma/client';

export class QueryQuestionDto {
  @IsOptional()
  @IsUUID()
  topicId?: string;

  @IsOptional()
  @IsEnum(Level)
  level?: Level;
}
```

### `questions/dto/create-question.dto.ts`

```typescript
import { IsArray, IsEnum, IsString, IsUUID } from 'class-validator';
import { Level } from '@prisma/client';

export class CreateQuestionDto {
  @IsUUID()
  topicId: string;

  @IsString()
  content: string;

  @IsString()
  answerKeySummary: string;

  @IsArray()
  @IsString({ each: true })
  answerKeywords: string[];

  @IsEnum(Level)
  level: Level;
}
```

### `questions/questions.service.ts` (stub)

```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateQuestionDto } from './dto/create-question.dto';
import { QueryQuestionDto } from './dto/query-question.dto';

@Injectable()
export class QuestionsService {
  constructor(private prisma: PrismaService) {}

  findAll(query: QueryQuestionDto) {
    return this.prisma.question.findMany({
      where: {
        isActive: true,
        ...(query.topicId && { topicId: query.topicId }),
        ...(query.level && { level: query.level }),
      },
      include: { topic: true },
    });
  }

  async findRandom(query: QueryQuestionDto) {
    const count = await this.prisma.question.count({
      where: {
        isActive: true,
        ...(query.topicId && { topicId: query.topicId }),
        ...(query.level && { level: query.level }),
      },
    });
    const skip = Math.floor(Math.random() * count);
    const results = await this.prisma.question.findMany({
      where: {
        isActive: true,
        ...(query.topicId && { topicId: query.topicId }),
        ...(query.level && { level: query.level }),
      },
      include: { topic: true },
      take: 1,
      skip,
    });
    return results[0] ?? null;
  }

  create(dto: CreateQuestionDto) {
    return this.prisma.question.create({ data: dto });
  }

  update(id: string, data: Partial<CreateQuestionDto>) {
    return this.prisma.question.update({ where: { id }, data });
  }
}
```

### `questions/questions.controller.ts`

```typescript
import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { QuestionsService } from './questions.service';
import { CreateQuestionDto } from './dto/create-question.dto';
import { QueryQuestionDto } from './dto/query-question.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('questions')
export class QuestionsController {
  constructor(private questionsService: QuestionsService) {}

  @Get()
  findAll(@Query() query: QueryQuestionDto) {
    return this.questionsService.findAll(query);
  }

  @Get('random')
  findRandom(@Query() query: QueryQuestionDto) {
    return this.questionsService.findRandom(query);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Post()
  create(@Body() dto: CreateQuestionDto) {
    return this.questionsService.create(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: Partial<CreateQuestionDto>) {
    return this.questionsService.update(id, dto);
  }
}
```

### `questions/questions.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { QuestionsService } from './questions.service';
import { QuestionsController } from './questions.controller';

@Module({
  providers: [QuestionsService],
  controllers: [QuestionsController],
})
export class QuestionsModule {}
```

---

## Prisma schema

Copy nội dung từ file `database-schema.md` vào `prisma/schema.prisma`, sau đó chạy:

```bash
npx prisma migrate dev --name init
npx prisma generate
```

---

## `.env.example`

```env
NODE_ENV=development
PORT=3001

DATABASE_URL="postgresql://postgres:postgres@localhost:5432/interview_db?schema=public"

JWT_ACCESS_SECRET=your_access_secret_here
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_SECRET=your_refresh_secret_here
JWT_REFRESH_EXPIRES_IN=7d

FRONTEND_URL=http://localhost:3000
```

---

## Unit test mẫu — `auth.service.spec.ts`

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

describe('AuthService', () => {
  let service: AuthService;

  const mockUsersService = {
    findByEmail: jest.fn(),
    create: jest.fn(),
  };

  const mockJwtService = {
    signAsync: jest.fn().mockResolvedValue('mock_token'),
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const map: Record<string, string> = {
        'jwt.accessSecret': 'access_secret',
        'jwt.refreshSecret': 'refresh_secret',
        'jwt.accessExpiresIn': '15m',
        'jwt.refreshExpiresIn': '7d',
      };
      return map[key];
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: mockUsersService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
```

---

## API Endpoints

```
AUTH
  POST   /api/v1/auth/register
  POST   /api/v1/auth/login
  POST   /api/v1/auth/refresh
  POST   /api/v1/auth/logout

TOPICS
  GET    /api/v1/topics
  POST   /api/v1/topics          [ADMIN only]

QUESTIONS
  GET    /api/v1/questions?topicId=&level=
  GET    /api/v1/questions/random?topicId=&level=
  POST   /api/v1/questions        [ADMIN only]
  PATCH  /api/v1/questions/:id    [ADMIN only]
```

---

## Checklist sau khi scaffold xong

- [ ] `npm run start:dev` chạy không lỗi
- [ ] `POST /api/v1/auth/register` tạo được user
- [ ] `POST /api/v1/auth/login` trả về `accessToken` + `refreshToken`
- [ ] `POST /api/v1/auth/refresh` trả về `accessToken` mới
- [ ] `GET /api/v1/topics` trả về array (dù rỗng)
- [ ] `GET /api/v1/questions/random` trả về null hoặc 1 câu hỏi
- [ ] `npm run test` pass
