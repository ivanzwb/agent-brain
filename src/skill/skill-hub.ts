import type { IHub } from '../types';
import type { ToolDefinition } from '../innate-tools/types';

// ============================================================
// SkillHub — 技能的统一注册、查询与调度中心
//
// AgentBrain 和 ReactLoop 通过 SkillHub 与技能交互，
// 天生工具（install_skill）安装新技能后调用 SkillHub.install()，
// 下一轮 ReactLoop 迭代即可感知新技能。
// ============================================================

export interface SkillHub extends IHub {
    /** 返回所有已安装技能的描述文本列表 */
    getSkillsDescription(): string[];
    /** 返回所有已安装技能提供的工具定义 */
    getTools(skillName: string): ToolDefinition[];
    /** 执行某个技能中的工具 */
    execute(skillName: string, toolName: string, args: Record<string, unknown>): Promise<string>;
}


// ============================================================
// Skill 声明 — 描述一个技能包的能力边界
// ============================================================

/** 技能声明：描述一组工具背后的领域知识和适用场景 */
export interface SkillDeclaration {
  /** 技能名称 */
  name: string;
  /** 技能描述 */
  description: string;
}
