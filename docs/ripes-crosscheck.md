# Ripes cross-check (B8 iii)

Each LIMO test program is translated to RV32I and run on Ripes' five-stage pipeline. The results must agree with the LIMO simulator, or the difference must be explained.

## How to run each program in Ripes

1. Open Ripes. Choose the processor **RV32I 5-stage processor** (with forwarding and hazard detection). Use the **Editor** tab and switch the source type to **Assembly**.
2. Paste one program from the section "RV32I versions" below.
3. For programs that use memory (2, 3, 6 and 8): in the **Processor** tab, double-click register **x2** and set it to `0x10000000` (the start of the data segment). Do this after any reset. The LIMO programs use address 0; Ripes puts data at `0x10000000`, so the same offsets apply from that base.
4. Run one cycle at a time until the last instruction, `fin: beq x0, x0, fin`, is in the **WB** stage. Read the **Cycles** counter and the registers.
5. Write the numbers into the table below.

## What to compare

- **Registers and memory**: must match the "Expected results" column. Program 2 is the one difference: x4 and x5 hold `0x10000014` instead of 20, because they point into the data segment.
- **Cycles**: the LIMO simulator counts the cycle in which `fin` is in WB. If Ripes shows exactly **one less**, that is only its counting convention (it counts completed clock edges), and you should say so in the report. Any other difference must be explained.

## How the LIMO cycle counts are derived by hand

`cycles = instructions + 4 + stalls + 2 x (taken branches that flush)`, counting the final self-branch once.

## Results

| Prog | What it tests | Expected results | Hand-derived cycles (forwarding ON) | LIMO simulator | LIMO, forwarding OFF | Ripes cycles | Agree? / explanation |
|---|---|---|---|---|---|---|---|
| 1 | R and I arithmetic, logic, shift (every ALU instruction) | r3=7 r4=5 r5=12 r6=2 r7=16 r8=4 r9=7 r10=8 r11=20 | 10 + 4 = 14 | 14 | 17 |  |  |
| 2 | Array sum loop: store, load, load-use stall, backward branch taken 4 times | r3=50 r4=20 r5=20 r6=150 r7=50; memory 10,20,30,40,50 at offsets 0,4,8,12,16 | 34 + 4 + 5 stalls + 4x2 flush = 51 | 51 | 76 |  |  |
| 3 | RAW forwarding, load-use stall, taken branch with flush | r3=10 r4=30 r5=40 r6=40 r7=50 r10=9; memory[0]=40 | 9 + 4 + 1 stall + 2 flush = 16 | 16 | 23 |  |  |
| 4 | Branch NOT taken (tekano) | r3=5 r4=6 r5=1 r6=2 | 6 + 4 = 10 | 10 | 12 |  |  |
| 5 | RAW chain resolved by forwarding | r3=1 r4=2 r5=4 r6=8 | 5 + 4 = 9 | 9 | 15 |  |  |
| 6 | Load-use stall | r3=25 r4=25 r5=30; memory[0]=25 | 5 + 4 + 1 stall = 10 | 10 | 13 |  |  |
| 7 | Branch TAKEN (phapano) and flush | r3=1 r4=0 r5=0 r6=3 | 4 + 4 + 2 flush = 10 | 10 | 12 |  |  |
| 8 | Shift, logic and memory mix | r3=3 r4=48 r5=32 r6=51 r7=32 r8=51; memory[8]=51 | 8 + 4 = 12 | 12 | 18 |  |  |

## RV32I versions (paste into Ripes)

Translation rules: `eketsa`=add, `fokotsa`=sub, `eketsa ho`=addi, `le`=and, `kapa`=or, `kopanyetsa`=andi, `suthisa`=slli, `jara`=lw, `boloka`=sw, `tekano`=beq, `phapano`=bne. LIMO register rN is RV32I xN. Memory operands that used r0 as the base use x2 instead (set to `0x10000000`).

### Program 1

```asm
# LIMO example 1 - arithmetic and logic
# Expected: r5=12 r6=2 r7=16 r8=4 r9=7 r10=8 r11=20
addi x3, x0, 7   # r3 = 7
addi x4, x0, 5   # r4 = 5
add x5, x3, x4   # r5 = 7 + 5 = 12
sub x6, x3, x4   # r6 = 7 - 5 = 2
addi x7, x5, 4   # r7 = 12 + 4 = 16
and x8, x5, x3   # r8 = 12 AND 7 = 4
or x9, x3, x4   # r9 = 7 OR 5 = 7
andi x10, x5, 8   # r10 = 12 AND 8 = 8
slli x11, x4, 2   # r11 = 5 << 2 = 20
fin: beq x0, x0, fin   # halt: branch to itself
```

### Program 2

```asm
# LIMO example 2 - array sum with a loop
# Stores 10,20,30,40,50 at addresses 0..16, then adds them up.
# Expected: r6 = 150, r4 = 20
addi x3, x0, 10
sw x3, 0(x2)
addi x3, x0, 20
sw x3, 4(x2)
addi x3, x0, 30
sw x3, 8(x2)
addi x3, x0, 40
sw x3, 12(x2)
addi x3, x0, 50
sw x3, 16(x2)
addi x4, x2, 0   # r4 = byte offset of the current element
addi x5, x2, 20   # r5 = end offset (5 words)
addi x6, x0, 0   # r6 = sum
loop: lw x7, 0(x4)   # r7 = array[i]
add x6, x6, x7   # sum = sum + r7  (load-use stall)
addi x4, x4, 4   # next element
bne x4, x5, loop   # repeat until r4 == 20
fin: beq x0, x0, fin   # halt
```

### Program 3

```asm
# LIMO example 3 - hazards and control
# RAW with forwarding, a load-use stall, and a taken branch that flushes 2.
# Expected: r4=30 r5=40 r6=40 r7=50 r8=0 r9=0 r10=9
addi x3, x0, 10
addi x4, x3, 20   # RAW on r3 (forwarded)
add x5, x4, x3   # RAW on r4 and r3 (forwarded)
sw x5, 0(x2)   # mem[0] = 40
lw x6, 0(x2)   # r6 = 40
add x7, x6, x3   # uses r6 right after the load: 1 stall
beq x3, x3, over   # always taken
addi x8, x0, 1   # flushed
addi x9, x0, 2   # flushed
over: addi x10, x0, 9
fin: beq x0, x0, fin   # halt
```

### Program 4

```asm
# Program 4 - branch NOT taken (tekano with different registers)
# r3=5, r4=6 differ, so tekano falls through and r5 = 1 runs.
addi x3, x0, 5
addi x4, x0, 6
beq x3, x4, skip
addi x5, x0, 1
skip: addi x6, x0, 2
fin: beq x0, x0, fin
```

### Program 5

```asm
# Program 5 - RAW chain, resolved by forwarding (no stalls)
addi x3, x0, 1
add x4, x3, x3
add x5, x4, x4
add x6, x5, x5
fin: beq x0, x0, fin
```

### Program 6

```asm
# Program 6 - load-use stall (one bubble even with forwarding)
addi x3, x0, 25
sw x3, 0(x2)
lw x4, 0(x2)
addi x5, x4, 5
fin: beq x0, x0, fin
```

### Program 7

```asm
# Program 7 - phapano taken: skips two instructions (flush)
addi x3, x0, 1
bne x3, x0, target
addi x4, x0, 7
addi x5, x0, 8
target: addi x6, x0, 3
fin: beq x0, x0, fin
```

### Program 8

```asm
# Program 8 - shift, logic and memory mix
addi x3, x0, 3
slli x4, x3, 4
andi x5, x4, 40
or x6, x4, x3
and x7, x6, x5
sw x6, 8(x2)
lw x8, 8(x2)
fin: beq x0, x0, fin
```

