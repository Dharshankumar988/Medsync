from web3 import Web3
from eth_account import Account
from app.blockchain.config import blockchain_settings
import json

class Web3Client:
    def __init__(self):
        self.w3 = Web3(Web3.HTTPProvider(blockchain_settings.POLYGON_RPC_URL))
        self.account = None
        if blockchain_settings.BACKEND_PRIVATE_KEY != "0x0000000000000000000000000000000000000000000000000000000000000000":
            self.account = Account.from_key(blockchain_settings.BACKEND_PRIVATE_KEY)

    def load_contract(self, address: str, abi_name: str):
        # Placeholder for loading actual compiled ABI JSON
        return self.w3.eth.contract(address=Web3.to_checksum_address(address), abi=[])

    def sign_and_send(self, contract_function):
        if contract_function is None or not self.account:
            print("BLOCKCHAIN: Running in mock mode. No real tx sent.")
            return "mock_tx_hash_12345"
            
        nonce = self.w3.eth.get_transaction_count(self.account.address)
        tx = contract_function.build_transaction({
            'chainId': 80002, # Amoy
            'gas': 2000000,
            'gasPrice': self.w3.eth.gas_price,
            'nonce': nonce,
        })
        signed_tx = self.w3.eth.account.sign_transaction(tx, private_key=self.account.key)
        tx_hash = self.w3.eth.send_raw_transaction(signed_tx.rawTransaction)
        return self.w3.to_hex(tx_hash)

w3_client = Web3Client()
