import { CognitivePhase, StepPhase, TaskStatus, ThinkingMode, TerminationReason, resolveConfig } from '../src/types';

describe('types', () => {
  describe('CognitivePhase', () => {
    it('should have all required phases', () => {
      expect(CognitivePhase.PERCEIVE).toBe('PERCEIVE');
      expect(CognitivePhase.ASSESS).toBe('ASSESS');
      expect(CognitivePhase.PLAN).toBe('PLAN');
      expect(CognitivePhase.EXECUTE).toBe('EXECUTE');
      expect(CognitivePhase.REFLECT).toBe('REFLECT');
    });
  });

  describe('StepPhase', () => {
    it('should have all required phases', () => {
      expect(StepPhase.THOUGHT).toBe('THOUGHT');
      expect(StepPhase.ACTION).toBe('ACTION');
      expect(StepPhase.OBSERVATION).toBe('OBSERVATION');
    });
  });

  describe('TaskStatus', () => {
    it('should have all required statuses', () => {
      expect(TaskStatus.PENDING).toBe('PENDING');
      expect(TaskStatus.RUNNING).toBe('RUNNING');
      expect(TaskStatus.COMPLETED).toBe('COMPLETED');
      expect(TaskStatus.FAILED).toBe('FAILED');
      expect(TaskStatus.PAUSED).toBe('PAUSED');
      expect(TaskStatus.TERMINATED).toBe('TERMINATED');
    });
  });

  describe('ThinkingMode', () => {
    it('should have all required modes', () => {
      expect(ThinkingMode.CREATIVE).toBe('CREATIVE');
      expect(ThinkingMode.LOGICAL).toBe('LOGICAL');
      expect(ThinkingMode.EMPATHETIC).toBe('EMPATHETIC');
      expect(ThinkingMode.STRUCTURAL).toBe('STRUCTURAL');
    });
  });

  describe('TerminationReason', () => {
    it('should have all required reasons', () => {
      expect(TerminationReason.COMPLETED).toBe('COMPLETED');
      expect(TerminationReason.MAX_STEPS_REACHED).toBe('MAX_STEPS_REACHED');
      expect(TerminationReason.USER_TERMINATED).toBe('USER_TERMINATED');
      expect(TerminationReason.UNRECOVERABLE_ERROR).toBe('UNRECOVERABLE_ERROR');
      expect(TerminationReason.HEARTBEAT_TIMEOUT).toBe('HEARTBEAT_TIMEOUT');
    });
  });

  describe('resolveConfig', () => {
    it('should use defaults when not provided', () => {
      const config = resolveConfig({
        systemPrompt: 'test',
      });

      expect(config.maxSteps).toBe(15);
      expect(config.maxConsecutiveFailures).toBe(3);
      expect(config.maxReplans).toBe(2);
    });

    it('should override defaults with provided values', () => {
      const config = resolveConfig({
        systemPrompt: 'test',
        maxSteps: 20,
        maxConsecutiveFailures: 5,
        maxReplans: 3,
      });

      expect(config.maxSteps).toBe(20);
      expect(config.maxConsecutiveFailures).toBe(5);
      expect(config.maxReplans).toBe(3);
    });

    it('should return Required<AgentConfig>', () => {
      const config = resolveConfig({
        systemPrompt: 'test',
      });

      expect(config.systemPrompt).toBe('test');
    });
  });
});
