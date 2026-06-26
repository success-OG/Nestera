import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Transaction,
  TxType,
} from '../transactions/entities/transaction.entity';
import { SavingsProduct } from '../savings/entities/savings-product.entity';
import { User } from '../user/entities/user.entity';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const PDFDocument = require('pdfkit');

interface ProductBreakdown {
  productId: string | null;
  productName: string;
  interest: number;
  deposits: number;
  withdrawals: number;
  gains: number;
}

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  constructor(
    @InjectRepository(Transaction)
    private readonly txRepo: Repository<Transaction>,
    @InjectRepository(SavingsProduct)
    private readonly productRepo: Repository<SavingsProduct>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly configService: ConfigService,
  ) {}

  private ensureStorageDir() {
    const base = path.resolve(
      __dirname,
      '..',
      '..',
      '..',
      'uploads',
      'tax-reports',
    );
    if (!fs.existsSync(base)) fs.mkdirSync(base, { recursive: true });
    return base;
  }

  private encryptBuffer(buffer: Buffer): { data: Buffer; iv: Buffer } {
    const key = this.configService.get<string>('TAX_REPORT_KEY');
    if (!key) throw new BadRequestException('TAX_REPORT_KEY not set');
    const keyBuf = crypto.createHash('sha256').update(key).digest();
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', keyBuf, iv);
    const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);
    const tag = cipher.getAuthTag();
    return { data: Buffer.concat([iv, tag, encrypted]), iv };
  }

  async generateTaxReportCSV(userId: string, year: number): Promise<Buffer> {
    const start = new Date(Date.UTC(year, 0, 1, 0, 0, 0));
    const end = new Date(Date.UTC(year + 1, 0, 1, 0, 0, 0));

    const txs = await this.txRepo.find({
      where: { userId },
      order: { createdAt: 'ASC' },
    });

    const filtered = txs.filter(
      (t) => t.createdAt >= start && t.createdAt < end,
    );

    const products = new Map<string, ProductBreakdown>();

    for (const t of filtered) {
      const pid = t.poolId ?? 'unspecified';
      if (!products.has(pid)) {
        const prod = await this.productRepo
          .findOneBy({ id: pid })
          .catch(() => null as any);
        products.set(pid, {
          productId: pid === 'unspecified' ? null : pid,
          productName: prod?.name ?? pid,
          interest: 0,
          deposits: 0,
          withdrawals: 0,
          gains: 0,
        });
      }
      const entry = products.get(pid)!;
      const amt = Number(t.amount || 0);
      if (t.type === TxType.YIELD) entry.interest += amt;
      else if (t.type === TxType.DEPOSIT) entry.deposits += amt;
      else if (t.type === TxType.WITHDRAW) entry.withdrawals += amt;
    }

    // Basic capital gains calculation per product: realized gains = withdrawals - deposits
    for (const entry of products.values()) {
      entry.gains = Number((entry.withdrawals - entry.deposits).toFixed(7));
    }

    // Build CSV
    const rows: string[] = [];
    rows.push('productId,productName,interest,deposits,withdrawals,gains');
    for (const v of products.values()) {
      rows.push(
        `${v.productId ?? ''},"${v.productName.replace(/"/g, '""')}",${v.interest},${v.deposits},${v.withdrawals},${v.gains}`,
      );
    }

    return Buffer.from(rows.join('\n'));
  }

  async generate1099CSV(userId: string, year: number): Promise<Buffer> {
    // Build a more realistic 1099-INT style CSV with common fields.
    // We keep this simplified and non-authoritative, but structured.
    const start = new Date(Date.UTC(year, 0, 1));
    const end = new Date(Date.UTC(year + 1, 0, 1));
    const txs = await this.txRepo.find({ where: { userId } });
    const filtered = txs.filter(
      (t) =>
        t.createdAt >= start && t.createdAt < end && t.type === TxType.YIELD,
    );
    const interest = filtered.reduce((s, t) => s + Number(t.amount || 0), 0);

    const user = await this.userRepo
      .findOne({ where: { id: userId } })
      .catch(() => null as any);

    // Payer details can be supplied via config for realistic CSVs
    const payerName =
      this.configService.get<string>('TAX_PAYER_NAME') ?? 'Nestera Inc';
    const payerTin = this.configService.get<string>('TAX_PAYER_TIN') ?? '';

    const recipientName = (user && (user.name || user.email)) ?? '';
    const recipientTin = (user && (user.tin || '')) ?? '';
    const accountNumber = (user && (user.accountNumber || '')) ?? '';

    const headers = [
      'payer_name',
      'payer_tin',
      'recipient_name',
      'recipient_tin',
      'recipient_account_number',
      'year',
      'interest_income',
      'federal_tax_withheld',
    ];

    // We'll leave federal_tax_withheld empty for now (could be added later)
    const row = [
      payerName,
      payerTin,
      recipientName,
      recipientTin,
      accountNumber,
      String(year),
      String(interest),
      '',
    ];

    return Buffer.from(
      headers.join(',') +
        '\n' +
        row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',') +
        '\n',
    );
  }

  async generatePdfBufferFromText(
    title: string,
    lines: string[],
  ): Promise<Buffer> {
    // kept for backward compatibility; create simple PDF
    const doc = new PDFDocument({ size: 'A4', margin: 40 });
    const chunks: Buffer[] = [];
    doc.on('data', (c) => chunks.push(c));
    doc.fontSize(16).text(title, { align: 'center' });
    doc.moveDown();
    doc.fontSize(10);
    for (const line of lines) {
      doc.text(line);
    }
    doc.end();
    return new Promise((res) =>
      doc.on('end', () => res(Buffer.concat(chunks))),
    );
  }

  async generatePdfReport(
    userId: string,
    year: number,
    products: Map<string, ProductBreakdown>,
  ): Promise<Buffer> {
    const doc = new PDFDocument({ size: 'A4', margin: 40 });
    const chunks: Buffer[] = [];
    doc.on('data', (c) => chunks.push(c));

    // Title
    doc.fontSize(18).text(`Savings Tax Report — ${year}`, { align: 'center' });
    doc.moveDown(0.5);

    // Summary
    let totalInterest = 0;
    let totalDeposits = 0;
    let totalWithdrawals = 0;
    let totalGains = 0;
    for (const v of products.values()) {
      totalInterest += v.interest;
      totalDeposits += v.deposits;
      totalWithdrawals += v.withdrawals;
      totalGains += v.gains ?? 0;
    }

    doc.fontSize(12).text('Summary', { underline: true });
    doc.moveDown(0.2);
    doc.fontSize(10).text(`Total interest: ${totalInterest.toFixed(7)}`);
    doc
      .fontSize(10)
      .text(`Total deposits (cost basis): ${totalDeposits.toFixed(7)}`);
    doc
      .fontSize(10)
      .text(`Total withdrawals (realized): ${totalWithdrawals.toFixed(7)}`);
    doc.fontSize(10).text(`Estimated capital gains: ${totalGains.toFixed(7)}`);
    doc.moveDown(0.6);

    // Breakdown table header
    doc.fontSize(12).text('Breakdown by Savings Product', { underline: true });
    doc.moveDown(0.2);

    // table columns
    const tableTop = doc.y;
    const colWidths = [150, 80, 80, 80, 80];
    doc.fontSize(10);
    // Header row
    doc.text('Product', { continued: true, width: colWidths[0] });
    doc.text('Interest', {
      continued: true,
      width: colWidths[1],
      align: 'right',
    });
    doc.text('Deposits', {
      continued: true,
      width: colWidths[2],
      align: 'right',
    });
    doc.text('Withdrawals', {
      continued: true,
      width: colWidths[3],
      align: 'right',
    });
    doc.text('Gains', { width: colWidths[4], align: 'right' });
    doc.moveDown(0.2);

    for (const v of products.values()) {
      doc.text(v.productName, { continued: true, width: colWidths[0] });
      doc.text(v.interest.toFixed(7), {
        continued: true,
        width: colWidths[1],
        align: 'right',
      });
      doc.text(v.deposits.toFixed(7), {
        continued: true,
        width: colWidths[2],
        align: 'right',
      });
      doc.text(v.withdrawals.toFixed(7), {
        continued: true,
        width: colWidths[3],
        align: 'right',
      });
      doc.text((v.gains ?? 0).toFixed(7), {
        width: colWidths[4],
        align: 'right',
      });
      doc.moveDown(0.1);
    }

    doc.end();
    return new Promise((res) =>
      doc.on('end', () => res(Buffer.concat(chunks))),
    );
  }

  async saveEncrypted(buffer: Buffer, filenameBase: string): Promise<string> {
    const dir = this.ensureStorageDir();
    const { data } = this.encryptBuffer(buffer);
    const filePath = path.join(dir, `${filenameBase}.enc`);
    fs.writeFileSync(filePath, data);
    this.logger.log(`Saved encrypted tax report to ${filePath}`);
    return filePath;
  }

  // Public method used by controller
  async buildAndStoreTaxReport(
    userId: string,
    year: number,
    opts: { format?: string; irs1099?: boolean },
  ) {
    const fmt = opts.format ?? 'csv';
    let buffer: Buffer;
    let filenameBase = `taxreport_${userId}_${year}_${Date.now()}`;

    if (opts.irs1099) {
      buffer = await this.generate1099CSV(userId, year);
      filenameBase += '_1099';
    } else if (fmt === 'csv') {
      buffer = await this.generateTaxReportCSV(userId, year);
    } else if (fmt === 'pdf') {
      // For PDF, build structured data and render a formatted PDF
      const csvBuf = await this.generateTaxReportCSV(userId, year);
      // Reconstruct products map by parsing the CSV (cheap reuse) - header + rows
      const csv = csvBuf.toString().split('\n');
      const header = csv[0] ?? '';
      const rows = csv.slice(1).filter(Boolean);
      const products = new Map<string, any>();
      for (const r of rows) {
        // naive CSV split by comma taking into account quoted name
        const parts = r.match(
          /^(.*?),"?(.*?)"?,([0-9.+-eE]+),([0-9.+-eE]+),([0-9.+-eE]+),([0-9.+-eE]+)$/,
        );
        if (!parts) continue;
        const pid = parts[1] || 'unspecified';
        products.set(pid, {
          productId: pid || null,
          productName: parts[2],
          interest: Number(parts[3]),
          deposits: Number(parts[4]),
          withdrawals: Number(parts[5]),
          gains: Number(parts[6]),
        });
      }
      buffer = await this.generatePdfReport(userId, year, products);
      filenameBase += '.pdf';
    } else {
      // default to CSV
      buffer = await this.generateTaxReportCSV(userId, year);
    }

    const storedPath = await this.saveEncrypted(buffer, filenameBase);
    return { path: storedPath, filename: filenameBase };
  }
}
