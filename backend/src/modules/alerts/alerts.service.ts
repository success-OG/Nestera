import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MailService } from '../mail/mail.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/entities/notification.entity';
import { SavingsProduct } from '../savings/entities/savings-product.entity';
import { User } from '../user/entities/user.entity';
import { CreateAlertDto } from './dto/create-alert.dto';
import { AlertHistory } from './entities/alert-history.entity';
import { AlertType, ProductAlert } from './entities/product-alert.entity';
import { ShutdownTrackedTask } from '../../common/decorators/shutdown-task.decorator';

@Injectable()
export class AlertsService {
  private readonly logger = new Logger(AlertsService.name);

  constructor(
    @InjectRepository(ProductAlert)
    private readonly alertRepository: Repository<ProductAlert>,
    @InjectRepository(AlertHistory)
    private readonly historyRepository: Repository<AlertHistory>,
    @InjectRepository(SavingsProduct)
    private readonly productRepository: Repository<SavingsProduct>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly notificationsService: NotificationsService,
    private readonly mailService: MailService,
  ) {}

  async createAlert(userId: string, dto: CreateAlertDto) {
    const payload = this.normalizeTemplate(dto);

    const alert = this.alertRepository.create({
      userId,
      type: payload.type,
      conditions: payload.conditions,
      isActive: true,
      snoozedUntil: null,
    });

    return this.alertRepository.save(alert);
  }

  async getUserAlerts(userId: string) {
    return this.alertRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  async getAlertHistory(userId: string) {
    return this.historyRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: 200,
    });
  }

  async snoozeAlert(userId: string, alertId: string, hours: number) {
    const alert = await this.alertRepository.findOne({
      where: { id: alertId, userId },
    });

    if (!alert) {
      throw new NotFoundException('Alert not found');
    }

    const snoozedUntil = new Date(Date.now() + hours * 60 * 60 * 1000);
    alert.snoozedUntil = snoozedUntil;

    return this.alertRepository.save(alert);
  }

  async disableAlert(userId: string, alertId: string) {
    const alert = await this.alertRepository.findOne({
      where: { id: alertId, userId },
    });

    if (!alert) {
      throw new NotFoundException('Alert not found');
    }

    alert.isActive = false;
    return this.alertRepository.save(alert);
  }

  alertTemplates() {
    return [
      {
        key: 'high-apy',
        type: AlertType.APY_THRESHOLD,
        conditions: { minApy: 8.5 },
      },
      {
        key: 'new-low-risk',
        type: AlertType.NEW_PRODUCT,
        conditions: { riskLevel: 'LOW' },
      },
    ];
  }

  // Periodic condition evaluator for product alerts.
  @ShutdownTrackedTask()
  @Cron(CronExpression.EVERY_10_MINUTES)
  async evaluateAlerts() {
    const now = new Date();
    const activeAlerts = await this.alertRepository.find({
      where: { isActive: true },
    });

    if (!activeAlerts.length) {
      return;
    }

    const products = await this.productRepository.find({
      where: { isActive: true },
      order: { createdAt: 'DESC' },
      take: 250,
    });

    for (const alert of activeAlerts) {
      if (alert.snoozedUntil && alert.snoozedUntil > now) {
        continue;
      }

      const match = this.findMatchingProduct(alert, products);
      if (!match) {
        continue;
      }

      const user = await this.userRepository.findOne({
        where: { id: alert.userId },
      });

      const message =
        alert.type === AlertType.APY_THRESHOLD
          ? `A savings product reached your APY target: ${match.name} at ${match.interestRate}% APY.`
          : `New savings product matched your watch: ${match.name}.`;

      await this.notificationsService.createNotification({
        userId: alert.userId,
        type: NotificationType.PRODUCT_ALERT_TRIGGERED,
        title: 'Savings product alert triggered',
        message,
        metadata: {
          alertId: alert.id,
          productId: match.id,
        },
      });

      if (user) {
        await this.mailService.sendSavingsAlertEmail(
          user.email,
          user.name || 'User',
          message,
        );
      }

      await this.historyRepository.save(
        this.historyRepository.create({
          alertId: alert.id,
          userId: alert.userId,
          channel: 'IN_APP',
          message,
          metadata: {
            productId: match.id,
            productName: match.name,
          },
        }),
      );

      await this.historyRepository.save(
        this.historyRepository.create({
          alertId: alert.id,
          userId: alert.userId,
          channel: 'EMAIL',
          message,
          metadata: {
            productId: match.id,
            productName: match.name,
          },
        }),
      );

      await this.historyRepository.save(
        this.historyRepository.create({
          alertId: alert.id,
          userId: alert.userId,
          channel: 'PUSH',
          message,
          metadata: {
            productId: match.id,
            productName: match.name,
            simulated: true,
          },
        }),
      );

      alert.snoozedUntil = new Date(Date.now() + 6 * 60 * 60 * 1000);
      await this.alertRepository.save(alert);
    }

    this.logger.log(`Evaluated ${activeAlerts.length} alerts`);
  }

  private normalizeTemplate(dto: CreateAlertDto): CreateAlertDto {
    if (dto.template === 'high-apy') {
      return {
        type: AlertType.APY_THRESHOLD,
        conditions: { minApy: 8.5 },
      };
    }

    if (dto.template === 'new-low-risk') {
      return {
        type: AlertType.NEW_PRODUCT,
        conditions: { riskLevel: 'LOW' },
      };
    }

    return dto;
  }

  private findMatchingProduct(alert: ProductAlert, products: SavingsProduct[]) {
    const conditions = alert.conditions || {};

    if (alert.type === AlertType.APY_THRESHOLD) {
      const minApy = Number(conditions['minApy'] || 0);
      return products.find((product) => Number(product.interestRate) >= minApy);
    }

    if (alert.type === AlertType.NEW_PRODUCT) {
      const riskLevel = String(conditions['riskLevel'] || 'LOW');
      const launchedAfter = conditions['launchedAfter']
        ? new Date(String(conditions['launchedAfter']))
        : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      return products.find(
        (product) =>
          String(product.riskLevel || 'LOW') === riskLevel &&
          new Date(product.createdAt) >= launchedAfter,
      );
    }

    return undefined;
  }
}
