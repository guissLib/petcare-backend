import { BusinessRuleError } from '../shared/errors/domain-error';
import type { PromotionPrimitives, ServiceType } from '../shared/types';

export interface NewPromotionProps {
  id: string;
  name: string;
  description: string;
  discountPercent: number;
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
    if (
      !Number.isFinite(input.discountPercent) ||
      input.discountPercent < 0 ||
      input.discountPercent > 100
    ) {
      throw new BusinessRuleError('discountPercent debe estar entre 0 y 100');
    }
    if (input.scope !== 'national' && input.scope !== 'local') {
      throw new BusinessRuleError('scope debe ser national o local');
    }
    if (
      input.serviceTypes?.some(
        (service) =>
          ![
            'grooming',
            'walking',
            'boarding',
            'veterinary',
            'home-visit',
          ].includes(service),
      )
    ) {
      throw new BusinessRuleError(
        'serviceTypes contiene un servicio no válido',
      );
    }
    if (input.scope === 'local' && !input.city && !input.providerId) {
      throw new BusinessRuleError(
        'Una promoción local requiere city o providerId',
      );
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
      !this.props.city ||
      !city ||
      this.props.city.toLowerCase() === city.toLowerCase();
    const providerMatches =
      !this.props.providerId ||
      !providerId ||
      this.props.providerId === providerId;
    const locationMatches =
      this.props.scope === 'national' || (cityMatches && providerMatches);
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

  get id() {
    return this.props.id;
  }

  get discountPercent() {
    return this.props.discountPercent;
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
