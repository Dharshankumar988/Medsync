import * as fs from 'fs';
import * as path from 'path';

const artifactsDir = path.join(__dirname, '..', 'artifacts', 'contracts');
const targetDir = path.join(__dirname, '..', '..', 'backend', 'app', 'blockchain', 'abi');

function copyAbis(dirPath: string) {
  const files = fs.readdirSync(dirPath);

  for (const file of files) {
    const fullPath = path.join(dirPath, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      copyAbis(fullPath);
    } else if (file.endsWith('.json') && !file.endsWith('.dbg.json')) {
      const destPath = path.join(targetDir, file);
      
      // Ensure target directory exists
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }

      fs.copyFileSync(fullPath, destPath);
      console.log(`Exported ABI: ${file} to backend`);
    }
  }
}

try {
  if (fs.existsSync(artifactsDir)) {
    console.log("Starting ABI export...");
    copyAbis(artifactsDir);
    console.log("ABI export completed successfully.");
  } else {
    console.log("No artifacts found. Make sure to run hardhat compile first.");
  }
} catch (error) {
  console.error("Failed to export ABIs:", error);
  process.exit(1);
}
