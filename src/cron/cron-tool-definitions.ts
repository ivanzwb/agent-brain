import { ToolDefinition } from "../types";

const CRON_TOOL_DEFINITIONS: Record<string, ToolDefinition> = {
  cron_list: {
    name: 'cron_list',
    description: 'List all scheduled cron jobs. Returns their status, schedule, and execution history.',
    parameters: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          description: 'Filter by status: active, paused, completed, failed',
          enum: ['active', 'paused', 'completed', 'failed'],
        },
        limit: {
          type: 'number',
          description: 'Maximum number of jobs to return (default: 20)',
          default: 20,
        },
      },
      additionalProperties: false,
    },
  },

  cron_add: {
    name: 'cron_add',
    description: 'Add a new scheduled cron job. Uses standard cron expression format.',
    parameters: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Job name (unique identifier)',
        },
        cronExpression: {
          type: 'string',
          description: 'Cron expression (e.g., "0 * * * *" for hourly, "0 9 * * *" for daily at 9am)',
        },
        command: {
          type: 'string',
          description: 'Command to execute',
        },
      },
      required: ['name', 'cronExpression', 'command'],
      additionalProperties: false,
    },
  },

  cron_delete: {
    name: 'cron_delete',
    description: 'Delete a cron job by its ID.',
    parameters: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'Job ID to delete',
        },
      },
      required: ['id'],
      additionalProperties: false,
    },
  },

  cron_pause: {
    name: 'cron_pause',
    description: 'Pause a running cron job.',
    parameters: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'Job ID to pause',
        },
      },
      required: ['id'],
      additionalProperties: false,
    },
  },

  cron_resume: {
    name: 'cron_resume',
    description: 'Resume a paused cron job.',
    parameters: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'Job ID to resume',
        },
      },
      required: ['id'],
      additionalProperties: false,
    },
  },

  cron_run_now: {
    name: 'cron_run_now',
    description: 'Execute a cron job immediately without waiting for its schedule.',
    parameters: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'Job ID to run',
        },
      },
      required: ['id'],
      additionalProperties: false,
    },
  },
};

export { CRON_TOOL_DEFINITIONS };