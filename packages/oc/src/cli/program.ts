import path from 'node:path';

export interface OptionSpec {
  boolean?: boolean;
  array?: boolean;
  default?: unknown;
  description?: string;
}

export interface CommandSpec {
  cmd?: string;
  description: string;
  usage: string;
  example?: { cmd: string; description?: string };
  options?: Record<string, OptionSpec>;
  commands?: Record<string, CommandSpec>;
}

export type Argv = Record<string, unknown> & { _: Array<string | number> };

interface Positional {
  name: string;
  required: boolean;
}

interface ResolvedCommand {
  path: string[];
  spec?: CommandSpec;
}

const builtinOptions: Record<string, OptionSpec> = {
  help: { boolean: true, description: 'Show help' },
  version: { boolean: true, description: 'Show version number' }
};
const parserBuiltins: Record<string, OptionSpec> = {
  ...builtinOptions,
  h: builtinOptions['help']
};

const toCamelCase = (key: string) => {
  if (!key.includes('-')) return key;
  const mixedCase = key !== key.toLowerCase() && key !== key.toUpperCase();
  return (mixedCase ? key : key.toLowerCase()).replace(
    /[-_]+(.)/g,
    (_, c: string) => c.toUpperCase()
  );
};

const toKebabCase = (key: string) =>
  key.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();

const isNumber = (value: string) =>
  /^0x[0-9a-f]+$/i.test(value) ||
  (!/^0[^.]/.test(value) &&
    /^-?(?:\d+(?:\.\d*)?|\.\d+)(e[-+]?\d+)?$/.test(value));

const coerceNumber = (value: string): string | number =>
  isNumber(value) && Number.isSafeInteger(Math.floor(Number.parseFloat(value)))
    ? Number(value)
    : value;

const isNegativeNumber = (value: string) => /^-\d+(\.\d+)?$/.test(value);
const isFlag = (value: string) =>
  value.startsWith('-') && value !== '-' && !isNegativeNumber(value);

const parsePositionals = (cmd: string): Positional[] =>
  [...cmd.matchAll(/([<[])([^>\]]+)[>\]]/g)].map(([, bracket, name]) => ({
    name,
    required: bracket === '<'
  }));

const commandName = (name: string, spec: CommandSpec) =>
  (spec.cmd || name).split(' ')[0];

function parseTokens(
  tokens: string[],
  options: Record<string, OptionSpec>
): Argv {
  const argv: Argv = { _: [] };
  const known = (key: string) => options[toCamelCase(key)];
  const assign = (rawKey: string, value: unknown) => {
    const camel = toCamelCase(rawKey);
    const spec = options[camel];
    const keys = new Set([rawKey, camel]);
    if (spec) keys.add(toKebabCase(camel));
    const current = argv[camel];
    const next =
      spec?.array || (current !== undefined && !spec?.boolean)
        ? [
            ...(current === undefined ? [] : ([] as unknown[]).concat(current)),
            ...([] as unknown[]).concat(value)
          ]
        : value;
    for (const key of keys) argv[key] = next;
  };
  const coerce = (key: string, value: string) =>
    known(key)?.boolean ? value === 'true' : coerceNumber(value);

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];

    if (token === '--') {
      argv['--'] = tokens.slice(i + 1);
      break;
    }

    if (!isFlag(token)) {
      argv._.push(coerceNumber(token));
      continue;
    }

    if (token.startsWith('--')) {
      const eq = token.indexOf('=');
      if (eq !== -1) {
        const key = token.slice(2, eq);
        assign(key, coerce(key, token.slice(eq + 1)));
        continue;
      }

      const key = token.slice(2);
      if (key.startsWith('no-') && !known(key)) {
        assign(key.slice(3), false);
        continue;
      }

      const spec = known(key);
      if (spec?.array) {
        const values: unknown[] = [];
        while (i + 1 < tokens.length && !isFlag(tokens[i + 1])) {
          values.push(coerceNumber(tokens[++i]));
        }
        assign(key, values);
      } else if (spec?.boolean) {
        const next = tokens[i + 1];
        assign(
          key,
          /^(true|false)$/.test(next) ? tokens[++i] === 'true' : true
        );
      } else if (i + 1 < tokens.length && !isFlag(tokens[i + 1])) {
        assign(key, coerceNumber(tokens[++i]));
      } else {
        assign(key, spec?.default ?? true);
      }
      continue;
    }

    const letters = token.slice(1).split('=')[0];
    const inlineValue = token.includes('=')
      ? token.slice(token.indexOf('=') + 1)
      : undefined;
    for (const letter of letters.slice(0, -1)) assign(letter, true);
    const last = letters.slice(-1);
    if (inlineValue !== undefined) {
      assign(last, coerce(last, inlineValue));
    } else if (
      !known(last)?.boolean &&
      i + 1 < tokens.length &&
      !isFlag(tokens[i + 1])
    ) {
      assign(last, coerceNumber(tokens[++i]));
    } else {
      assign(last, true);
    }
  }

  return argv;
}

function resolveCommand(
  words: Array<string | number>,
  commands: Record<string, CommandSpec>
): ResolvedCommand {
  const resolved: ResolvedCommand = { path: [] };
  let level = commands;
  for (const word of words) {
    const entry = Object.entries(level).find(
      ([name, spec]) => commandName(name, spec) === String(word)
    );
    if (!entry) break;
    resolved.path.push(entry[0]);
    resolved.spec = entry[1];
    if (!entry[1].commands) break;
    level = entry[1].commands;
  }
  return resolved;
}

function wrap(text: string, width: number) {
  const lines: string[] = [];
  let line = '';
  for (const word of text.split(' ')) {
    if (line && line.length + word.length + 1 > width) {
      lines.push(line);
      line = word;
    } else {
      line = line ? `${line} ${word}` : word;
    }
  }
  return [...lines, line];
}

function formatTable(rows: Array<[string, string]>) {
  const width = Math.max(...rows.map(([left]) => left.length));
  const columns = process.stdout.isTTY ? process.stdout.columns : 0;
  const available = columns - width - 4;
  return rows
    .map(([left, right]) => {
      if (!right) return `  ${left}`;
      const lines = available > 20 ? wrap(right, available) : [right];
      return lines
        .map((line, i) => `  ${(i ? '' : left).padEnd(width)}  ${line}`)
        .join('\n');
    })
    .join('\n');
}

export default function createProgram({
  usage,
  commands,
  epilogue,
  version,
  validate
}: {
  usage: string;
  commands: Record<string, CommandSpec>;
  epilogue: string;
  version: string;
  validate: (argv: Argv, level: number) => true;
}) {
  const appPath = process.argv[1] || 'oc';
  const appName = path.basename(appPath).replace(/\.js$/, '');
  const withApp = (text: string) => text.replace(/\$0/g, appName);
  const rootCommands: Record<string, CommandSpec> = {
    ...commands,
    completion: { description: 'generate completion script', usage: '' }
  };

  const helpText = (resolved: ResolvedCommand) => {
    const { spec, path: commandPath } = resolved;
    const subcommands = spec ? spec.commands : rootCommands;
    const sections = [withApp(spec ? spec.usage : usage)];
    const prefix = [appName, ...commandPath].join(' ');

    if (subcommands) {
      sections.push(
        `Commands:\n${formatTable(
          Object.entries(subcommands).map(([name, sub]) => [
            `${prefix} ${sub.cmd || name}`,
            sub.description
          ])
        )}`
      );
    }

    const optionRows: Array<[string, string]> = Object.entries({
      ...builtinOptions,
      ...spec?.options
    }).map(([name, opt]) => {
      const tags = [
        opt.boolean ? '[boolean]' : opt.array ? '[array]' : '',
        opt.default !== undefined
          ? `[default: ${JSON.stringify(opt.default)}]`
          : ''
      ].filter(Boolean);
      return [
        name === 'help' ? '-h, --help' : `    --${name}`,
        [opt.description, tags.join(' ')].filter(Boolean).join('  ')
      ];
    });
    sections.push(`Options:\n${formatTable(optionRows)}`);

    if (spec?.example) {
      sections.push(
        `Examples:\n${formatTable([
          [
            withApp(spec.example.cmd),
            spec.example.description || spec.description
          ]
        ])}`
      );
    }

    if (subcommands) sections.push(epilogue);

    return sections.join('\n\n');
  };

  const fail = (resolved: ResolvedCommand, message: string): never => {
    console.error(`${helpText(resolved)}\n\n${message}`);
    process.exit(1);
  };

  const completions = (args: string[]) => {
    const zsh = /zsh/.test(`${process.env['SHELL']}${process.env['ZSH_NAME']}`);
    const current = args[args.length - 1] ?? '';
    const previous = args.slice(1, -1);
    const resolved = resolveCommand(previous, rootCommands);
    const level = resolved.spec ? resolved.spec.commands : rootCommands;
    const results: string[] = [];
    const entry = (name: string, description = '') =>
      zsh ? `${name.replace(/:/g, '\\:')}:${description}` : name;

    if (!current.startsWith('-') && resolved.path.at(-1) !== current) {
      for (const [name, spec] of Object.entries(level || {})) {
        const word = commandName(name, spec);
        if (!args.includes(word)) results.push(entry(word, spec.description));
      }
    }

    if (current.startsWith('-') || (current === '' && !results.length)) {
      const options: Record<string, OptionSpec> = {
        h: parserBuiltins['h'],
        version: parserBuiltins['version'],
        ...resolved.spec?.options
      };
      for (const [name, opt] of Object.entries(options)) {
        const dashes = name.length === 1 ? '-' : '--';
        if (args.includes(dashes + name)) continue;
        const prefix =
          name.length === 1 && !current.startsWith('--') ? '-' : '--';
        results.push(prefix + entry(name, opt.description));
      }
    }

    return results;
  };

  const completionScript = () => {
    const zsh = /zsh/.test(`${process.env['SHELL']}${process.env['ZSH_NAME']}`);
    const install = `${appPath} completion >> ~/.${zsh ? 'zshrc' : 'bashrc'}\n#    or ${appPath} completion >> ~/.${zsh ? 'zprofile' : 'bash_profile'} on OSX.`;
    const body = zsh
      ? `_${appName}_yargs_completions()
{
  local reply
  local si=$IFS
  IFS=$'\n' reply=($(COMP_CWORD="$((CURRENT-1))" COMP_LINE="$BUFFER" COMP_POINT="$CURSOR" ${appPath} --get-yargs-completions "\${words[@]}"))
  IFS=$si
  _describe 'values' reply
}
compdef _${appName}_yargs_completions ${appName}`
      : `_${appName}_yargs_completions()
{
    local cur_word args type_list

    cur_word="\${COMP_WORDS[COMP_CWORD]}"
    args=("\${COMP_WORDS[@]}")

    # ask yargs to generate completions.
    type_list=$(${appPath} --get-yargs-completions "\${args[@]}")

    COMPREPLY=( $(compgen -W "\${type_list}" -- \${cur_word}) )

    # if no match was found, fall back to filename completion
    if [ \${#COMPREPLY[@]} -eq 0 ]; then
      COMPREPLY=()
    fi

    return 0
}
complete -o bashdefault -o default -F _${appName}_yargs_completions ${appName}`;

    return `${zsh ? `#compdef ${appName}\n` : ''}###-begin-${appName}-completions-###
#
# yargs command completion script
#
# Installation: ${install}
#
${body}
###-end-${appName}-completions-###
`;
  };

  return function run(
    tokens: string[],
    handle: (commandPath: string[], argv: Argv) => void
  ) {
    if (tokens[0] === '--get-yargs-completions') {
      console.log(completions(tokens.slice(1)).join('\n'));
      return;
    }

    const words = parseTokens(tokens, parserBuiltins)._;
    const resolved = resolveCommand(words, rootCommands);
    const argv = parseTokens(tokens, {
      ...parserBuiltins,
      ...resolved.spec?.options
    });

    if (argv['help'] || argv['h']) {
      console.log(helpText(resolved));
      return;
    }

    if (argv['version']) {
      console.log(version);
      return;
    }

    if (!resolved.spec) {
      try {
        validate(argv, 0);
      } catch (err) {
        fail(resolved, (err as Error).message);
      }
      console.error(helpText(resolved));
      return;
    }

    if (resolved.path[0] === 'completion') {
      console.log(completionScript());
      return;
    }

    const positionals = parsePositionals(resolved.spec.cmd || '');
    const rest = argv._.slice(resolved.path.length);
    const required = positionals.filter((p) => p.required).length;
    if (rest.length < required) {
      fail(
        resolved,
        `Not enough non-option arguments: got ${rest.length}, need at least ${required}`
      );
    }

    positionals.forEach((positional, index) => {
      if (index < rest.length) {
        argv[positional.name] = rest[index];
        argv[toKebabCase(positional.name)] = rest[index];
      }
    });
    argv._ = [
      ...argv._.slice(0, resolved.path.length),
      ...rest.slice(positionals.length),
      ...((argv['--'] as string[]) || [])
    ];
    delete argv['--'];

    for (const [name, opt] of Object.entries(resolved.spec.options || {})) {
      if (argv[name] === undefined && opt.default !== undefined) {
        argv[name] = opt.default;
        argv[toKebabCase(name)] = opt.default;
      }
    }

    handle(resolved.path, argv);
  };
}
