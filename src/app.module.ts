import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { RequestLoggerInterceptor } from './common/interceptors/request-logger.interceptor';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { PrismaModule } from './common/prisma/prisma.module';
import { RedisModule } from './common/redis/redis.module';
import configuration, { AppConfig } from './config/configuration';
import { validate } from './config/validation';
import { HealthController } from './health.controller';
import { AuthModule } from './modules/auth/auth.module';
import { BusinessesModule } from './modules/businesses/businesses.module';
import { ProductsModule } from './modules/products/products.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { CommentsModule } from './modules/comments/comments.module';
import { PostsModule } from './modules/posts/posts.module';
import { LocationsModule } from './modules/locations/locations.module';
import { OrdersModule } from './modules/orders/orders.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { BillingModule } from './modules/billing/billing.module';
import { DeliveryModule } from './modules/delivery/delivery.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      load: [configuration],
      validate,
    }),
    PrismaModule,
    LocationsModule,
    InventoryModule,
    DeliveryModule,
    BillingModule,
    OrdersModule,
    RedisModule,
    BusinessesModule,
    ProductsModule,
    CategoriesModule,
    PostsModule,
    CommentsModule,
    AuthModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      global: true,
      inject: [ConfigService],
      useFactory: (config: ConfigService<AppConfig, true>) => ({
        secret: config.get('jwt.secret', { infer: true }),
        signOptions: {
          expiresIn: config.get('jwt.accessExpires', { infer: true }),
        },
      }),
    }),
  ],
  controllers: [HealthController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: RequestLoggerInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: ResponseInterceptor,
    },
  ],
})
export class AppModule {}
