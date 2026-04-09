import { InnateToolHub } from '../../src/innate-tools/innate-tool-hub';
import type { InnateTool } from '../../src/innate-tools/types';
import type { IEventPublisher } from '../../src/types';

const createMockTool = (name: string, description: string = 'Test tool'): InnateTool => ({
  definition: { name, description, parameters: { type: 'object' } },
  execute: async (args) => `executed ${name} with ${JSON.stringify(args)}`,
});

describe('InnateToolHub', () => {
  let hub: InnateToolHub;

  beforeEach(() => {
    hub = new InnateToolHub();
  });

  describe('register', () => {
    it('should register a tool', () => {
      const tool = createMockTool('test_tool');
      const result = hub.register(tool);

      expect(hub.hasTool('test_tool')).toBe(true);
      expect(result).toBe(hub);
    });

    it('should throw when registering duplicate tool', () => {
      const tool = createMockTool('test_tool');
      hub.register(tool);

      expect(() => hub.register(tool)).toThrow('already registered');
    });

    it('should return this for chaining', () => {
      const tool = createMockTool('test_tool');
      const result = hub.register(tool);

      expect(result).toBe(hub);
    });
  });

  describe('registerAll', () => {
    it('should register multiple tools', () => {
      const tools = [createMockTool('tool1'), createMockTool('tool2')];
      const result = hub.registerAll(tools);

      expect(hub.hasTool('tool1')).toBe(true);
      expect(hub.hasTool('tool2')).toBe(true);
      expect(result).toBe(hub);
    });
  });

  describe('unregister', () => {
    it('should unregister existing tool', () => {
      hub.register(createMockTool('test_tool'));

      const result = hub.unregister('test_tool');

      expect(result).toBe(true);
      expect(hub.hasTool('test_tool')).toBe(false);
    });

    it('should return false for non-existent tool', () => {
      const result = hub.unregister('non_existent');

      expect(result).toBe(false);
    });
  });

  describe('getToolDefinition', () => {
    it('should return tool definition', () => {
      const tool = createMockTool('test_tool', 'my description');
      hub.register(tool);

      const def = hub.getToolDefinition('test_tool');

      expect(def).toBeDefined();
      expect(def?.name).toBe('test_tool');
      expect(def?.description).toBe('my description');
    });

    it('should return undefined for unknown tool', () => {
      const def = hub.getToolDefinition('unknown');

      expect(def).toBeUndefined();
    });
  });

  describe('hasTool', () => {
    it('should return true for registered tool', () => {
      hub.register(createMockTool('test_tool'));

      expect(hub.hasTool('test_tool')).toBe(true);
    });

    it('should return false for unknown tool', () => {
      expect(hub.hasTool('unknown')).toBe(false);
    });
  });

  describe('getToolsDescription', () => {
    it('should return descriptions of all tools', () => {
      hub.register(createMockTool('tool1', 'desc1'));
      hub.register(createMockTool('tool2', 'desc2'));

      const descriptions = hub.getToolsDescription();

      expect(descriptions).toHaveLength(2);
      expect(descriptions[0]).toContain('tool1');
    });

    it('should return empty array when no tools', () => {
      const descriptions = hub.getToolsDescription();

      expect(descriptions).toEqual([]);
    });
  });

  describe('getTools', () => {
    it('should return all tool definitions', () => {
      hub.register(createMockTool('tool1'));
      hub.register(createMockTool('tool2'));

      const tools = hub.getTools();

      expect(tools).toHaveLength(2);
      expect(tools.map(t => t.name)).toContain('tool1');
      expect(tools.map(t => t.name)).toContain('tool2');
    });

    it('should return empty array when no tools', () => {
      const tools = hub.getTools();

      expect(tools).toEqual([]);
    });
  });

  describe('execute', () => {
    it('should execute registered tool', async () => {
      const tool = createMockTool('test_tool');
      hub.register(tool);

      const result = await hub.execute('test_tool', { key: 'value' });

      expect(result).toContain('test_tool');
    });

    it('should throw for unknown tool', async () => {
      await expect(hub.execute('unknown', {})).rejects.toThrow('Unknown innate tool');
    });
  });

  describe('setEventPublisher', () => {
    it('should set event publisher', () => {
      const mockPublisher: IEventPublisher = {
        publish: jest.fn(),
      };

      hub.setEventPublisher(mockPublisher);
    });
  });

  describe('user input', () => {
    it('should request user input', async () => {
      const promise = hub.requestUserInput('What is your name?');

      expect(hub.hasTool('ask_user')).toBe(false);

      hub.provideUserInput('John');
      const result = await promise;

      expect(result).toBe('John');
    });

    it('should provide user input multiple times', async () => {
      hub.requestUserInput('Question 1');
      hub.provideUserInput('Answer 1');

      hub.requestUserInput('Question 2');
      hub.provideUserInput('Answer 2');

      const ctx = hub.getUserProvidedContext();
      expect(ctx).toContain('Answer 1');
      expect(ctx).toContain('Answer 2');
    });
  });
});
