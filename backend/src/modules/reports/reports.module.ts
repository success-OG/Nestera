import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { ScheduledReportService } from './scheduled-report.service';
import { Transaction } from '../transactions/entities/transaction.entity';
import { SavingsProduct } from '../savings/entities/savings-product.entity';
import { User } from '../user/entities/user.entity';
import {
  ReportSchedule,
  ReportArchive,
} from './entities/report-schedule.entity';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    MailModule,
    TypeOrmModule.forFeature([
      Transaction,
      SavingsProduct,
      User,
      ReportSchedule,
      ReportArchive,
    ]),
  ],
  controllers: [ReportsController],
  providers: [ReportsService, ScheduledReportService],
  exports: [ReportsService, ScheduledReportService],
})
export class ReportsModule {}
