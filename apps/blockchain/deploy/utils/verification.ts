import { HardhatRuntimeEnvironment } from "hardhat/types";

export async function verifyContract(
  hre: HardhatRuntimeEnvironment,
  contractAddress: string,
  constructorArguments: any[] = []
) {
  const network = hre.network.name;

  if (network === "hardhat" || network === "localhost") {
    console.log("Skipping verification on local network.");
    return;
  }

  console.log(`Waiting for 5 block confirmations before verification...`);
  
  // Ethers-v6 wait approach doesn't easily let us wait blocks just by sleep, 
  // but we can delay manually to ensure Polygonscan indexes the contract.
  await new Promise(resolve => setTimeout(resolve, 30000)); // 30 sec delay

  try {
    console.log(`Starting verification for ${contractAddress}...`);
    await hre.run("verify:verify", {
      address: contractAddress,
      constructorArguments: constructorArguments,
    });
    console.log(`Verification successful for ${contractAddress}.`);
  } catch (error: any) {
    if (error.message.toLowerCase().includes("already verified")) {
      console.log(`Contract at ${contractAddress} is already verified.`);
    } else {
      console.error(`Verification failed for ${contractAddress}:`, error);
    }
  }
}
