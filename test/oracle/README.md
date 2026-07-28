# Oracle reference data

Output of Peter Meyer's original timewave C program
(`reference/original-c/twz-generator.c`, compiled locally with clang on
macOS, wave factor 64), used by `test/validate.mts` as ground truth.

| File | Command | Coverage |
|---|---|---|
| `last67y.csv` | `./twz 25600 0 23040 64` | 0–25,600 days before zero in 16-day steps (the final 67-year cycle and change) |
| `final2d.csv` | `./twz 2 0 10 64` | final 2 days in 10-minute steps |
| `deeptime.csv` | `./twz X 0 999999999999999 64` (first data row) for X ∈ 383 … 1.6e12 | spot values out to ~4.4 billion years |

Normalization applied to the raw program output (numeric content
untouched): removed the leading blank line and the trailing comma the
C `printf` loop emits on every data row, so all rows have the same five
columns as the header; `deeptime.csv` (generated row-by-row, headerless)
was given the same header line.
