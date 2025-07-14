import fs from 'node:fs';
import path from 'node:path';
import YAML from 'yaml';

export function loadConfigFile(): Record<string, unknown> {
  // Load config file (YAML) from repository root to set default option values
  let configOptions: Record<string, unknown> = {};
  for (const name of ['gen-pr.config.yml', 'gen-pr.config.yaml']) {
    const cfgPath = path.resolve(process.cwd(), name);
    if (fs.existsSync(cfgPath)) {
      try {
        configOptions = YAML.parse(fs.readFileSync(cfgPath, 'utf8')) as Record<string, unknown>;
        console.info(`Loaded gen-pr config from ${name}`);
      } catch (err) {
        console.error(`Failed to parse config file ${name}:`, err);
        process.exit(1);
      }
      break;
    }
  }
  return configOptions;
}
