import fs from 'node:fs';
import YAML from 'yaml';
import { DEFAULT_REPOMIX_EXTRA_ARGS } from './defaultOptions.js';
import { callLlmApi } from './llm.js';
import { extractHeaderContents, findDistinctFence, trimCodeBlockFences } from './markdown.js';
import { runCommand } from './spawn.js';
import type { ReasoningEffort } from './types.js';
import { parseCommandLineArgs } from './utils.js';
import { yamlStringifyOptions } from './yaml.js';

const REPOMIX_FILE_NAME = 'repomix.result';

export type ResolutionPlan = {
  plan?: string;
  commitMessage?: string;
  filePaths: string[];
};

const HEADING_OF_FILE_PATHS_TO_BE_MODIFIED = '# File Paths to be Modified';
const HEADING_OF_FILE_PATHS_TO_BE_REFERRED = '# File Paths to be Referred';
const HEADING_OF_PLAN = '# Implementation Plans';
const HEADING_OF_COMMIT_MESSAGE = '# Commit Message';

export async function planCodeChanges(
  model: string,
  issueContent: string,
  twoStagePlanning: boolean,
  reasoningEffort?: ReasoningEffort,
  repomixExtraArgs?: string,
  isPullRequest = false
): Promise<ResolutionPlan> {
  const issueFence = findDistinctFence(issueContent, '~');
  const issueYamlText = `${issueFence}yaml
${YAML.stringify(issueContent, yamlStringifyOptions).trim()}
${issueFence}`;

  // Base repomix command arguments
  const repomixArgs = ['--yes', 'repomix@latest', '--output', REPOMIX_FILE_NAME];
  repomixArgs.push(...parseCommandLineArgs(repomixExtraArgs || DEFAULT_REPOMIX_EXTRA_ARGS));

  await runCommand('npx', repomixArgs);
  const repomixResult = fs.readFileSync(REPOMIX_FILE_NAME, 'utf8');
  void fs.promises.rm(REPOMIX_FILE_NAME, { force: true });

  if (twoStagePlanning) {
    console.info(`Selecting files with ${model} (reasoning effort: ${reasoningEffort}) ...`);
    const filesResponse = await callLlmApi(
      model,
      [
        {
          role: 'system',
          content: buildPromptForSelectingFiles(issueYamlText, isPullRequest).trim(),
        },
        {
          role: 'user',
          content: repomixResult,
        },
      ],
      reasoningEffort
    );
    console.info('Selecting complete!');

    const extractedFilePathLists = extractHeaderContents(trimCodeBlockFences(filesResponse), [
      HEADING_OF_FILE_PATHS_TO_BE_MODIFIED,
      HEADING_OF_FILE_PATHS_TO_BE_REFERRED,
    ]);
    if (!extractedFilePathLists) {
      return { filePaths: [] };
    }
    const [filePathsToBeModified, filePathsToBeReferred] = extractedFilePathLists.map((filesContent: string) => {
      const filePathRegex = /\B-\s*`?([^`\n]+)`?/g;
      const matches = [...filesContent.matchAll(filePathRegex)];
      return matches.map((match) => match[1].trim());
    });

    const fileContents = [...filePathsToBeModified, ...filePathsToBeReferred]
      .map((filePath) => {
        const content = fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8').trim() : '';
        const fence = findDistinctFence(content, '~');
        return `# \`${filePath}\`

${fence}
${content}
${fence}`;
      })
      .join('\n\n');

    console.info(`Planning code changes with ${model} (reasoning effort: ${reasoningEffort}) ...`);
    const planResponse = await callLlmApi(
      model,
      [
        {
          role: 'system',
          content: buildPromptForPlanningCodeChanges(issueYamlText, isPullRequest),
        },
        {
          role: 'user',
          content: fileContents,
        },
      ],
      reasoningEffort
    );
    console.info('Planning complete!');

    const extractedContents = extractHeaderContents(trimCodeBlockFences(planResponse), [
      HEADING_OF_COMMIT_MESSAGE,
      HEADING_OF_PLAN,
    ]);
    if (!extractedContents) {
      return { filePaths: filePathsToBeModified };
    }
    const [commitMessage, plan] = extractedContents;
    return { plan, commitMessage: commitMessage?.trim(), filePaths: filePathsToBeModified };
  }
  console.info(`Planning code changes with ${model} (reasoning effort: ${reasoningEffort}) ...`);
  const filesResponse = await callLlmApi(
    model,
    [
      {
        role: 'system',
        content: buildPromptForSelectingFilesAndPlanningCodeChanges(issueYamlText, isPullRequest).trim(),
      },
      {
        role: 'user',
        content: repomixResult,
      },
    ],
    reasoningEffort
  );
  console.info('Planning complete!');

  const extractedContents = extractHeaderContents(trimCodeBlockFences(filesResponse), [
    HEADING_OF_COMMIT_MESSAGE,
    HEADING_OF_PLAN,
    HEADING_OF_FILE_PATHS_TO_BE_MODIFIED,
  ]);
  if (!extractedContents) {
    return { filePaths: [] };
  }

  const [commitMessage, plan, filePathsText] = extractedContents;

  const filePathRegex = /\B-\s*`?([^`\n]+)`?/g;
  const matches = [...(filePathsText ?? '').matchAll(filePathRegex)];
  const filePathsToBeModified = matches.map((match) => match[1].trim());
  return { plan, commitMessage: commitMessage?.trim(), filePaths: filePathsToBeModified };
}

function buildPromptForSelectingFiles(issueYamlText: string, isPullRequest = false): string {
  const itemType = isPullRequest ? 'pull request' : 'issue';
  const extraInstruction = isPullRequest ? ' Consider the comments on the pull request when identifying files.' : '';
  return `
You are an expert software developer tasked with analyzing GitHub ${itemType}s and identifying relevant files for code changes.

Review the following GitHub ${itemType} and the list of available file paths and their contents (which will be provided in a separate message).${extraInstruction}
Your task is to identify:
1. Files that need to be MODIFIED to resolve the ${itemType}
2. Files that should be REFERRED to (but not modified) to understand the codebase better

GitHub ${isPullRequest ? 'Pull Request' : 'Issue'}:
${issueYamlText}

Please format your response without any explanatory text as follows:
\`\`\`md
${HEADING_OF_FILE_PATHS_TO_BE_MODIFIED}

- \`[filePath1]\`
- \`[filePath2]\`
- ...

${HEADING_OF_FILE_PATHS_TO_BE_REFERRED}

- \`[filePath1]\`
- \`[filePath2]\`
- ...
\`\`\`
`;
}

function buildPromptForPlanningCodeChanges(issueYamlText: string, isPullRequest = false): string {
  const itemType = isPullRequest ? 'pull request' : 'issue';
  const extraInstruction = isPullRequest ? ' Consider the comments on the pull request when creating the plan.' : '';
  return `
You are an expert software developer tasked with creating implementation plans based on GitHub ${itemType}s.

Review the following GitHub ${itemType} and the provided file contents (which will be provided in a separate message).${extraInstruction}
Create a detailed, step-by-step plan outlining how to address the ${itemType} effectively.
Also, provide a concise and descriptive commit message for the changes, following the Conventional Commits specification.

Your plan should:
- Focus on implementation details for each file that needs modification
- Be clear and actionable for a developer to follow
- Prefer showing diffs rather than complete file contents when describing changes
- Exclude testing procedures unless users explicitly request

GitHub ${isPullRequest ? 'Pull Request' : 'Issue'}:
${issueYamlText}

Please format your response without any explanatory text as follows:
\`\`\`md
${HEADING_OF_PLAN}

1. [Specific implementation step]
2. [Next implementation step]
...

${HEADING_OF_COMMIT_MESSAGE}

[commit message]
\`\`\`
`.trim();
}

function buildPromptForSelectingFilesAndPlanningCodeChanges(issueYamlText: string, isPullRequest = false): string {
  const itemType = isPullRequest ? 'pull request' : 'issue';
  const extraInstruction = isPullRequest ? ' Consider the comments on the pull request when creating the plan.' : '';
  return `
You are an expert software developer tasked with analyzing GitHub ${itemType}s and creating implementation plans.

Review the following GitHub ${itemType} and the list of available file paths and their contents (which will be provided in a separate message).${extraInstruction}
Your task is to:
1. Create a detailed, step-by-step plan outlining how to resolve the ${itemType} effectively.
2. Identify files that need to be modified to resolve the ${itemType}.
3. Provide a concise and descriptive commit message for the changes, following the Conventional Commits specification.

Your plan should:
- Focus on implementation details for each file that needs modification
- Be clear and actionable for a developer to follow
- Prefer showing diffs rather than complete file contents when describing changes
- Exclude testing procedures as those will be handled separately

GitHub ${isPullRequest ? 'Pull Request' : 'Issue'}:
${issueYamlText}

Please format your response without any explanatory text as follows:
\`\`\`md
${HEADING_OF_PLAN}

1. [Specific implementation step]
2. [Next implementation step]
...

${HEADING_OF_FILE_PATHS_TO_BE_MODIFIED}

- \`[filePath1]\`
- \`[filePath2]\`
- ...

${HEADING_OF_COMMIT_MESSAGE}

[commit message]
\`\`\`
`;
}
