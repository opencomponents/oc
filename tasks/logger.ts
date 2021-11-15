import chalk from 'chalk';
import nodeEmoji from 'node-emoji';

type Color =
  | 'black'
  | 'red'
  | 'green'
  | 'yellow'
  | 'blue'
  | 'magenta'
  | 'cyan'
  | 'white'
  | 'gray'
  | 'grey'
  | 'blackBright'
  | 'redBright'
  | 'greenBright'
  | 'yellowBright'
  | 'blueBright'
  | 'magentaBright'
  | 'cyanBright'
  | 'whiteBright';

type Modifiers =
  | 'reset'
  | 'bold'
  | 'dim'
  | 'italic'
  | 'underline'
  | 'inverse'
  | 'hidden'
  | 'strikethrough'
  | 'visible';

const log = (col: Color, style: Modifiers, emoji?: string) =>
  function (msg: string) {
    // eslint-disable-next-line no-console
    console.log(
      chalk[style][col](msg) + (emoji ? ` ${nodeEmoji.get(emoji)}` : '')
    );
  };

export default {
  complete: log('green', 'reset', 'thumbsup'),
  error: log('red', 'reset', 'no_good'),
  fatal: log('red', 'underline', 'no_good'),
  ok: log('gray', 'reset'),
  start: log('green', 'reset')
};
