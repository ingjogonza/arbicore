#!/usr/bin/env python3
"""
CryptoInvestor Trading Robot
============================
Always-alive process that fetches ALL active decrypted Binance API keys
from the backend at startup and keeps them in memory for trading.

Architecture:
  - Boot → GET /api/keys (mTLS) → all active keys → trade
  - No polling, no Redis cache, no per-user config.
  - If the process dies, the container restarts it (docker restart policy).

Run: python main.py
"""

import json
import os
import ssl
import sys
import time
import urllib.request

# ── Configuration ───────────────────────────────────────────
BACKEND_URL = os.environ.get("ROBOT_BACKEND_URL", "https://localhost:3001")

CERT_PATH = os.environ.get("ROBOT_CERT", "../backend/certs/robot.crt")
KEY_PATH = os.environ.get("ROBOT_KEY", "../backend/certs/robot.key")
CA_PATH = os.environ.get("ROBOT_CA", "../backend/certs/ca.crt")


# ── mTLS SSL Context ────────────────────────────────────────
def create_mtls_context() -> ssl.SSLContext:
    context = ssl.create_default_context(cafile=CA_PATH)
    context.load_cert_chain(certfile=CERT_PATH, keyfile=KEY_PATH)
    context.verify_mode = ssl.CERT_REQUIRED
    return context


# ── Fetch All Active Keys ───────────────────────────────────
def fetch_all_keys(context: ssl.SSLContext) -> list[dict]:
    """GET /api/keys → list of { userId, apiKey, secretKey, label }"""
    url = f"{BACKEND_URL}/api/keys"
    try:
        req = urllib.request.Request(url, method="GET")
        with urllib.request.urlopen(req, context=context, timeout=10) as resp:
            if resp.status != 200:
                print(f"[Robot] Unexpected status {resp.status}")
                return []
            data = json.loads(resp.read().decode("utf-8"))
            return data.get("data", [])
    except Exception as e:
        print(f"[Robot] Failed to fetch keys: {e}")
        return []


# ── Trading Logic ───────────────────────────────────────────────
def execute_strategy(user_id: str, api_key: str, secret_key: str, label: str) -> None:
    """Placeholder — replace with actual trading logic."""
    print(
        f"[Robot] Trading {label} for user {user_id[:8]}... "
        f"key {api_key[:4]}...{api_key[-4:]}"
    )
    # TODO: integrate with python-binance or ccxt
    time.sleep(0.5)
    print(f"[Robot]   ✓ Trade cycle complete for {user_id[:8]}...")


# ── Main Loop ───────────────────────────────────────────────
def main() -> None:
    missing = [p for p in (CERT_PATH, KEY_PATH, CA_PATH) if not os.path.exists(p)]
    if missing:
        print(f"[Robot] ERROR: Missing certificate files: {missing}")
        print("[Robot] Run: cd backend && ./scripts/generate-certs.sh")
        sys.exit(1)

    print("[Robot] 🔄 CryptoInvestor Trading Robot")
    print(f"[Robot] Backend: {BACKEND_URL}")
    print(f"[Robot] Cert:    {CERT_PATH}")

    context = create_mtls_context()

    # ── Boot: fetch ALL keys once ───────────────────────────
    print("[Robot] 🚀 Fetching all active API keys...")
    all_keys = fetch_all_keys(context)

    if not all_keys:
        print(
            "[Robot] ⚠ No active keys found. "
            "Users must store keys via POST /api/keys first."
        )
        print("[Robot] ⏳ Waiting 60s before retry...")
        time.sleep(60)
        all_keys = fetch_all_keys(context)

    print(f"[Robot] ✅ Loaded {len(all_keys)} active key(s)")

    # ── Trading loop ────────────────────────────────────────
    print("[Robot] 📈 Starting trading loop (always alive)...")
    while True:
        for entry in all_keys:
            try:
                execute_strategy(
                    user_id=entry["userId"],
                    api_key=entry["apiKey"],
                    secret_key=entry["secretKey"],
                    label=entry.get("label", "Binance"),
                )
            except Exception as e:
                print(f"[Robot] ❌ Error trading user {entry['userId'][:8]}: {e}")

        # Sleep between full cycles
        time.sleep(30)


if __name__ == "__main__":
    main()
