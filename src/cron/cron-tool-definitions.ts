import { ToolDefinition } from '../innate-tools/types';

/**
 * Cron tool schemas: **capability boundaries**. When to offer scheduling is **agent / product policy** (prompts).
 */
const CRON_TOOL_DEFINITIONS: Record<string, ToolDefinition> = {
  cron_list: {
    name: 'cron_list',
    description:
      'Lists scheduled jobs known to this runtime. Optional filter by **status**. Output: job records including ids.',
    parameters: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          description: 'Filter: active | paused | completed | failed',
          enum: ['active', 'paused', 'completed', 'failed'],
        },
        limit: {
          type: 'number',
          description: 'Max jobs to return (default: 20)',
          default: 20,
        },
      },
      additionalProperties: false,
    },
  },

  cron_add: {
    name: 'cron_add',
    description:
      'Creates a **recurring** job: **cronExpression** (scheduler syntax) + **command** (payload string executed by the runtime, often natural language for an agent). **Mutates** the schedule store.',
    parameters: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Stable job name',
        },
        cronExpression: {
          type: 'string',
          description: 'Standard cron expression for this runtime (e.g. "0 8 * * *")',
        },
        command: {
          type: 'string',
          description: 'Command / instruction string stored with the job',
        },
      },
      required: ['name', 'cronExpression', 'command'],
      additionalProperties: false,
    },
  },

  cron_delete: {
    name: 'cron_delete',
    description: 'Removes a scheduled job by **id**. **Mutates** the schedule store.',
    parameters: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'Job id from cron_list',
        },
      },
      required: ['id'],
      additionalProperties: false,
    },
  },

  cron_pause: {
    name: 'cron_pause',
    description: 'Pauses a job by **id** without deleting it.',
    parameters: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'Job id from cron_list',
        },
      },
      required: ['id'],
      additionalProperties: false,
    },
  },

  cron_resume: {
    name: 'cron_resume',
    description: 'Resumes a previously paused job by **id**.',
    parameters: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'Job id from cron_list',
        },
      },
      required: ['id'],
      additionalProperties: false,
    },
  },

  cron_run_now: {
    name: 'cron_run_now',
    description: 'Triggers immediate execution of a job by **id** (outside its normal schedule).',
    parameters: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'Job id from cron_list',
        },
      },
      required: ['id'],
      additionalProperties: false,
    },
  },
};

export { CRON_TOOL_DEFINITIONS };
