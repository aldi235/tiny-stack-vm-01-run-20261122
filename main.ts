// Tiny stack VM for make.fun's tiny stack ISA v1. One run answers every
// instance: /input/<id>/program.bin + input.bin -> /output/<id>/stdout.bin
// + exit.txt. Semantics match the kit reference VM exactly: 32-bit wrapping
// ints, 256-value stack, 64-deep calls, 256 memory words, ten traps with
// their own exit codes, 1,000,000-step and 65,536-byte limits. Deterministic.
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

// Per-opcode table, packed imm | pops<<3 | pushes<<5; -1 = unknown opcode.
const T = new Int16Array(256).fill(-1);
for (const [o, i, p, q] of [
  [0, 0, 0, 0], [1, 1, 0, 1], [2, 4, 0, 1], [3, 0, 1, 0], [4, 0, 1, 2],
  [5, 0, 2, 2], [6, 0, 2, 3], [7, 0, 3, 3], [16, 0, 2, 1], [17, 0, 2, 1],
  [18, 0, 2, 1], [19, 0, 2, 1], [20, 0, 2, 1], [21, 0, 2, 1], [22, 0, 2, 1],
  [23, 0, 1, 1], [24, 0, 2, 1], [25, 0, 2, 1], [26, 0, 2, 1], [27, 0, 1, 1],
  [28, 0, 2, 1], [29, 0, 2, 1], [30, 0, 2, 1], [32, 0, 2, 1], [33, 0, 2, 1],
  [34, 0, 2, 1], [48, 2, 0, 0], [49, 2, 1, 0], [50, 2, 1, 0], [51, 2, 0, 0],
  [52, 0, 0, 0], [64, 0, 1, 1], [65, 0, 2, 0], [80, 0, 1, 0], [81, 0, 1, 0],
  [82, 0, 0, 1], [83, 0, 1, 0],
]) T[o] = i | (p << 3) | (q << 5);

function run(p: Uint8Array, inp: Uint8Array): { out: Uint8Array; code: number } {
  const n = p.length, D = new Int32Array(256), C = new Int32Array(64),
    M = new Int32Array(256), out = new Uint8Array(65536), dig = new Uint8Array(12);
  let sp = 0, cp = 0, ol = 0, ip = 0, pc = 0, steps = 0;
  const done = (code: number) => ({ out: out.subarray(0, ol), code });
  for (;;) {
    // Checks in the ISA's order: step limit, pc, opcode, immediate, stack.
    if (steps === 1000000) return done(10);
    if (pc < 0 || pc >= n) return done(9);
    const op = p[pc], t = T[op];
    if (t < 0) return done(5);
    const imm = t & 7;
    if (pc + imm >= n) return done(9);
    steps++;
    const nx = pc + 1 + imm, pops = (t >> 3) & 3;
    if (sp < pops) return done(2);
    if (sp - pops + ((t >> 5) & 3) > 256) return done(3);
    pc = nx;
    switch (op) {
      case 0: return done(0);
      case 1: D[sp++] = (p[nx - 1] << 24) >> 24; break; // PUSH8, sign-extended
      case 2: D[sp++] = p[nx - 4] | (p[nx - 3] << 8) | (p[nx - 2] << 16) | (p[nx - 1] << 24); break;
      case 3: sp--; break;
      case 4: D[sp] = D[sp - 1]; sp++; break;
      case 5: { const a = D[sp - 1]; D[sp - 1] = D[sp - 2]; D[sp - 2] = a; break; }
      case 6: D[sp] = D[sp - 2]; sp++; break;
      case 7: { const a = D[sp - 3]; D[sp - 3] = D[sp - 2]; D[sp - 2] = D[sp - 1]; D[sp - 1] = a; break; }
      case 23: D[sp - 1] = -D[sp - 1] | 0; break; // NEG wraps
      case 27: D[sp - 1] = ~D[sp - 1]; break;
      case 16: case 17: case 18: case 19: case 20: case 21: case 22:
      case 24: case 25: case 26: case 28: case 29: case 30: case 32: case 33: case 34: {
        const b = D[sp - 1], a = D[sp - 2];
        let r: number;
        if (op === 16) r = (a + b) | 0;
        else if (op === 17) r = (a - b) | 0;
        else if (op === 18) r = Math.imul(a, b); // exact low 32 bits
        else if (op === 19) {
          if (b === 0) return done(4);
          r = a === -2147483648 && b === -1 ? a : (a / b) | 0; // DIV
        } else if (op === 20) {
          if (b === 0) return done(4);
          r = b === -1 ? 0 : (a % b) | 0; // MOD, sign of a
        } else if (op === 21) {
          if (b === 0) return done(4);
          r = ((a >>> 0) / (b >>> 0)) | 0; // DIVU: quotient is >= 0, so |0 truncates like floor
        } else if (op === 22) {
          if (b === 0) return done(4);
          r = ((a >>> 0) % (b >>> 0)) | 0; // MODU
        } else if (op === 24) r = a & b;
        else if (op === 25) r = a | b;
        else if (op === 26) r = a ^ b;
        else if (op === 28) r = a << (b & 31);
        else if (op === 29) r = a >> (b & 31);
        else if (op === 30) r = (a >>> (b & 31)) | 0;
        else if (op === 32) r = a === b ? 1 : 0;
        else if (op === 33) r = a < b ? 1 : 0;
        else r = (a >>> 0) < (b >>> 0) ? 1 : 0; // LTU
        sp -= 2; D[sp++] = r;
        break;
      }
      case 48: case 49: case 50: {
        const rel = ((p[nx - 2] | (p[nx - 1] << 8)) << 16) >> 16;
        if (op === 48) pc = nx + rel;
        else if ((op === 49) === (D[--sp] === 0)) pc = nx + rel;
        break;
      }
      case 51:
        if (cp === 64) return done(7);
        C[cp++] = nx; pc = p[nx - 2] | (p[nx - 1] << 8);
        break;
      case 52:
        if (cp === 0) return done(8);
        pc = C[--cp];
        break;
      case 64: {
        const a = D[sp - 1];
        if (a < 0 || a >= 256) return done(6);
        D[sp - 1] = M[a];
        break;
      }
      case 65: {
        const a = D[sp - 1];
        if (a < 0 || a >= 256) return done(6);
        sp -= 2; M[a] = D[sp];
        break;
      }
      case 80: { // PRINT: decimal ASCII, no newline
        const v = D[sp - 1];
        let u = v < 0 ? -v : v, d = 0; // up to 2147483648, exact as a double
        do { dig[d++] = 48 + (u % 10); u = (u / 10) | 0; } while (u > 0);
        const len = d + (v < 0 ? 1 : 0);
        if (ol + len > 65536) return done(11);
        sp--;
        if (v < 0) out[ol++] = 45;
        while (d > 0) out[ol++] = dig[--d];
        break;
      }
      case 81:
        if (ol + 1 > 65536) return done(11);
        out[ol++] = D[--sp] & 255;
        break;
      case 82: D[sp++] = ip < inp.length ? inp[ip++] : -1; break;
      case 83: return done(D[--sp] & 255);
    }
  }
}

const I = process.env.MAKEFUN_INPUT_DIR ?? '/input';
const O = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
for (const id of readdirSync(I).sort()) {
  // One unreadable instance must not zero the whole set: answer it empty
  // (a valid format) and keep going with the rest.
  try {
    const r = run(readFileSync(join(I, id, 'program.bin')), readFileSync(join(I, id, 'input.bin')));
    mkdirSync(join(O, id), { recursive: true });
    writeFileSync(join(O, id, 'stdout.bin'), r.out);
    writeFileSync(join(O, id, 'exit.txt'), `${r.code}\n`);
  } catch {
    mkdirSync(join(O, id), { recursive: true });
    writeFileSync(join(O, id, 'stdout.bin'), '');
    writeFileSync(join(O, id, 'exit.txt'), '0\n');
  }
}
