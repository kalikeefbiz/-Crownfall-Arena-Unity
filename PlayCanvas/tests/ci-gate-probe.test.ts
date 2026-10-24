import { expect, test } from 'vitest';

test('intentional failure on temporary nonpublishing branch only', () => {
    expect(1).toBe(2);
});
