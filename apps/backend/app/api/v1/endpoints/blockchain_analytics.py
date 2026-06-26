from __future__ import annotations

from collections import defaultdict
from datetime import datetime, timedelta, timezone
from typing import Any

from fastapi import APIRouter

from app.blockchain.client import w3_client
from app.blockchain.config import blockchain_settings
from app.schemas.response import APIResponse

router = APIRouter()

POLYGONSCAN_TX_BASE = "https://amoy.polygonscan.com/tx/"
POLYGONSCAN_ADDRESS_BASE = "https://amoy.polygonscan.com/address/"


def _short_hash(value: str, keep: int = 8) -> str:
    if len(value) <= keep * 2:
        return value
    return f"{value[:keep]}...{value[-keep:]}"


def _checksum_or_raw(address: str) -> str:
    try:
        return w3_client.w3.to_checksum_address(address)
    except Exception:
        return address


def _safe_int(value: Any, default: int = 0) -> int:
    try:
        return int(value)
    except Exception:
        return default


PLACEHOLDER_ADDRESSES = {
    blockchain_settings.DOCTOR_REGISTRY_ADDRESS,
    blockchain_settings.PHARMACY_REGISTRY_ADDRESS,
    blockchain_settings.RECORD_REGISTRY_ADDRESS,
    blockchain_settings.PRESCRIPTION_REGISTRY_ADDRESS,
    blockchain_settings.CONSENT_MANAGER_ADDRESS,
    blockchain_settings.AUDIT_LOGGER_ADDRESS,
}


@router.get("/analytics", response_model=APIResponse[dict])
async def blockchain_analytics() -> APIResponse[dict]:
    web3 = w3_client.w3
    connected = False
    chain_id = 80002
    latest_block = 0
    gas_price = 0
    wallet_address = getattr(w3_client.account, "address", None)
    wallet_balance_wei = 0

    try:
        connected = web3.is_connected()
        chain_id = _safe_int(web3.eth.chain_id, 80002)
        latest_block = _safe_int(web3.eth.block_number)
        gas_price = _safe_int(web3.eth.gas_price)
        if wallet_address:
            wallet_balance_wei = _safe_int(web3.eth.get_balance(wallet_address))
    except Exception:
        connected = False

    contract_addresses = [
        ("Doctor Registry", blockchain_settings.DOCTOR_REGISTRY_ADDRESS),
        ("Pharmacy Registry", blockchain_settings.PHARMACY_REGISTRY_ADDRESS),
        ("Medical Records", blockchain_settings.RECORD_REGISTRY_ADDRESS),
        ("Prescription Registry", blockchain_settings.PRESCRIPTION_REGISTRY_ADDRESS),
        ("Consent Manager", blockchain_settings.CONSENT_MANAGER_ADDRESS),
        ("Audit Logger", blockchain_settings.AUDIT_LOGGER_ADDRESS),
    ]

    contract_stats = []
    recent_transactions = []
    gas_by_contract: dict[str, int] = defaultdict(int)
    calls_by_contract: dict[str, int] = defaultdict(int)
    last_interaction_by_contract: dict[str, str] = {}
    tx_count_by_day: dict[str, int] = defaultdict(int)
    gas_spent_by_day: dict[str, int] = defaultdict(int)
    successful_transactions = 0
    failed_transactions = 0
    pending_transactions = 0
    confirmation_times: list[float] = []
    total_gas_used = 0
    highest_gas = 0
    lowest_gas = 0

    now = datetime.now(timezone.utc)
    start_of_today = datetime(now.year, now.month, now.day, tzinfo=timezone.utc)
    start_of_week = start_of_today - timedelta(days=now.weekday())
    start_of_month = datetime(now.year, now.month, 1, tzinfo=timezone.utc)

    scanned_blocks = 0
    max_blocks = 30
    start_block = max(latest_block - max_blocks + 1, 0)

    if connected and latest_block >= start_block:
        for block_number in range(latest_block, start_block - 1, -1):
            try:
                block = web3.eth.get_block(block_number, full_transactions=True)
            except Exception:
                continue

            block_timestamp = datetime.fromtimestamp(block.timestamp, tz=timezone.utc)
            day_key = block_timestamp.date().isoformat()
            for tx in block.transactions:
                tx_hash = tx.hash.hex()
                to_address = tx.get("to") if isinstance(tx, dict) else tx.to
                method_name = "Transfer"
                gas_used = _safe_int(tx.get("gas", 0) if isinstance(tx, dict) else tx.gas)
                if to_address:
                    contract_key = str(to_address)
                    gas_by_contract[contract_key] += gas_used
                    calls_by_contract[contract_key] += 1
                    last_interaction_by_contract[contract_key] = block_timestamp.isoformat()
                recent_transactions.append({
                    "hash": tx_hash,
                    "shortHash": _short_hash(tx_hash),
                    "contract": _checksum_or_raw(to_address) if to_address else "Contract Creation",
                    "method": method_name,
                    "gasUsed": gas_used,
                    "timestamp": block_timestamp.isoformat(),
                    "status": "Success",
                    "explorerUrl": f"{POLYGONSCAN_TX_BASE}{tx_hash}",
                })
                tx_count_by_day[day_key] += 1
                gas_spent_by_day[day_key] += gas_used
                total_gas_used += gas_used
                highest_gas = max(highest_gas, gas_used)
                lowest_gas = gas_used if lowest_gas == 0 else min(lowest_gas, gas_used)
                successful_transactions += 1
                scanned_blocks += 1
                if scanned_blocks >= 20:
                    break
            if scanned_blocks >= 20:
                break

    recent_transactions = recent_transactions[:20]

    if not recent_transactions:
        successful_transactions = 0
        failed_transactions = 0
        pending_transactions = 0

    for index, (name, address) in enumerate(contract_addresses):
        contract_gas_spent = gas_by_contract.get(address, 0)
        contract_stats.append({
            "name": name,
            "address": address,
            "status": "Configured" if address and address not in PLACEHOLDER_ADDRESSES else "Not configured",
            "lastInteraction": last_interaction_by_contract.get(address, "No recent activity"),
            "totalCalls": _safe_int(calls_by_contract.get(address, 0)),
            "gasSpent": contract_gas_spent,
            "explorerUrl": f"{POLYGONSCAN_ADDRESS_BASE}{address}",
        })

    today_gas = gas_spent_by_day.get(now.date().isoformat(), 0)
    this_week_gas = sum(value for day, value in gas_spent_by_day.items() if datetime.fromisoformat(day).date() >= start_of_week.date())
    this_month_gas = sum(value for day, value in gas_spent_by_day.items() if datetime.fromisoformat(day).date() >= start_of_month.date())
    average_gas = int(total_gas_used / successful_transactions) if successful_transactions else 0
    average_confirmation_time = round(sum(confirmation_times) / len(confirmation_times), 2) if confirmation_times else 0

    gas_series = []
    tx_series = []
    for day in sorted(gas_spent_by_day.keys()):
        gas_series.append({"label": day, "value": gas_spent_by_day[day]})
        tx_series.append({"label": day, "value": tx_count_by_day[day]})

    return APIResponse(
        message="Blockchain analytics loaded",
        data={
            "network": {
                "name": "Polygon",
                "chainId": chain_id,
                "rpc": blockchain_settings.POLYGON_RPC_URL,
                "connected": connected,
                "wallet": wallet_address,
            },
            "smartContracts": contract_stats,
            "gasAnalytics": {
                "totalGasUsed": total_gas_used,
                "averageGas": average_gas,
                "highestGas": highest_gas,
                "lowestGas": lowest_gas,
                "todayGas": today_gas,
                "thisWeekGas": this_week_gas,
                "thisMonthGas": this_month_gas,
            },
            "transactionAnalytics": {
                "totalTransactions": successful_transactions + failed_transactions + pending_transactions,
                "successful": successful_transactions,
                "failed": failed_transactions,
                "pending": pending_transactions,
                "averageConfirmationTime": average_confirmation_time,
            },
            "contractStatistics": contract_stats,
            "charts": {
                "gasSpentOverTime": gas_series,
                "transactionsPerDay": tx_series,
                "successfulVsFailed": [
                    {"label": "Successful", "value": successful_transactions},
                    {"label": "Failed", "value": failed_transactions},
                ],
                "gasByContract": [
                    {"label": label, "value": value}
                    for label, value in sorted(gas_by_contract.items(), key=lambda item: item[1], reverse=True)
                ],
            },
            "recentActivity": recent_transactions,
            "wallet": {
                "address": wallet_address,
                "balanceWei": wallet_balance_wei,
                "balanceMatic": float(web3.from_wei(wallet_balance_wei, "ether")) if wallet_balance_wei else 0,
                "network": "Polygon",
                "explorerUrl": f"{POLYGONSCAN_ADDRESS_BASE}{wallet_address}" if wallet_address else None,
            },
            "explorerBaseUrl": "https://amoy.polygonscan.com",
        },
    )