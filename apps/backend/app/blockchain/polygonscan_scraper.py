import urllib.request
import re
import json
import logging
from typing import Dict, Any, List

logger = logging.getLogger("blockchain.scraper")

class PolygonscanScraper:
    """
    A lightweight web scraper designed as a fallback when RPC and API methods are unavailable.
    It fetches public HTML from Polygonscan and extracts essential contract/transaction data 
    using regex and string matching to avoid requiring external parsing libraries like BeautifulSoup.
    """
    
    BASE_URL = "https://amoy.polygonscan.com"
    HEADERS = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }

    @classmethod
    def scrape_address(cls, address: str) -> Dict[str, Any]:
        """Scrape basic details of an address (Contract Verification, Balance, Tx Count)."""
        url = f"{cls.BASE_URL}/address/{address}"
        try:
            req = urllib.request.Request(url, headers=cls.HEADERS)
            response = urllib.request.urlopen(req, timeout=10)
            html_content = response.read().decode('utf-8', errors='ignore')
            
            # Extract Meta Description
            meta_match = re.search(r'<meta\s+name="Description"\s+content="([^"]+)"', html_content, re.IGNORECASE)
            meta_content = meta_match.group(1) if meta_match else ""
            
            # Parse Contract Status
            contract_status = "Unknown"
            if "Contract: Verified" in meta_content:
                contract_status = "Verified"
            elif "Contract: Unverified" in meta_content:
                contract_status = "Unverified"
                
            # Parse Transactions Count
            tx_count_match = re.search(r'Transactions:\s*([\d,]+)', meta_content)
            tx_count = int(tx_count_match.group(1).replace(',', '')) if tx_count_match else 0
            
            # Parse Balance
            balance_match = re.search(r'Balance:\s*([^\s\|]+)', meta_content)
            balance = balance_match.group(1) if balance_match else "$0"
            
            # Extract basic Tx Hashes (might be empty if Polygonscan loads them via JS)
            tx_hashes_raw = re.findall(r"href=['\"]/tx/(0x[a-fA-F0-9]{64})['\"]", html_content)
            unique_tx_hashes = list(dict.fromkeys(tx_hashes_raw))
            
            return {
                "status": "success",
                "address": address,
                "contract_status": contract_status,
                "transaction_count": tx_count,
                "balance": balance,
                "scraped_tx_hashes": unique_tx_hashes
            }
            
        except Exception as e:
            logger.error(f"Failed to scrape address {address}: {e}")
            return {"status": "error", "message": str(e)}

    @classmethod
    def scrape_transaction(cls, tx_hash: str) -> Dict[str, Any]:
        """Scrape transaction details (Status, Block, From, To, Gas) from its page."""
        url = f"{cls.BASE_URL}/tx/{tx_hash}"
        try:
            req = urllib.request.Request(url, headers=cls.HEADERS)
            response = urllib.request.urlopen(req, timeout=10)
            html = response.read().decode('utf-8', errors='ignore')
            
            # Extract Status
            status = "PENDING"
            if "Success" in html and "fa-check-circle" in html:
                status = "CONFIRMED"
            elif "Fail" in html and "fa-times-circle" in html:
                status = "FAILED"
                
            # Extract Block
            block_match = re.search(r'href=[\'"]/block/(\d+)[\'"]', html)
            block = int(block_match.group(1)) if block_match else 0
            
            # Extract From
            from_match = re.search(r'id=[\'"]addressCopy[\'"].*?href=[\'"]/address/(0x[a-fA-F0-9]{40})[\'"]', html)
            from_addr = from_match.group(1) if from_match else "Unknown"
            
            # Extract To
            to_match = re.search(r'id=[\'"]contractCopy[\'"].*?href=[\'"]/address/(0x[a-fA-F0-9]{40})[\'"]', html)
            if not to_match:
                to_match = re.search(r'Interacted With \(To\):.*?href=[\'"]/address/(0x[a-fA-F0-9]{40})[\'"]', html, re.DOTALL)
            to_addr = to_match.group(1) if to_match else "Unknown"
            
            return {
                "transaction_hash": tx_hash,
                "status": status,
                "block_number": block,
                "from_address": from_addr,
                "to_address": to_addr,
                "scraped": True
            }
        except Exception as e:
            logger.error(f"Failed to scrape tx {tx_hash}: {e}")
            return {"status": "error", "message": str(e), "transaction_hash": tx_hash}
