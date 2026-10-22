import logging
from typing import List, Dict, Any
from web3.contract import Contract
from app.blockchain.contracts.loader import contract_loader

logger = logging.getLogger("blockchain.monitoring.events")

def serialize_event_args(obj: Any) -> Any:
    """
    Recursively converts HexBytes/bytes to hex strings and complex types
    so that event dictionaries are safely JSON serializable for JSONB storage.
    """
    if isinstance(obj, (bytes, bytearray)):
        return "0x" + obj.hex()
    elif isinstance(obj, dict):
        return {str(k): serialize_event_args(v) for k, v in obj.items()}
    elif isinstance(obj, (list, tuple, set)):
        return [serialize_event_args(item) for item in obj]
    elif hasattr(obj, "hex") and callable(getattr(obj, "hex")):
        return "0x" + obj.hex()
    return obj

class EventListenerFramework:
    """
    Decodes events from transaction receipts or queries past events.
    """
    @staticmethod
    def decode_logs(contract_name: str, logs: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        try:
            contract: Contract = contract_loader.get_contract(contract_name)
            decoded_events = []
            
            for event_abi in contract.events:
                # We iterate over the contract's defined events to decode the raw logs
                event_name = event_abi.event_name
                event_type = getattr(contract.events, event_name)
                
                for log in logs:
                    try:
                        # Attempt to decode the log with this specific event
                        decoded = event_type().process_log(log)
                        tx_h = log.get('transactionHash')
                        tx_str = tx_h.hex() if hasattr(tx_h, 'hex') else str(tx_h)
                        blk = log.get('blockNumber', 0)
                        blk_num = int(blk, 16) if isinstance(blk, str) else int(blk)
                        idx = log.get('logIndex', 0)
                        idx_num = int(idx, 16) if isinstance(idx, str) else int(idx)

                        decoded_events.append({
                            "event": event_name,
                            "args": serialize_event_args(dict(decoded.args)),
                            "blockNumber": blk_num,
                            "transactionHash": tx_str,
                            "logIndex": idx_num
                        })
                    except Exception:
                        # This log doesn't match this event type, skip
                        continue
                        
            return decoded_events
        except Exception as e:
            logger.error(f"Failed to decode events for {contract_name}: {e}")
            return []

    @staticmethod
    def get_past_events(contract_name: str, event_name: str, from_block: int, to_block: int = 'latest'):
        try:
            contract = contract_loader.get_contract(contract_name)
            event_type = getattr(contract.events, event_name)
            
            events = event_type().get_logs(fromBlock=from_block, toBlock=to_block)
            results = []
            for e in events:
                tx_h = e.transactionHash
                tx_str = tx_h.hex() if hasattr(tx_h, 'hex') else str(tx_h)
                results.append({
                    "event": event_name,
                    "args": serialize_event_args(dict(e.args)),
                    "blockNumber": int(e.blockNumber),
                    "transactionHash": tx_str,
                    "logIndex": getattr(e, 'logIndex', 0)
                })
            return results
        except Exception as e:
            err_msg = str(e)
            if "429" in err_msg or "too many requests" in err_msg.lower() or "compute units" in err_msg.lower():
                logger.warning(f"Rate limited (429) fetching past events {event_name} for {contract_name}: {err_msg[:120]}")
                raise
            logger.error(f"Failed to fetch past events {event_name} for {contract_name}: {e}")
            return []

event_listener = EventListenerFramework()
