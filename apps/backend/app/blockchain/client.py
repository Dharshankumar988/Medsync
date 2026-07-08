import json
import os
from web3 import Web3
from eth_account import Account
from app.blockchain.config import blockchain_settings
import logging

logger = logging.getLogger("blockchain_client")

class Web3Client:
    def __init__(self):
        self.w3 = Web3(Web3.HTTPProvider(blockchain_settings.POLYGON_RPC_URL))
        self.account = None
        
        # Avoid loading dummy key from default
        if blockchain_settings.BACKEND_PRIVATE_KEY and blockchain_settings.BACKEND_PRIVATE_KEY != "0x0000000000000000000000000000000000000000000000000000000000000000":
            try:
                self.account = Account.from_key(blockchain_settings.BACKEND_PRIVATE_KEY)
                logger.info(f"Loaded blockchain account: {self.account.address}")
            except Exception as e:
                logger.error(f"Failed to load private key: {e}")

    def get_abi(self, contract_name: str):
        # Load ABI from exported Hardhat artifacts
        base_dir = os.path.dirname(os.path.abspath(__file__))
        abi_path = os.path.join(base_dir, "abi", f"{contract_name}.json")
        try:
            with open(abi_path, 'r') as f:
                return json.load(f)
        except Exception as e:
            logger.error(f"Failed to load ABI for {contract_name} at {abi_path}: {e}")
            return []

    def load_contract(self, address: str, contract_name: str):
        abi = self.get_abi(contract_name)
        if not abi:
            raise ValueError(f"ABI for {contract_name} could not be loaded.")
        return self.w3.eth.contract(address=Web3.to_checksum_address(address), abi=abi)

    def estimate_gas_with_buffer(self, tx):
        try:
            estimated_gas = self.w3.eth.estimate_gas(tx)
            return int(estimated_gas * 1.2) # 20% buffer
        except Exception as e:
            logger.warning(f"Gas estimation failed, using default limit. Error: {e}")
            return 300000

    def send_and_wait_transaction(self, contract_function):
        if not self.account:
            raise ValueError("Backend private key not configured. Cannot sign transaction.")
            
        nonce = self.w3.eth.get_transaction_count(self.account.address)
        
        # Build base transaction
        tx = contract_function.build_transaction({
            'chainId': 80002, # Amoy
            'nonce': nonce,
            'from': self.account.address
        })
        
        # Add dynamic gas
        tx['gas'] = self.estimate_gas_with_buffer(tx)
        
        # EIP-1559 Fee structure
        try:
            base_fee = self.w3.eth.get_block('latest')['baseFeePerGas']
            tx['maxFeePerGas'] = int(base_fee * 1.5)
            tx['maxPriorityFeePerGas'] = self.w3.eth.max_priority_fee
            
            # Remove legacy gasPrice if present
            if 'gasPrice' in tx:
                del tx['gasPrice']
        except Exception:
            # Fallback to legacy
            tx['gasPrice'] = self.w3.eth.gas_price

        # Sign and Send
        signed_tx = self.w3.eth.account.sign_transaction(tx, private_key=self.account.key)
        tx_hash = self.w3.eth.send_raw_transaction(signed_tx.rawTransaction)
        
        hex_hash = self.w3.to_hex(tx_hash)
        logger.info(f"Transaction sent. Hash: {hex_hash}. Waiting for receipt...")
        
        # Wait for receipt
        receipt = self.w3.eth.wait_for_transaction_receipt(tx_hash, timeout=120)
        
        if receipt.status != 1:
            raise Exception(f"Transaction reverted by the EVM. Receipt: {receipt}")
            
        return {
            "transactionHash": hex_hash,
            "blockNumber": receipt.blockNumber,
            "gasUsed": receipt.gasUsed,
            "status": receipt.status
        }

w3_client = Web3Client()
