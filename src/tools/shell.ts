import { execSync, ExecSyncOptions } from 'child_process';
import * as path from 'path';
import { Tool } from './types';

export class ShellTool implements Tool {
    name = 'Shell';
    description = 'A tool to execute shell commands and perform file system operations';

    private cwd: string = process.cwd();
    private readonly isWindows = process.platform === 'win32';

    public async getCwd(): Promise<string> {
        return this.cwd;
    }

    public async execute(
        command: string,
        options?: ExecSyncOptions & { cwd?: string }
    ): Promise<string> {
        try {
            const execOptions: ExecSyncOptions = {
                cwd: options?.cwd || this.cwd,
                encoding: 'utf-8',
                env: options?.env,
                shell: options?.shell,
            };
            const result = execSync(command, execOptions);
            return typeof result === 'string' ? result.trim() : result.toString('utf-8').trim();
        } catch (error: any) {
            throw new Error(`Shell command failed: ${error.message}`);
        }
    }

    public async getEnv(envName: string): Promise<string | undefined> {
        return process.env[envName];
    }

    public setEnv(envName: string, envValue: string): void {
        process.env[envName] = envValue;
    }

    private resolvePath(targetPath: string): string {
        if (path.isAbsolute(targetPath)) {
            return targetPath;
        }
        return path.resolve(this.cwd, targetPath);
    }
}

/**
 * 文件/目录统计信息接口
 */
export interface StatInfo {
    /** 路径 */
    path: string;
    /** 大小（字节） */
    size: number;
    /** 修改时间（ISO 8601） */
    mtime: string;
    /** 访问时间（ISO 8601） */
    atime: string;
    /** 状态变更时间（ISO 8601） */
    ctime: string;
    /** 是否为文件 */
    isFile: boolean;
    /** 是否为目录 */
    isDirectory: boolean;
}