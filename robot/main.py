#!/usr/bin/env python3
"""
CryptoInvestor Trading Robot
============================
Consumes decrypted Binance API keys from the backend via mTLS
to execute automated trading strategies.

Prerequisites (PR 3):
- Generate certificates: cd backend && ./scripts/generate-certs.sh
- Configure robot certificate paths below
- Backend robot server running on port 3001 with mTLS enabled

Run: python main.py
"""

import os
import ssl
import sys
import time
import urllib.request

# ── Configuration ───────────────────────────────────────────
BACKEND_URL = os.environ.get("ROBOT_BACKEND_URL", "https://localhost:3001")
USER_ID = os.environ.get("ROBOT_USER_ID", "")

CERT_PATH = os.environ.get("ROBOT_CERT", "../backend/certs/robot.crt")
KEY_PATH = os.environ.get("ROBOT_KEY", "../backend/certs/robot.key")
CA_PATH = os.environ.get("ROBOT_CA", "../backend/certs/ca.crt")

POLL_INTERVAL_SECONDS = int(os.environ.get("ROBOT_POLL_INTERVAL", "30"))


# ── mTLS SSL Context ────────────────────────────────────────
def create_mtls_context() -> ssl.SSLContext:
    context = ssl.create_default_context(cafile=CA_PATH)
    context.load_cert_chain(certfile=CERT_PATH, keyfile=KEY_PATH)
    context.verify_mode = ssl.CERT_REQUIRED
    return context


# ── Fetch Decrypted Keys ────────────────────────────────────
def fetch_keys(user_id: str, context: ssl.SSLContext) -> dict | None:
    url = f"{BACKEND_URL}/api/keys/{user_id}"
    try:
        req = urllib.request.Request(url, method="GET")
        with urllib.request.urlopen(req, context=context, timeout=10) as resp:
            if resp.status != 200:
                print(f"[Robot] Unexpected status {resp.status}")
                return None
            import json

            data = json.loads(resp.read().decode("utf-8"))
            return data.get("data")
    except Exception as e:
        print(f"[Robot] Failed to fetch keys: {e}")
        return None


# ── Trading Logic Placeholder ───────────────────────────────
def execute_strategy(api_key: str, secret_key: str) -> None:
    """Placeholder for actual trading strategy execution."""
    print(f"[Robot] Executing strategy with API key {api_key[:4]}...{api_key[-4:]}")
    # TODO: integrate with python-binance or ccxt
    time.sleep(1)
    print("[Robot] Strategy cycle complete.")


# ── Main Loop ───────────────────────────────────────────────
def main() -> None:
    if not USER_ID:
        print("[Robot] ERROR: ROBOT_USER_ID environment variable is required.")
        sys.exit(1)

    missing = [p for p in (CERT_PATH, KEY_PATH, CA_PATH) if not os.path.exists(p)]
    if missing:
        print(f"[Robot] ERROR: Missing certificate files: {missing}")
        print("[Robot] Run: cd backend && ./scripts/generate-certs.sh")
        sys.exit(1)

    print("[Robot] Starting CryptoInvestor Trading Robot...")
    print(f"[Robot] Backend: {BACKEND_URL}")
    print(f"[Robot] User ID: {USER_ID}")
    print(f"[Robot] Poll interval: {POLL_INTERVAL_SECONDS}s")

    context = create_mtls_context()

    while True:
        keys = fetch_keys(USER_ID, context)
        if keys and keys.get("apiKey") and keys.get("secretKey"):
            execute_strategy(keys["apiKey"], keys["secretKey"])
        else:
            print("[Robot] No keys available. Waiting...")

        time.sleep(POLL_INTERVAL_SECONDS)


if __name__ == "__main__":
    main()
