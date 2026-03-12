import hre from "hardhat";

async function main() {
  console.log("Deploying MockUSDC to Base Sepolia...");

  const MockUSDC = await hre.ethers.getContractFactory("MockUSDC");
  const mockUSDC = await MockUSDC.deploy();

  await mockUSDC.waitForDeployment();

  const address = await mockUSDC.getAddress();
  console.log(`MockUSDC deployed to: ${address}`);
  console.log("");
  console.log("Add this to your .env file:");
  console.log(`NEXT_PUBLIC_USDC_ADDRESS="${address}"`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
