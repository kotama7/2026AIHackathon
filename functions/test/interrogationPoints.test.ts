import { describe, expect, it } from '@jest/globals';
import { QUESTION_COSTS } from '@village/shared';

import { getQuestionCost } from '../src/gameLoop/interrogationPoints.js';

describe('getQuestionCost', () => {
  it.each(Object.entries(QUESTION_COSTS))(
    'questionType=%s のコストが %s',
    (questionType, expected) => {
      expect(getQuestionCost(questionType as keyof typeof QUESTION_COSTS)).toBe(expected);
    }
  );
});
