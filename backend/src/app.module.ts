import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import configuration from './config/configuration';
import { PrismaModule } from './database/prisma.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './modules/auth/auth.module';
import { UsersRbacModule } from './modules/users-rbac/users-rbac.module';
import { PersonsModule } from './modules/persons/persons.module';
import { InteractionsModule } from './modules/interactions/interactions.module';
import { PublicApiModule } from './modules/public-api/public-api.module';
import { AiModule } from './modules/ai/ai.module';
import { LeadsModule } from './modules/leads/leads.module';
import { InboxModule } from './modules/inbox/inbox.module';
import { ProjectsModule } from './modules/projects/projects.module';
import { VendorsModule } from './modules/vendors/vendors.module';
import { CareersModule } from './modules/careers/careers.module';
import { AmbassadorsModule } from './modules/ambassadors/ambassadors.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    PrismaModule,
    AuthModule,
    UsersRbacModule,
    PersonsModule,
    InteractionsModule,
    PublicApiModule,
    AiModule,
    LeadsModule,
    InboxModule,
    ProjectsModule,
    VendorsModule,
    CareersModule,
    AmbassadorsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
