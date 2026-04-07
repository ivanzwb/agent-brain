import { ThinkingModeScheduler } from '../src/thinking-mode';
import { CognitivePhase, ThinkingMode } from '../src/types';

describe('ThinkingModeScheduler', () => {
  let scheduler: ThinkingModeScheduler;

  beforeEach(() => {
    scheduler = new ThinkingModeScheduler();
  });

  describe('getWeights', () => {
    it('should return weights for PERCEIVE phase', () => {
      const weights = scheduler.getWeights(CognitivePhase.PERCEIVE);

      expect(weights).toHaveProperty(ThinkingMode.CREATIVE);
      expect(weights).toHaveProperty(ThinkingMode.LOGICAL);
      expect(weights).toHaveProperty(ThinkingMode.EMPATHETIC);
      expect(weights).toHaveProperty(ThinkingMode.STRUCTURAL);
      expect(weights[ThinkingMode.EMPATHETIC]).toBe(0.5);
    });

    it('should return weights for ASSESS phase', () => {
      const weights = scheduler.getWeights(CognitivePhase.ASSESS);

      expect(weights[ThinkingMode.LOGICAL]).toBe(0.45);
      expect(weights[ThinkingMode.STRUCTURAL]).toBe(0.4);
    });

    it('should return weights for PLAN phase', () => {
      const weights = scheduler.getWeights(CognitivePhase.PLAN);

      expect(weights[ThinkingMode.STRUCTURAL]).toBe(0.5);
      expect(weights[ThinkingMode.CREATIVE]).toBe(0.2);
    });

    it('should return weights for EXECUTE phase', () => {
      const weights = scheduler.getWeights(CognitivePhase.EXECUTE);

      expect(weights[ThinkingMode.LOGICAL]).toBe(0.5);
      expect(weights[ThinkingMode.STRUCTURAL]).toBe(0.25);
    });

    it('should return weights for REFLECT phase', () => {
      const weights = scheduler.getWeights(CognitivePhase.REFLECT);

      expect(weights[ThinkingMode.LOGICAL]).toBe(0.35);
      expect(weights[ThinkingMode.EMPATHETIC]).toBe(0.3);
    });

    it('should return a copy of weights (not reference)', () => {
      const weights1 = scheduler.getWeights(CognitivePhase.PERCEIVE);
      const weights2 = scheduler.getWeights(CognitivePhase.PERCEIVE);

      weights1[ThinkingMode.CREATIVE] = 0.99;
      
      expect(weights2[ThinkingMode.CREATIVE]).not.toBe(0.99);
    });
  });

  describe('getPhasePrompt', () => {
    it('should return prompt for PERCEIVE phase', () => {
      const prompt = scheduler.getPhasePrompt(CognitivePhase.PERCEIVE);

      expect(prompt).toContain('PERCEIVE');
      expect(prompt).toContain('surfaceRequest');
      expect(prompt).toContain('deepIntent');
    });

    it('should return prompt for ASSESS phase', () => {
      const prompt = scheduler.getPhasePrompt(CognitivePhase.ASSESS);

      expect(prompt).toContain('ASSESS');
      expect(prompt).toContain('requiredSkills');
    });

    it('should return prompt for PLAN phase', () => {
      const prompt = scheduler.getPhasePrompt(CognitivePhase.PLAN);

      expect(prompt).toContain('PLAN');
      expect(prompt).toContain('strategy');
      expect(prompt).toContain('steps');
    });

    it('should return prompt for EXECUTE phase', () => {
      const prompt = scheduler.getPhasePrompt(CognitivePhase.EXECUTE);

      expect(prompt).toContain('EXECUTE');
      expect(prompt).toContain('tool');
    });

    it('should return prompt for REFLECT phase', () => {
      const prompt = scheduler.getPhasePrompt(CognitivePhase.REFLECT);

      expect(prompt).toContain('REFLECT');
      expect(prompt).toContain('goalMet');
    });
  });

  describe('generateGuidance', () => {
    it('should generate guidance with primary and secondary modes', () => {
      const guidance = scheduler.generateGuidance(CognitivePhase.PERCEIVE);

      expect(guidance).toContain('[Thinking Mode Guidance]');
      expect(guidance).toContain('Primary:');
      expect(guidance).toContain('Supporting:');
    });

    it('should use star for primary modes', () => {
      const guidance = scheduler.generateGuidance(CognitivePhase.ASSESS);

      expect(guidance).toContain('★');
    });

    it('should use circle for secondary modes', () => {
      const guidance = scheduler.generateGuidance(CognitivePhase.PERCEIVE);

      expect(guidance).toContain('○');
    });

    it('should include mode names and descriptions', () => {
      const guidance = scheduler.generateGuidance(CognitivePhase.PLAN);

      expect(guidance).toContain('Creative Thinking');
      expect(guidance).toContain('Structural Planning');
    });
  });
});
