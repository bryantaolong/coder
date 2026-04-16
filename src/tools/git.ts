import { execSync } from 'child_process';
import { Tool } from './types';

/**
 * Git 工具类
 * 封装常用的 Git 命令操作，提供简洁的 API 接口
 *
 * 使用示例：
 * ```typescript
 * const git = new GitTool();
 * await git.gitAdd('.');
 * await git.gitCommit('feat: add new feature');
 * await git.gitPush();
 * ```
 */
export class GitTool implements Tool {
    name = 'Git';
    description = 'A tool to interact with Git repositories';

    /**
     * 执行 Git 命令
     *
     * @param command - Git 命令及参数（不包含 'git' 前缀）
     * @param cwd - 工作目录，默认为当前进程目录 (process.cwd())
     * @returns 命令执行的输出结果（已去除首尾空白字符）
     * @throws {Error} 命令执行失败时抛出错误，包含错误信息
     *
     * @example
     *   await git.execute('status');
     *   await git.execute('log --oneline -5', '/path/to/repo');
     *
     * @security 注意：command 参数直接拼接到 shell 命令中，
     *   不应包含来自不可信用户的输入，以避免命令注入风险
     */
    public async execute(command: string, cwd?: string): Promise<string> {
        try {
            return execSync(`git ${command}`, {
                cwd: cwd || process.cwd(),
                encoding: 'utf-8',
            }).trim();
        } catch (error: any) {
            throw new Error(`Git 命令失败: ${error.message}`);
        }
    }

    /**
     * 获取 Git 仓库状态
     * 相当于执行 `git status`
     *
     * @returns 状态信息字符串（包含已暂存、未暂存、未跟踪的文件列表等）
     *
     * @example
     *   const status = await git.gitStatus();
     *   console.log(status);
     */
    public async status(): Promise<string> {
        return this.execute('status');
    }

    /**
     * 将文件添加到暂存区
     * 相当于执行 `git add <pattern>`
     *
     * @param pattern - 文件路径模式，支持 glob 语法
     *   - '.'：所有变更（包括新增、修改、删除的文件）
     *   - '*.ts'：当前目录下所有 .ts 文件
     *   - 'src/'：src 目录下所有变更
     * @returns 添加结果信息
     *
     * @example
     *   await git.gitAdd();              // 添加所有变更
     *   await git.gitAdd('*.md');        // 添加所有 markdown 文件
     *   await git.gitAdd('src/utils/');  // 添加 src/utils 目录
     */
    public async add(pattern: string = '.'): Promise<string> {
        return this.execute(`add ${pattern}`);
    }

    /**
     * 创建 Git 提交
     *
     * 注意：提交前需要先使用 gitAdd() 将文件添加到暂存区
     *
     * @param message - 提交信息
     *   - undefined / null：执行 `git commit`（无 -m 参数，会打开编辑器输入提交信息）
     *   - ''（空字符串）：执行 `git commit --allow-empty-message`（允许空提交信息）
     *   - 非空字符串：执行 `git commit -m 'message'`
     * @returns 提交结果信息（包含提交的哈希值）
     *
     * @example
     *   await git.gitCommit('feat: add new feature');  // 带提交信息
     *   await git.gitCommit('');                      // 空提交信息
     *   await git.gitCommit(undefined);              // 打开编辑器输入
     *
     * @throws {Error} 当暂存区为空时，会抛出错误
     *
     * @security 提交信息中的单引号会被转义（' → '\''），防止命令注入
     */
    public async commit(message?: string): Promise<string> {
        if (!message) {
            return this.execute('commit');
        }
        if (message === '') {
            return this.execute('commit --allow-empty-message');
        }
        // 转义单引号：' → '\''
        const escaped = message.replace(/'/g, `'\\''`);
        return this.execute(`commit -m '${escaped}'`);
    }

    /**
     * 修正最近一次提交（修改提交信息或内容）
     *
     * @param message - 新的提交信息
     *   - undefined / null：执行 `git commit --amend`（不修改提交信息，可添加遗漏文件）
     *   - ''（空字符串）：执行 `git commit --amend --no-edit`（保留原提交信息，仅修正内容）
     *   - 非空字符串：执行 `git commit --amend -m 'message'`
     * @returns 修正结果信息
     *
     * @example
     *   await git.gitCommitAmend('fix: correct typo');  // 修改提交信息
     *   await git.gitCommitAmend();                    // 仅修正内容
     *
     * @warning 使用此方法会修改提交历史，已推送的提交应避免使用
     */
    public async commitAmend(message?: string): Promise<string> {
        if (!message) {
            return this.execute('commit --amend');
        }
        if (message === '') {
            return this.execute('commit --amend --no-edit');
        }
        const escaped = message.replace(/'/g, `'\\''`);
        return this.execute(`commit --amend -m '${escaped}'`);
    }

    /**
     * 添加所有变更并一次性提交
     * 相当于执行 `git add . && git commit -m "message"`
     *
     * @param message - 提交信息（不能为空）
     * @returns 提交结果信息
     *
     * @example
     *   await git.gitCommitAll('fix: resolve bug');
     *
     * @deprecated 建议使用 gitAdd() + gitCommit() 分离操作，以便更好地控制提交内容
     */
    public async commitAll(message: string): Promise<string> {
        await this.add('.');
        return this.commit(message);
    }

    /**
     * 获取最新提交的 SHA 哈希值（短格式）
     * 相当于执行 `git log -1 --pretty=format:%H`
     *
     * @returns 40 位字符的提交哈希
     *
     * @example
     *   const hash = await git.getLatestCommitHash();
     *   console.log('最新提交:', hash);
     */
    public async getLatestCommitHash(): Promise<string> {
        return this.execute('log -1 --pretty=format:%H');
    }

    /**
     * 添加远程仓库
     *
     * @param name - 远程仓库名称（如 'origin'）
     * @param url - 远程仓库 URL（如 '
     * 
     * returns 添加结果信息
     *
     * @example
     *   await git.addRemote('origin', '
     */
    public async addRemote(name: string, url: string): Promise<string> {
        return this.execute(`remote add ${name} ${url}`);
    }

    /**
     * 从远程仓库拉取更新
     *
     * @param remote - 远程仓库名称，默认为 'origin'
     * @param branch - 分支名称，默认为当前分支（不指定时 Git 会自动使用当前分支对应的远程分支）
     * @returns 拉取结果信息
     *
     * @example
     *   await git.pull();                      // 从 origin 拉取当前分支
     *   await git.pull('upstream', 'main');    // 从 upstream 拉取 main 分支
     *
     * @warning 拉取前建议先提交或暂存本地变更，避免冲突
     */
    public async pull(remote: string = 'origin', branch?: string): Promise<string> {
        return branch
            ? this.execute(`pull ${remote} ${branch}`)
            : this.execute(`pull ${remote}`);
    }

    /**
     * 推送提交到远程仓库
     *
     * @param remote - 远程仓库名称，默认为 'origin'
     * @param branch - 分支名称，默认为当前分支
     * @returns 推送结果信息
     *
     * @example
     *   await git.push();                    // 推送到 origin 的当前分支
     *   await git.push('origin', 'main');    // 推送到 origin/main
     *
     * @note 如果远程分支不存在，Git 会尝试创建；如果本地分支领先远程，会拒绝推送（需使用 --force 参数）
     */
    public async push(remote: string = 'origin', branch?: string): Promise<string> {
        return branch
            ? this.execute(`push ${remote} ${branch}`)
            : this.execute(`push ${remote}`);
    }
}
