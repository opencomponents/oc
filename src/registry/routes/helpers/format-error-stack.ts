// import fs from 'fs';
import path from 'node:path';
import source from 'source-map';

function extractInlineSourceMap(code: string) {
  try {
    const map = code.match(
      /\/\/# sourceMappingURL=data:application\/json;charset=utf-8;base64,(.*)/
    )?.[1];
    if (map) {
      return atob(map);
    }
    return null;
  } catch {
    return null;
  }
}

export async function processStackTrace({
  stackTrace,
  code
}: {
  stackTrace: string;
  code: string;
}) {
  const rawSourceMap = extractInlineSourceMap(code);
  if (!rawSourceMap) return null;
  const consumer = await new source.SourceMapConsumer(rawSourceMap);
  const lines = stackTrace.split('\n').filter((l) => l.trim().startsWith('at'));

  const result = {
    stack: [] as string[],
    codeFrame: [] as string[]
  };

  for (const line of lines) {
    // More flexible regex to handle different stack trace formats
    let match = line.match(/at (.+) \((.+):(\d+):(\d+)\)/);
    if (!match) {
      // Handle lines without function names like "at /path/file.js:line:col"
      match = line.match(/at (.+):(\d+):(\d+)/);
      if (match) {
        const [, file, lineStr, colStr] = match;
        match = [null, null, file, lineStr, colStr] as any;
      }
    }

    if (!match) {
      result.stack.push(`${line.trim()} (could not parse)`);
      continue;
    }

    const [, functionName, file, lineStr, colStr] = match;
    const lineNum = parseInt(lineStr, 10);
    const colNum = parseInt(colStr, 10);

    // Check if this line is from the file we have a source map for
    if (!file.includes('server.js')) {
      result.stack.push(`${line.trim()} (no source map)`);
      continue;
    }

    const original = consumer.originalPositionFor({
      line: lineNum,
      column: colNum
    });

    if (original.source && original.line !== null) {
      // Filter out frames that map to external libraries or oc-server internals AFTER mapping
      if (
        original.source.includes('node_modules') ||
        original.source.includes('oc-server') ||
        original.source.includes('__oc_higherOrderServer')
      ) {
        // Don't show filtered frames
        continue;
      }

      // Try to get the function name from multiple sources
      let displayName = original.name || functionName || '<anonymous>';

      // Clean up the function name if it includes object/class info
      if (functionName && !original.name) {
        displayName = functionName;
      }

      // Make file paths relative to current directory for better readability
      let relativePath = original.source;
      try {
        if (path.isAbsolute(original.source)) {
          relativePath = path.relative(process.cwd(), original.source);
        }
      } catch {
        // Keep original path if relative conversion fails
      }

      const stackLine = `at ${displayName} (${relativePath}:${original.line}:${original.column})`;
      result.stack.push(stackLine);

      // Show source code context if available
      const sourceContent = consumer.sourceContentFor(original.source, true);
      if (sourceContent && original.line) {
        const codeFrame = getCodeFrame(
          sourceContent,
          original.line,
          original.column || 0
        );
        if (codeFrame) {
          result.codeFrame.push(codeFrame);
        }
      }
    } else {
      // Fallback to original line if source mapping fails
      result.stack.push(`${line.trim()} (source map failed)`);
    }
  }

  // Don't forget to destroy the consumer
  try {
    consumer.destroy();
  } catch {}

  return {
    stack: result.stack.join('\n'),
    frame: [
      // For some reason, the first block lacks some indentation
      ...result.codeFrame.slice(0, 1).map((x) => `   ${x}`),
      ...result.codeFrame.slice(1)
    ].join('\n')
  };
}

// Helper function to show code context around the error
function getCodeFrame(
  sourceContent: string,
  line: number,
  column: number,
  contextLines = 2
) {
  try {
    const lines = sourceContent.split('\n');
    const targetLine = line - 1; // Convert to 0-based

    if (targetLine < 0 || targetLine >= lines.length) {
      return null;
    }

    const start = Math.max(0, targetLine - contextLines);
    const end = Math.min(lines.length, targetLine + contextLines + 1);

    let result = '';
    for (let i = start; i < end; i++) {
      const lineNumber = i + 1;
      const isTarget = i === targetLine;
      const prefix = isTarget ? '> ' : '  ';
      const lineNumberStr = String(lineNumber).padStart(3, ' ');

      result += `${prefix}${lineNumberStr} | ${lines[i]}\n`;

      // Add pointer to exact column for target line
      if (isTarget && column > 0) {
        const pointer = ' '.repeat(column); // Account for prefix and line number
        result += `${' '.repeat(5)} | ${pointer}^\n`;
      }
    }

    return result.trim();
  } catch {
    return null;
  }
}

// async function main() {
//   const stackTrace = `
// TypeError: Cannot read properties of undefined (reading 'name')
//     at HandledServer.initial (/Users/ricardo.agullo/Dev/octests/helpai/_package/server.js:196:38)
//     at async ocServerWrapper (/Users/ricardo.agullo/Dev/octests/helpai/_package/server.js:83:19)
// `;
//   const rawSourceMap = fs.readFileSync(
//     './helpai/_package/server.js.map',
//     'utf8'
//   );
//   const { stack, codeFrame } = await processStackTrace({
//     stackTrace,
//     rawSourceMap
//   });

//   // Log the stack trace
//   for (const line of stack) {
//     console.log(`    ${line}`);
//   }

//   // Log the code frames
//   // for (const frame of codeFrame) {
//   //   console.log(`\n${frame}\n`);
//   // }
//   for (let i = 0; i < codeFrame.length; i++) {
//     if (i === 0) {
//       console.log(`\n   ${codeFrame[i]}\n`);
//     } else {
//       console.log(`\n${codeFrame[i]}\n`);
//     }
//   }
// }

// main().catch(console.error);
