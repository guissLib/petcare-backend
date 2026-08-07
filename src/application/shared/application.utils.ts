import { randomUUID } from 'node:crypto';
import { BusinessRuleError } from '../../domain/shared/errors/domain-error';

export type Input = Record<string, unknown>;

export const now = () => new Date().toISOString();

export const createId = (prefix: string) => `${prefix}_${randomUUID()}`;

export function required(input: Input | undefined, fields: string[]) {
  const missing = !input
    ? fields
    : fields.filter((field) => {
        const value = input[field];
        return value === undefined || value === null || value === '';
      });
  if (missing.length) {
    throw new BusinessRuleError(`Campos requeridos: ${missing.join(', ')}`);
  }
}

export function text(input: Input, field: string) {
  const value = input[field];
  return typeof value === 'string' ? value.trim() : '';
}

export function optionalText(input: Input, field: string) {
  const value = text(input, field);
  return value || undefined;
}

export function numberValue(input: Input, field: string, fallback?: number) {
  const value = input[field];
  if (value === undefined && fallback !== undefined) {
    return fallback;
  }
  const number = typeof value === 'number' ? value : Number(value);
  return number;
}

export function stringArray(input: Input, field: string) {
  const value = input[field];
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : [];
}

export function booleanValue(input: Input, field: string, fallback = false) {
  const value = input[field];
  return typeof value === 'boolean' ? value : fallback;
}
