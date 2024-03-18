// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// You can also run a script with `npx hardhat run <script>`. If you do that, Hardhat
// will compile your contracts, add the Hardhat Runtime Environment's members to the
// global scope, and execute the script.
const hre = require("hardhat");

async function main() {
  const tokens = (n) => {
    return ethers.utils.parseUnits(n.toString(), 'ether')
  }

  //setup accounts
  // buyer: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
  // seller: 0x70997970C51812dc3A010C7d01b50e0d17dc79C8
  // inspector:0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC
  // lender: 0x90F79bf6EB2c4f870365E785982E1f101E93b906
  [buyer, seller, inspector, lender] = await ethers.getSigners();

  //deploy real estate contract
  const RealEstate = await ethers.getContractFactory('RealEstate');
  const realEstate = await RealEstate.deploy();
  await realEstate.deployed();
  console.log(`Desployed real estate contract at: ${realEstate.address}`)

  //mint properties
  console.log('Minting 3 properties...\n');
  for(let i=0; i<3; i++){
    let transaction = await realEstate.connect(seller).mint(`https://ipfs.io/ipfs/QmQVcpsjrA6cr1iJjZAodYwmPekYgbnXGo4DFubJiLc2EB/${i + 1}.json`);
    await transaction.wait();
  }

  //deploy escrow
  const Escrow = await ethers.getContractFactory('Escrow');
  const escrow = await Escrow.deploy(
    realEstate.address,
    seller.address,
    inspector.address,
    lender.address
  );
  await escrow.deployed();
  console.log(`Desployed Escrow contract at: ${escrow.address}`)

  //approve escrow for the properties
  for(let i=0; i<3; i++){
    let transaction = await realEstate.connect(seller).approve(escrow.address, i+1);
    await transaction.wait();
  }

  //list all properties
  transaction = await escrow.connect(seller).list(1, tokens(20), tokens(10), buyer.address);
  await transaction.wait();

  transaction = await escrow.connect(seller).list(2, tokens(15), tokens(5), buyer.address);
  await transaction.wait();

  transaction = await escrow.connect(seller).list(3, tokens(10), tokens(5), buyer.address);
  await transaction.wait();

  console.log('finished.');
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
