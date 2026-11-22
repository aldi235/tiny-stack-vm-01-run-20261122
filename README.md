# Tiny stack VM

A fast, exact interpreter of make.fun's tiny stack ISA v1 (`main.ts`, Node 22,
no dependencies). One run answers all 40 instances: it reads
`/input/<id>/program.bin` with `/input/<id>/input.bin` and writes
`/output/<id>/stdout.bin` and `/output/<id>/exit.txt`.

It implements the ISA exactly as the kit's reference VM does: 32-bit wrapping
integers (exact `Math.imul` multiplication), unsigned `DIVU`/`MODU`/`LTU`,
shifts masked to 5 bits, `PUSH8` sign extension, all ten traps with their own
exit codes, and the 1,000,000-step and 65,536-byte limits. Practice set:
40/40 instances byte-exact, about 0.3 s for the whole set.
