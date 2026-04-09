import {
  TaskStatus,
  TerminationReason,
  type TerminationCheck,
} from '../types';

export class LoopController {
  private _stepCount = 0;
  private _consecutiveFailures = 0;
  private _state: TaskStatus = TaskStatus.PENDING;
  private _terminationReason?: TerminationReason;
  private _pausePromise?: Promise<void>;
  private _pauseResolve?: () => void;

  constructor(
    private maxSteps: number,
    private maxConsecutiveFailures: number,
  ) {}

  get currentStep(): number {
    return this._stepCount;
  }

  get state(): TaskStatus {
    return this._state;
  }

  start(): void {
    this._state = TaskStatus.RUNNING;
  }

  pause(): void {
    if (this._state !== TaskStatus.RUNNING) return;
    this._state = TaskStatus.PAUSED;
    this._pausePromise = new Promise<void>((resolve) => {
      this._pauseResolve = resolve;
    });
  }

  resume(): void {
    if (this._state !== TaskStatus.PAUSED) return;
    this._state = TaskStatus.RUNNING;
    this._pauseResolve?.();
    this._pausePromise = undefined;
    this._pauseResolve = undefined;
  }

  terminate(): void {
    this._state = TaskStatus.TERMINATED;
    this._terminationReason = TerminationReason.USER_TERMINATED;
    this._pauseResolve?.();
    this._pausePromise = undefined;
    this._pauseResolve = undefined;
  }

  async waitIfPaused(): Promise<void> {
    if (this._state === TaskStatus.PAUSED && this._pausePromise) {
      await this._pausePromise;
    }
  }

  incrementStep(): void {
    this._stepCount++;
  }

  recordFailure(): void {
    this._consecutiveFailures++;
  }

  resetFailures(): void {
    this._consecutiveFailures = 0;
  }

  checkTermination(): TerminationCheck {
    if (this._state === TaskStatus.TERMINATED) {
      return {
        shouldTerminate: true,
        reason:
          this._terminationReason ?? TerminationReason.USER_TERMINATED,
      };
    }

    if (this._stepCount >= this.maxSteps) {
      this._terminationReason = TerminationReason.MAX_STEPS_REACHED;
      return {
        shouldTerminate: true,
        reason: TerminationReason.MAX_STEPS_REACHED,
      };
    }

    if (this._consecutiveFailures >= this.maxConsecutiveFailures) {
      this._terminationReason = TerminationReason.UNRECOVERABLE_ERROR;
      return {
        shouldTerminate: true,
        reason: TerminationReason.UNRECOVERABLE_ERROR,
      };
    }

    return { shouldTerminate: false };
  }

  getTerminationReason(): TerminationReason {
    return this._terminationReason ?? TerminationReason.COMPLETED;
  }
}
