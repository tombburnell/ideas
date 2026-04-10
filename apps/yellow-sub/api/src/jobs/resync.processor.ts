import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { BillingProviderRegistry } from '../providers/billing/billing-provider.registry';

export type ResyncJob = { subscriptionId: string };

@Processor('billing')
export class ResyncProcessor extends WorkerHost {
  private readonly log = new Logger(ResyncProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly registry: BillingProviderRegistry,
  ) {
    super();
  }

  async process(job: Job<ResyncJob>): Promise<void> {
    if (job.name !== 'resync-subscription') return;
    const sub = await this.prisma.subscription.findUnique({
      where: { id: job.data.subscriptionId },
    });
    if (!sub) return;
    const adapter = this.registry.get(sub.provider);
    const remote = await adapter.fetchSubscription({
      providerAccountId: sub.providerAccountId,
      externalSubscriptionId: sub.externalSubscriptionId,
    });
    this.log.log(`Resynced ${sub.id} status=${remote.status}`);
    await this.prisma.subscription.update({
      where: { id: sub.id },
      data: {
        lastProviderSyncAt: new Date(),
        currentPeriodEnd: remote.currentPeriodEnd,
      },
    });
  }
}
