import { describe, expect, it } from 'vitest';
import {
  ONBOARDING_STEPS,
  clampStep,
  nextStepIndex,
  stepProgressLabel,
} from '../../src/ui/onboarding';

describe('onboarding wizard mechanics', () => {
  it('has clear steps with copy only on copy screen', () => {
    expect(ONBOARDING_STEPS.length).toBe(5);
    expect(ONBOARDING_STEPS[0]!.cta).toBe('continue');
    const copySteps = ONBOARDING_STEPS.filter((s) => s.cta === 'copy');
    expect(copySteps).toHaveLength(1);
    expect(copySteps[0]!.id).toBe('copy');
    expect(ONBOARDING_STEPS.some((s) => s.id === 'bookmark')).toBe(true);
    expect(ONBOARDING_STEPS.some((s) => /пустой|новой пустой/i.test(s.lead + s.how.join(' ')))).toBe(
      true,
    );
    expect(ONBOARDING_STEPS.at(-1)!.cta).toBe('finish');
    expect(ONBOARDING_STEPS[0]!.how.join(' ')).toMatch(/пять коротких шагов/);
    expect(ONBOARDING_STEPS[0]!.lead + ONBOARDING_STEPS[0]!.how.join(' ')).not.toMatch(/Alt\+Shift\+H/);
    const open = ONBOARDING_STEPS.find((step) => step.id === 'open')!;
    expect(open.how.join(' ')).toMatch(/Alt\+Shift\+H/);
    const bookmark = ONBOARDING_STEPS.find((step) => step.id === 'bookmark')!;
    expect(bookmark.how.join(' ')).toMatch(/Mac/);
    const use = ONBOARDING_STEPS.find((step) => step.id === 'use')!;
    expect(use.how.join(' ')).toMatch(/как на странице/);
  });

  it('advances and clamps step index', () => {
    expect(nextStepIndex(0)).toBe(1);
    expect(nextStepIndex(4)).toBe(4);
    expect(clampStep(-1)).toBe(0);
    expect(clampStep(99)).toBe(4);
  });

  it('shows progress label for users', () => {
    expect(stepProgressLabel(0)).toBe('Шаг 1 из 5');
    expect(stepProgressLabel(4)).toBe('Шаг 5 из 5');
  });
});
