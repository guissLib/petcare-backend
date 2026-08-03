import { BadRequestException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

export type Input = Record<string, unknown>;

const toText = (value: unknown) => {
  if (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    typeof value === 'bigint'
  ) {
    return String(value);
  }
  return '';
};

export const read = <T>(input: Input, field: string) =>
  input[field] as T | undefined;

export const stringValue = (input: Input, field: string) =>
  toText(input[field]);

export const optionalString = (input: Input, field: string) => {
  const value = input[field];
  return value === undefined || value === null ? undefined : toText(value);
};

export const now = () => new Date().toISOString();

export const createId = (prefix: string) => `${prefix}_${randomUUID()}`;

export const required = (input: Input | null | undefined, fields: string[]) => {
  const missing = !input
    ? fields
    : fields.filter(
        (field) => input[field] === undefined || input[field] === '',
      );
  if (missing.length) {
    throw new BadRequestException(`Campos requeridos: ${missing.join(', ')}`);
  }
};
