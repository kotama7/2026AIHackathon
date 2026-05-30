export {
  generateDefense,
  type GenerateDefenseArgs,
  type GenerateDefenseResult,
} from './defense.js';
export { generateDailyDiscussion, type GenerateDailyDiscussionArgs } from './discussion.js';
export {
  generateInterrogationAnswer,
  type GenerateInterrogationAnswerArgs,
  type GenerateInterrogationAnswerResult,
} from './interrogation.js';
export {
  consumePoints,
  type ConsumePointsResult,
  getQuestionCost,
  refillPointsOnDayChange,
} from './interrogationPoints.js';
export {
  buildScopeRetryHint,
  enforceKnowledgeScope,
  type KnowledgeScopeViolation,
} from './knowledgeScope.js';
export { processNight, type ProcessNightArgs, type ProcessNightResult } from './night.js';
export {
  generateReactions,
  type GenerateReactionsArgs,
  type GenerateReactionsResult,
} from './reactions.js';
export { calculateScore, type CalculateScoreArgs, type CalculateScoreResult } from './score.js';
export { processVerdict, type ProcessVerdictArgs, type ProcessVerdictResult } from './verdict.js';
export {
  evaluateGameStatus,
  type EvaluateInput,
  type EvaluateResult,
  type EvaluateTrigger,
} from './winLose.js';
