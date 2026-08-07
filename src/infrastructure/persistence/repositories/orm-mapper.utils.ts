export function toDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid date value: ${value}`);
  }
  return date;
}

export function toIso(value: Date) {
  return value.toISOString();
}

export function optionalText(value: string | null | undefined) {
  return value ?? undefined;
}
