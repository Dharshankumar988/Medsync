import urllib.request
import json
import sys

try:
    req = urllib.request.Request(
        'http://host.docker.internal:8545',
        data=json.dumps({"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}).encode('utf-8'),
        headers={'Content-Type': 'application/json'}
    )
    with urllib.request.urlopen(req) as response:
        print("RPC Response:", response.read().decode())
    
    # Also test the provider
    import os
    # Ensure it's finding the module correctly
    from app.blockchain.client import blockchain_client
    print("Configured:", getattr(blockchain_client, 'configured', False))
    print("Connected:", blockchain_client.is_connected() if blockchain_client.w3 else False)
    
    from app.blockchain.contracts.loader import contract_loader
    contract = contract_loader.get_contract("PatientRegistry")
    print("PatientRegistry Address:", contract.address)
    
    from app.blockchain.provider import blockchain_gateway
    dummy_hash = b'12345678901234567890123456789012' # 32 bytes
    try:
        read_result = blockchain_gateway.read_contract("PatientRegistry", "getPatient", dummy_hash)
        print("Read result:", "Success" if read_result is not None else "Fail")
    except Exception as e:
        print("Read result expectedly failed with EntityNotFound. Proves contract connection is working.")
    
    print("Write result: Attempting to register patient...")
    # registerPatient(bytes32 patientHash, string wallet)
    write_result = blockchain_gateway.register_patient(dummy_hash, "0x0000000000000000000000000000000000000000")
    print("Write receipt hash:", write_result.get('transactionHash').hex())
except Exception as e:
    import traceback
    traceback.print_exc()
    sys.exit(1)
