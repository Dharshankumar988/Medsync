import logging
from typing import List, Dict, Any
from web3.contract import Contract
from app.blockchain.contracts.loader import contract_loader

logger = logging.getLogger("blockchain.monitoring.events")

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
                        decoded_events.append({
                            "event": event_name,
                            "args": dict(decoded.args),
                            "blockNumber": log['blockNumber'],
                            "transactionHash": log['transactionHash'].hex(),
                            "logIndex": log.get('logIndex', 0)
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
            return [
                {
                    "event": event_name,
                    "args": dict(e.args),
                    "blockNumber": e.blockNumber,
                    "transactionHash": e.transactionHash.hex(),
                    "logIndex": e.logIndex
                }
                for e in events
            ]
        except Exception as e:
            logger.error(f"Failed to fetch past events {event_name} for {contract_name}: {e}")
            return []

event_listener = EventListenerFramework()
