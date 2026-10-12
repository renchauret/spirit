export const isText = (value: unknown): value is string => typeof value === 'string';

export const isTextList = (value: unknown): value is string[] => Array.isArray(value) && value.every(isText);

export const isAmount = (value: unknown): value is number | null => value === null || typeof value === 'number';
