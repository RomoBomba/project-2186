import { canonicalKnowledge } from '../generated/knowledge.ts';
import { ConversationEngine } from '../core/conversation/engine.ts';
import { BasicIntelligenceProvider } from '../core/intelligence/basic.ts';
// Stateless shared corpus/pipeline. Every terminal owns its own history and character runtime.
export const conversationEngine = new ConversationEngine(
  canonicalKnowledge,
  new BasicIntelligenceProvider(),
);
