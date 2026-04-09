import { Injectable } from '@nestjs/common';
import { PlanStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export type CatalogFilters = {
  currency?: string;
  region?: string;
  tags?: string[];
};

@Injectable()
export class CatalogService {
  constructor(private readonly prisma: PrismaService) {}

  async getCatalog(tenantId: string, filters: CatalogFilters) {
    const wherePlan: Prisma.PlanWhereInput = {
      tenantId,
      active: true,
      status: PlanStatus.ACTIVE,
      isPublic: true,
    };
    const families = await this.prisma.productFamily.findMany({
      where: { tenantId, active: true },
      orderBy: { sortOrder: 'asc' },
      include: {
        plans: {
          where: wherePlan,
          orderBy: { sortOrder: 'asc' },
          include: {
            prices: {
              where: { active: true },
            },
            features: { include: { feature: true } },
            quotas: true,
            tags: true,
          },
        },
      },
    });
    return families.map((f) => ({
      ...f,
      plans: f.plans.map((p) => this.filterPlan(p, filters)),
    }));
  }

  private filterPlan<
    T extends {
      prices: Array<{ currency: string; regionCode: string | null; regionScopeType: string }>;
      tags: Array<{ tag: string }>;
    },
  >(plan: T, filters: CatalogFilters): T {
    let prices = plan.prices;
    if (filters.currency) {
      prices = prices.filter((x) => x.currency === filters.currency);
    }
    if (filters.region) {
      prices = prices.filter(
        (x) =>
          x.regionScopeType === 'GLOBAL' ||
          (x.regionCode != null && x.regionCode === filters.region),
      );
    }
    if (filters.tags?.length) {
      const planTags = new Set(plan.tags.map((t) => t.tag));
      const ok = filters.tags.some((t) => planTags.has(t));
      if (!ok && filters.tags.length > 0) {
        return { ...plan, prices: [] };
      }
    }
    return { ...plan, prices };
  }

  async getPlans(tenantId: string, filters: CatalogFilters) {
    const catalog = await this.getCatalog(tenantId, filters);
    return catalog.flatMap((f) => f.plans);
  }

  async getPlanByKey(tenantId: string, planKey: string, filters: CatalogFilters) {
    const plan = await this.prisma.plan.findFirst({
      where: { tenantId, key: planKey, active: true },
      include: {
        productFamily: true,
        prices: { where: { active: true } },
        features: { include: { feature: true } },
        quotas: true,
        tags: true,
      },
    });
    if (!plan) return null;
    return this.filterPlan(plan, filters);
  }

  async getPlanComparison(tenantId: string, filters: CatalogFilters) {
    const plans = await this.getPlans(tenantId, filters);
    return {
      plans: plans.map((p) => ({
        key: p.key,
        name: p.name,
        description: p.description,
        comparisonData: p.comparisonData,
        marketingCopy: p.marketingCopy,
        features: p.features,
        quotas: p.quotas,
        prices: p.prices,
        tags: p.tags,
      })),
    };
  }
}
