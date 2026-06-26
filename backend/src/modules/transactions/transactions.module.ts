import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { TransactionsController } from './transactions.controller';
import { TransactionsService } from './transactions.service';
import { AutoCategorizationService } from './auto-categorization.service';
import { LedgerTransaction } from '../blockchain/entities/transaction.entity';
import { TransactionFormattingInterceptor } from '../../common/interceptors/transaction-formatting.interceptor';
import { TransactionSavedSearch } from './entities/transaction-saved-search.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([LedgerTransaction, TransactionSavedSearch]),
  ],
  controllers: [TransactionsController],
  providers: [
    TransactionsService,
    AutoCategorizationService,
    {
      provide: APP_INTERCEPTOR,
      useClass: TransactionFormattingInterceptor,
    },
  ],
  exports: [TransactionsService],
})
export class TransactionsModule {}
