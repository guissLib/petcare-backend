import { BusinessRuleError } from '../../../shared-kernel/domain/shared/errors/domain-error';
import type {
  DiscountType,
  PromotionPrimitives,
  ServiceType,
} from '../../../shared-kernel/domain/shared/types';

export interface NewPromotionProps {
  id: string;
  name: string;
  description: string;
  discountType: DiscountType;
  discountValue: number;
  scope: 'national' | 'local';
  city?: string;
  providerId?: string;
  serviceTypes?: ServiceType[];
  startsAt: string;
  endsAt: string;
  active: boolean;
}

export class Promotion {
  private constructor(private readonly props: PromotionPrimitives) {}

  static create(input: NewPromotionProps) {
    if (!input.name?.trim() || !input.description?.trim()) {
      throw new BusinessRuleError('name y description son requeridos');
    }
    if (input.discountType !== 'percent' && input.discountType !== 'fixed') {
      throw new BusinessRuleError('discountType debe ser percent o fixed');
    }
    if (
      !Number.isFinite(input.discountValue) ||
      input.discountValue <= 0 ||
      (input.discountType === 'percent' && input.discountValue > 100)
    ) {
      throw new BusinessRuleError(
        input.discountType === 'percent'
          ? 'discountValue debe estar entre 0 y 100'
          : 'discountValue debe ser mayor que 0',
      );
    }
    if (input.scope !== 'national' && input.scope !== 'local') {
      throw new BusinessRuleError('scope debe ser national o local');
    }
    const city = input.city?.trim() || undefined;
    if (
      input.serviceTypes?.some(
        (service) =>
          ![
            'grooming',
            'walking',
            'boarding',
            'veterinary',
            'home-visit',
            'cleaning',
          ].includes(service),
      )
    ) {
      throw new BusinessRuleError(
        'serviceTypes contiene un servicio no válido',
      );
    }
    if (input.scope === 'local' && !city) {
      throw new BusinessRuleError('Una promoción local requiere city');
    }
    const startsAt = new Date(input.startsAt);
    const endsAt = new Date(input.endsAt);
    if (
      Number.isNaN(startsAt.getTime()) ||
      Number.isNaN(endsAt.getTime()) ||
      endsAt < startsAt
    ) {
      throw new BusinessRuleError(
        'El rango de fechas de la promoción no es válido',
      );
    }

    return new Promotion({
      ...input,
      name: input.name.trim(),
      description: input.description.trim(),
      city,
      serviceTypes: input.serviceTypes?.length
        ? [...input.serviceTypes]
        : undefined,
    });
  }

  static rehydrate(props: PromotionPrimitives) {
    return new Promotion({
      ...props,
      serviceTypes: props.serviceTypes?.length
        ? [...props.serviceTypes]
        : undefined,
    });
  }

  appliesTo(
    city?: string,
    providerId?: string,
    serviceType?: ServiceType,
    date = new Date(),
  ) {
    const startsAt = new Date(this.props.startsAt);
    const endsAt = new Date(this.props.endsAt);
    const cityMatches =
      !!this.props.city &&
      !!city &&
      this.props.city.trim().toLowerCase() === city.trim().toLowerCase();
    const providerMatches =
      !this.props.providerId ||
      (!!providerId && this.props.providerId === providerId);
    const locationMatches =
      this.props.scope === 'national'
        ? providerMatches
        : cityMatches && providerMatches;
    const serviceMatches =
      !serviceType ||
      !this.props.serviceTypes ||
      this.props.serviceTypes.includes(serviceType);
    return (
      this.props.active &&
      date >= startsAt &&
      date <= endsAt &&
      locationMatches &&
      serviceMatches
    );
  }

  calculateDiscount(baseAmount: number) {
    if (!Number.isFinite(baseAmount) || baseAmount <= 0) {
      throw new BusinessRuleError('El precio base debe ser positivo');
    }

    const discountAmount =
      this.props.discountType === 'percent'
        ? Math.round((baseAmount * this.props.discountValue) / 100)
        : Math.round(this.props.discountValue);
    const boundedDiscount = Math.min(baseAmount, discountAmount);

    return {
      discountAmount: boundedDiscount,
      finalAmount: Math.max(0, baseAmount - boundedDiscount),
    };
  }

  setActive(active: boolean) {
    this.props.active = active;
  }

  get id() {
    return this.props.id;
  }

  get providerId() {
    return this.props.providerId;
  }

  toPrimitives() {
    return {
      ...this.props,
      serviceTypes: this.props.serviceTypes
        ? [...this.props.serviceTypes]
        : undefined,
    };
  }
}
