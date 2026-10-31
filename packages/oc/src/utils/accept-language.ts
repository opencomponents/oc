export interface AcceptLanguage {
  code: string;
  script: string | null;
  region: string | undefined;
  quality: number;
}

const regex = /((([a-zA-Z]+(-[a-zA-Z0-9]+){0,2})|\*)(;q=[0-1](\.[0-9]+)?)?)*/g;

export function parseAcceptLanguage(al?: string): AcceptLanguage[] {
  return (al || '')
    .match(regex)!
    .filter(Boolean)
    .map((m) => {
      const bits = m.split(';');
      const ietf = bits[0].split('-');
      const hasScript = ietf.length === 3;

      return {
        code: ietf[0],
        script: hasScript ? ietf[1] : null,
        region: hasScript ? ietf[2] : ietf[1],
        quality: bits[1] ? Number.parseFloat(bits[1].split('=')[1]) : 1.0
      };
    })
    .sort((a, b) => b.quality - a.quality);
}
