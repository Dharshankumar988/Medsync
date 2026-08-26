import asyncio
import os
import sys

# Ensure backend root is in PYTHONPATH
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.blockchain.client import blockchain_client
from app.blockchain.gateway import blockchain_gateway
from app.blockchain.contracts.loader import contract_loader

async def test_integration():
    print("Testing Backend -> Local Hardhat Node Integration")
    
    if not blockchain_client.configured:
        print("Blockchain Client is NOT configured. Ensure POLYGON_RPC_URL and BACKEND_PRIVATE_KEY are set.")
        return

    # Check connection
    status = blockchain_gateway.get_health_status()
    print("Gateway Health Status:", status)
    
    if not status.is_connected:
        print("Failed to connect to blockchain node.")
        return
        
    print(f"Connected! Network: {status.network_name}, Wallet: {status.wallet_address}")
    
    # Try a read operation (e.g. PatientRegistry)
    try:
        dummy_hash = b"\x00" * 32
        print("Testing read_contract on PatientRegistry.getPatient...")
        # Note: Depending on the contract, calling getPatient with 0x0 might revert if EntityNotFound
        # But we expect a specific revert or result, proving connection
        result = blockchain_gateway.read_contract("PatientRegistry", "getPatient", dummy_hash)
        print("Read Result:", result)
    except Exception as e:
        print("Read operation completed with exception (expected if dummy hash not found):", e)
        
    print("Integration test script finished.")

if __name__ == "__main__":
    asyncio.run(test_integration())
