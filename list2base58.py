#!/usr/bin/env python3
"""
list2base58.py  –  turn a Solana secret-key list into a base58 string

Usage
-----
$ python list2base58.py "[12,34, ... , 255]"
# or read from a JSON/CSV file
$ python list2base58.py ./mykey.json
"""

import argparse
import ast
import json
import sys
from pathlib import Path

import base58            # pip install base58

# ---------- core -------------------------------------------------------------

def list_to_base58(int_list: list[int]) -> str:
    """Convert a 32- or 64-element integer list (0-255) to base58."""
    if len(int_list) not in (32, 64):
        raise ValueError(
            f"Expected 32 or 64 integers, got {len(int_list)}"
        )
    if any(not (0 <= n <= 255) for n in int_list):
        raise ValueError("All list items must be in 0-255 range")
    return base58.b58encode(bytes(int_list)).decode()

# ---------- helpers ----------------------------------------------------------

def load_list(source: str) -> list[int]:
    """
    Accept direct literal (e.g. "[1,2,3]") or a path to:
        • .json  (array of numbers)
        • .csv   (comma-separated numbers)
        • .txt   (whitespace-separated numbers)
    """
    path = Path(source)
    if path.exists():
        text = path.read_text().strip()
        if path.suffix == ".json":
            return json.loads(text)
        elif path.suffix == ".csv":
            return [int(x) for x in text.split(",") if x.strip()]
        else:                     # .txt, .key, etc.
            return [int(x) for x in text.replace(",", " ").split()]
    else:
        # treat source itself as a Python-ish literal list
        return ast.literal_eval(source)

# ---------- CLI --------------------------------------------------------------

def main() -> None:
    p = argparse.ArgumentParser(
        description="Generate base58 Solana private key from integer list"
    )
    p.add_argument("source", help="List literal or path to file")
    args = p.parse_args()

    try:
        key_ints = load_list(args.source)
        b58 = list_to_base58(key_ints)
        print(b58)
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
