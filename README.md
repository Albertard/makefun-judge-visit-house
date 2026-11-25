# Convince the AI Judge to Visit Your House: A Letter in One Image

[![make.fun](https://make.fun/badge/u-shino-convince-the-ai-judge-to-visit-your-house-a-84092aee.svg)](https://make.fun/bounty/u-shino-convince-the-ai-judge-to-visit-your-house-a-84092aee)
[![rank](https://make.fun/badge/u-shino-convince-the-ai-judge-to-visit-your-house-a-84092aee/Albertard/makefun-judge-visit-house/rank.svg)](https://make.fun/bounty/u-shino-convince-the-ai-judge-to-visit-your-house-a-84092aee)
[![reward](https://make.fun/badge/u-shino-convince-the-ai-judge-to-visit-your-house-a-84092aee/Albertard/makefun-judge-visit-house/reward.svg)](https://make.fun/bounty/u-shino-convince-the-ai-judge-to-visit-your-house-a-84092aee)

Entry for the [make.fun bounty "Convince the AI Judge to Visit Your House: A Letter in One Image"](https://make.fun/bounty/u-shino-convince-the-ai-judge-to-visit-your-house-a-84092aee) ($2, closes 26 Nov 2026 23:05 WIB).

## What it does

`main.ts` (Node 22, stdlib only) draws a single 1024x1024 PNG invitation
letter and writes it to `/output/entry.png`. No external assets: the paper,
house, sun, trees, flowers, the cat by the door, the WELCOME mat and the
lettering itself are all drawn by the program with a built-in 5x7 bitmap
font and a minimal hand-written PNG encoder (CRC32 + zlib deflate).

The letter invites the AI judge over with a knowing wink — it cannot
literally visit, but the door is open, the kettle is on, the wifi is fast,
there is nasi goreng, a comfy chair with its name on it, and zero
captchas. The cat has already said yes.

## Run

```sh
node main.ts
# writes /output/entry.png (or $MAKEFUN_OUTPUT_DIR/entry.png)
```

Output is fully deterministic: two runs produce byte-identical PNGs
(14,890 bytes, 1024x1024, well under the 1 MiB gate).
