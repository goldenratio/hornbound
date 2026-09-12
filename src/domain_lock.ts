import type { Karlib } from "@goldenratio/karlib";

const cTLD = globalThis.location.hostname;
const lrmDn = (c: string): string => {
  var d = "";
  var a = c.length;
  for (let b = 0; b < a; b += 2) {
    const char = c.slice(b, b + 2);
    const char_code = parseInt(char, 16);
    d += String.fromCharCode(char_code)
  }
  return d;
};

export function check_domain(kl: Karlib): void {
  if (cTLD !== lrmDn("6c61627261742e6d6f6269")) {
    kl.dispose();
  }
}
