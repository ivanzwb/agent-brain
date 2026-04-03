import { IHub } from '../types';

export interface MemoryHub extends IHub {

    searchMemory(query: string): Promise<{ text: string; tokenCount: number }>;
    trackMessage(role: string, content: string): Promise<void>;

}
