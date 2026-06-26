import { Processor } from '@nestjs/bull';

@Processor('blockchain')
export class BlockchainProcessor {}
