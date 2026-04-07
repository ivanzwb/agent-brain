import { LoopController } from '../../src/react/loop-controller';
import { TaskStatus, TerminationReason } from '../../src/types';

describe('LoopController', () => {
  let controller: LoopController;

  beforeEach(() => {
    controller = new LoopController(10, 60000, 3);
  });

  describe('initial state', () => {
    it('should start with pending state', () => {
      expect(controller.state).toBe(TaskStatus.PENDING);
    });

    it('should start with step count 0', () => {
      expect(controller.currentStep).toBe(0);
    });

    it('should not be terminated initially', () => {
      const check = controller.checkTermination();
      expect(check.shouldTerminate).toBe(false);
    });
  });

  describe('start', () => {
    it('should set state to RUNNING', () => {
      controller.start();
      expect(controller.state).toBe(TaskStatus.RUNNING);
    });

    it('should set lastHeartbeat to current time', () => {
      const before = Date.now();
      controller.start();
      const after = Date.now();
      expect(controller.lastHeartbeat).toBeGreaterThanOrEqual(before);
      expect(controller.lastHeartbeat).toBeLessThanOrEqual(after);
    });
  });

  describe('pause/resume', () => {
    it('should pause from RUNNING state', () => {
      controller.start();
      controller.pause();
      expect(controller.state).toBe(TaskStatus.PAUSED);
    });

    it('should not pause from non-RUNNING state', () => {
      controller.pause();
      expect(controller.state).toBe(TaskStatus.PENDING);
    });

    it('should resume from PAUSED state', () => {
      controller.start();
      controller.pause();
      controller.resume();
      expect(controller.state).toBe(TaskStatus.RUNNING);
    });

    it('should not resume from non-PAUSED state', () => {
      controller.start();
      controller.resume();
      expect(controller.state).toBe(TaskStatus.RUNNING);
    });

    it('should wait when paused', async () => {
      controller.start();
      controller.pause();
      
      let resumed = false;
      const waitPromise = controller.waitIfPaused().then(() => {
        resumed = true;
      });
      
      // Not yet resumed
      expect(resumed).toBe(false);
      
      controller.resume();
      await waitPromise;
      expect(resumed).toBe(true);
    });
  });

  describe('terminate', () => {
    it('should set state to TERMINATED', () => {
      controller.start();
      controller.terminate();
      expect(controller.state).toBe(TaskStatus.TERMINATED);
    });

    it('should set termination reason to USER_TERMINATED', () => {
      controller.start();
      controller.terminate();
      const check = controller.checkTermination();
      expect(check.shouldTerminate).toBe(true);
      expect(check.reason).toBe(TerminationReason.USER_TERMINATED);
    });
  });

  describe('incrementStep', () => {
    it('should increment step count', () => {
      controller.incrementStep();
      expect(controller.currentStep).toBe(1);
    });

    it('should increment multiple times', () => {
      controller.incrementStep();
      controller.incrementStep();
      controller.incrementStep();
      expect(controller.currentStep).toBe(3);
    });
  });

  describe('failure tracking', () => {
    it('should record failures', () => {
      controller.start();
      controller.recordFailure();
      controller.recordFailure();
      controller.recordFailure();
      const check = controller.checkTermination();
      expect(check.shouldTerminate).toBe(true);
      expect(check.reason).toBe(TerminationReason.UNRECOVERABLE_ERROR);
    });

    it('should reset failures', () => {
      controller.recordFailure();
      controller.recordFailure();
      controller.resetFailures();
      const check = controller.checkTermination();
      expect(check.shouldTerminate).toBe(false);
    });
  });

  describe('heartbeat', () => {
    it('should update heartbeat', () => {
      const before = controller.lastHeartbeat;
      controller.updateHeartbeat();
      expect(controller.lastHeartbeat).toBeGreaterThanOrEqual(before);
    });

    it('should timeout when heartbeat expires', async () => {
      const shortController = new LoopController(10, 1, 3);
      shortController.start();
      // Wait for timeout
      await new Promise(resolve => setTimeout(resolve, 10));
      const check = shortController.checkTermination();
      expect(check.shouldTerminate).toBe(true);
      expect(check.reason).toBe(TerminationReason.HEARTBEAT_TIMEOUT);
    });
  });

  describe('checkTermination', () => {
    it('should terminate when step count reaches max', () => {
      const shortController = new LoopController(1, 60000, 3);
      shortController.start();
      shortController.incrementStep();
      const check = shortController.checkTermination();
      expect(check.shouldTerminate).toBe(true);
      expect(check.reason).toBe(TerminationReason.MAX_STEPS_REACHED);
    });

    it('should not terminate when under max steps', () => {
      controller.start();
      controller.incrementStep();
      const check = controller.checkTermination();
      expect(check.shouldTerminate).toBe(false);
    });
  });

  describe('getTerminationReason', () => {
    it('should return COMPLETED by default', () => {
      expect(controller.getTerminationReason()).toBe(TerminationReason.COMPLETED);
    });

    it('should return set reason after termination', () => {
      controller.start();
      controller.terminate();
      expect(controller.getTerminationReason()).toBe(TerminationReason.USER_TERMINATED);
    });
  });
});
