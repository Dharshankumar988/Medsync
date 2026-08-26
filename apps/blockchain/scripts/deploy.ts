import hre from "hardhat";
import { runDeployment } from "../deploy/deploy";

async function main() {
  await runDeployment(hre);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
