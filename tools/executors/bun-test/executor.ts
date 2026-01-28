import { ExecutorContext } from '@nx/devkit';
import { execSync } from 'child_process';
import * as path from 'path';

export interface BunTestExecutorSchema {
  testDir?: string;
  timeout?: number;
  coverage?: boolean;
  watch?: boolean;
  bail?: boolean;
  passWithNoTests?: boolean;
}

export default async function runExecutor(
  options: BunTestExecutorSchema,
  context: ExecutorContext
): Promise<{ success: boolean }> {
  const projectName = context.projectName;
  if (!projectName) {
    console.error('No project name provided');
    return { success: false };
  }

  const projectConfig = context.projectsConfigurations?.projects[projectName];
  if (!projectConfig) {
    console.error(`Project ${projectName} not found`);
    return { success: false };
  }

  const projectRoot = projectConfig.root;
  const testDir = options.testDir || 'src';
  const testPath = path.join(context.root, projectRoot, testDir);

  // Build the bun test command
  const args: string[] = ['bun', 'test', testPath];

  if (options.timeout) {
    args.push('--timeout', options.timeout.toString());
  }

  if (options.coverage) {
    args.push('--coverage');
  }

  if (options.watch) {
    args.push('--watch');
  }

  if (options.bail) {
    args.push('--bail');
  }

  const command = args.join(' ');
  console.log(`Running: ${command}`);

  try {
    execSync(command, {
      cwd: context.root,
      stdio: 'inherit',
      env: {
        ...process.env,
        NODE_ENV: 'test',
      },
    });
    return { success: true };
  } catch (error) {
    if (options.passWithNoTests) {
      // Check if error is due to no tests found
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('no tests found') || errorMessage.includes('0 pass')) {
        console.log('No tests found, passing due to passWithNoTests option');
        return { success: true };
      }
    }
    return { success: false };
  }
}
