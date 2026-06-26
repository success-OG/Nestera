import { Injectable } from '@nestjs/common';
import { TransactionCategory } from './entities/transaction.entity';
import { LedgerTransaction } from '../blockchain/entities/transaction.entity';

/**
 * Simple rule-based auto-categorization service.
 * This is a lightweight starting point that can be replaced by an ML model later.
 */
@Injectable()
export class AutoCategorizationService {
  private keywordMap: Record<string, TransactionCategory> = {
    grocery: TransactionCategory.GROCERIES,
    supermarket: TransactionCategory.GROCERIES,
    starbucks: TransactionCategory.DINING,
    restaurant: TransactionCategory.DINING,
    uber: TransactionCategory.TRANSPORT,
    lyft: TransactionCategory.TRANSPORT,
    rent: TransactionCategory.RENT,
    salary: TransactionCategory.INCOME,
    paycheck: TransactionCategory.INCOME,
    amazon: TransactionCategory.SHOPPING,
  };

  predictCategory(metadata: Record<string, any> | undefined): TransactionCategory | null {
    if (!metadata) return null;

    // Look into common fields
    const searchable: string[] = [];

    if (typeof metadata.description === 'string')
      searchable.push(metadata.description);

    if (typeof metadata.memo === 'string') searchable.push(metadata.memo);

    if (typeof metadata.counterparty === 'string')
      searchable.push(metadata.counterparty);

    // Include merchant/name fields in metadata
    if (metadata?.merchant && typeof metadata.merchant === 'string') {
      searchable.push(metadata.merchant);
    }

    const haystack = searchable.join(' ').toLowerCase();

    for (const key of Object.keys(this.keywordMap)) {
      if (haystack.includes(key)) {
        return this.keywordMap[key];
      }
    }

    return null;
  }

  categorize(
    transaction: Pick<LedgerTransaction, 'metadata'>,
  ): { category: TransactionCategory; tags: string[] } | null {
    const category = this.predictCategory(transaction.metadata ?? undefined);
    if (!category) {
      return null;
    }

    return {
      category,
      tags: [category.toLowerCase().replace(/\s+/g, '-')],
    };
  }
}
