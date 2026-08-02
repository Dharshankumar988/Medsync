import fs from "fs";
import path from "path";
import { HardhatRuntimeEnvironment } from "hardhat/types";

export async function exportABIs(hre: HardhatRuntimeEnvironment, contractNames: string[]) {
  const abisDir = path.join(__dirname, "../../abis");

  if (!fs.existsSync(abisDir)) {
    fs.mkdirSync(abisDir, { recursive: true });
  }

  for (const contractName of contractNames) {
    try {
      const artifact = await hre.artifacts.readArtifact(contractName);
      const abiFilePath = path.join(abisDir, `${contractName}.json`);
      fs.writeFileSync(abiFilePath, JSON.stringify(artifact.abi, null, 2));
      console.log(`Exported ABI for ${contractName}`);
    } catch (e) {
      console.error(`Failed to export ABI for ${contractName}:`, (e as Error).message);
    }
  }
}
