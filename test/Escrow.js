const { expect } = require('chai');
const { ethers } = require('hardhat');

const tokens = (n) => {
    return ethers.utils.parseUnits(n.toString(), 'ether')
}

describe('Escrow', () => {
    let buyer, seller, realEstate, escrow;

    beforeEach(async() => {
        //setup accounts
        [buyer, seller, inspector, lender] = await ethers.getSigners();

        //deploy real estate contract
        const RealEstate = await ethers.getContractFactory('RealEstate');
        realEstate = await RealEstate.deploy();

        //mint
        let transaction = await realEstate.connect(seller).mint("https://ipfs.io/ipfs/QmQUozrHLAusXDxrvsESJ3PYB3rUeUuBAvVWw6nop2uu7c/1.png");
        await transaction.wait();

        //deploy escrow
        const Escrow = await ethers.getContractFactory('Escrow');
        escrow = await Escrow.deploy(
            realEstate.address,
            seller.address,
            inspector.address,
            lender.address
        );

        //approve escrow from seller to send nft to itself
        transaction = await realEstate.connect(seller).approve(escrow.address, 1);
        await transaction.wait();
    })

    describe('Deployment checks', async() => {
        it('returns NFT address', async() => {
            const result = await escrow.nft_address()
            expect(result).to.be.equal(realEstate.address)
        })

        it('returns seller', async() => {
            const result = await escrow.seller()
            expect(result).to.be.equal(seller.address)
        })

        it('returns inspector', async() => {
            const result = await escrow.inspector()
            expect(result).to.be.equal(inspector.address)
        })

        it('returns lender', async() => {
            const result = await escrow.lender()
            expect(result).to.be.equal(lender.address)
        })
    })

    describe('successful listing of property', async() => {
        it('can only be called by seller', async() => {
            await expect(escrow.connect(lender).list(1, tokens(1000), tokens(10), buyer.address)).to.be.revertedWith('Only seller can call this function')
        })

        it('update ownership', async() => {
            const transaction = await escrow.connect(seller).list(1, tokens(1000), tokens(10), buyer.address);
            await transaction.wait();
            const result = await realEstate.ownerOf(1);
            expect(result).to.be.equal(escrow.address);
        })

        it('listing updates isListed mapping', async() => {
            const transaction = await escrow.connect(seller).list(1, tokens(1000), tokens(10), buyer.address);
            await transaction.wait();
            const result = await escrow.isListed(1);
            expect(result).to.be.equal(true);
        })

        it('listing updates purchasePrices mapping', async() => {
            const transaction = await escrow.connect(seller).list(1, tokens(1000), tokens(10), buyer.address);
            await transaction.wait();
            const result = await escrow.purchasePrices(1);
            expect(result).to.be.equal(tokens(1000));
        })

        it('listing updates escrowAmounts mapping', async() => {
            const transaction = await escrow.connect(seller).list(1, tokens(1000), tokens(10), buyer.address);
            await transaction.wait();
            const result = await escrow.escrowAmounts(1);
            expect(result).to.be.equal(tokens(10));
        })

        it('listing updates buyers mapping', async() => {
            const transaction = await escrow.connect(seller).list(1, tokens(1000), tokens(10), buyer.address);
            await transaction.wait();
            const result = await escrow.buyers(1);
            expect(result).to.be.equal(buyer.address);
        })
    })

    describe('Deposits by buyer', async() => {
        it('can only be called by buyer', async() => {
            await expect(escrow.connect(lender).depositEarnest(1, {value: tokens(10)})).to.be.revertedWith('Only listed buyer of the property can call this function')
        })

        it('can only be called by the buyer with correct nft ID', async() => {
            await expect(escrow.connect(buyer).depositEarnest(2, {value: tokens(10)})).to.be.revertedWith('Only listed buyer of the property can call this function');
        })

        it('updates contract balance', async() => {
            let transaction = await escrow.connect(seller).list(1, tokens(1000), tokens(10), buyer.address);
            await transaction.wait();
            transaction = await escrow.connect(buyer).depositEarnest(1, {value: tokens(10)});
            await transaction.wait();
            const result = await escrow.getBalance();
            expect(result).to.be.equal(tokens(10))
        })
    })

    describe('Inspection', async() => {
        it('updates inspection status', async() => {
            let transaction = await escrow.connect(seller).list(1, tokens(1000), tokens(10), buyer.address);
            await transaction.wait();
            transaction = await escrow.connect(inspector).updateInspectionStatus(1, true);
            await transaction.wait();
            const result = await escrow.inspectionPassed(1);
            expect(result).to.be.equal(true);
        })
    })

    describe('Approval', async() => {
        it('updates approval status', async() => {
            let transaction = await escrow.connect(buyer).approveSale(1);
            await transaction.wait();
            transaction = await escrow.connect(seller).approveSale(1);
            await transaction.wait();
            transaction = await escrow.connect(lender).approveSale(1);
            await transaction.wait();

            expect(await escrow.approval(1, buyer.address)).to.be.equal(true);
            expect(await escrow.approval(1, seller.address)).to.be.equal(true);
            expect(await escrow.approval(1, lender.address)).to.be.equal(true);
        })
    })

    describe('Sale', async() => {
        beforeEach(async() => {
            let transaction = await escrow.connect(seller).list(1, tokens(1000), tokens(10), buyer.address);
            await transaction.wait();

            transaction = await escrow.connect(buyer).depositEarnest(1, {value: tokens(10)});
            await transaction.wait();

            transaction = await escrow.connect(inspector).updateInspectionStatus(1, true);
            await transaction.wait();

            transaction = await escrow.connect(buyer).approveSale(1);
            await transaction.wait();

            transaction = await escrow.connect(seller).approveSale(1);
            await transaction.wait();

            transaction = await escrow.connect(lender).approveSale(1);
            await transaction.wait();

            await lender.sendTransaction({to: escrow.address, value: tokens(990)});

            transaction = await escrow.connect(seller).finalizedSale(1) 
        })

        it('updates balance', async() => {
            expect(await escrow.getBalance()).to.be.equal(0)
        })

        it('NFT is transferred to buyer', async() => {
            expect(await realEstate.ownerOf(1)).to.be.equal(buyer.address);
        })
    })

    describe('Cancel Sale', async() => {
        it('successful cancellation', async() => {
            let transaction = await escrow.connect(seller).list(1, tokens(1000), tokens(10), buyer.address);
            await transaction.wait();

            transaction = await escrow.connect(buyer).depositEarnest(1, {value: tokens(10)});
            await transaction.wait();

            transaction = await escrow.cancelSale(1);
            await transaction.wait();

            expect(await escrow.getBalance()).to.be.equal(0);
        })

        it('unsuccessful cancellation', async() => {
            let transaction = await escrow.connect(seller).list(1, tokens(1000), tokens(10), buyer.address);
            await transaction.wait();

            transaction = await escrow.connect(buyer).depositEarnest(1, {value: tokens(10)});
            await transaction.wait();

            transaction = await escrow.connect(inspector).updateInspectionStatus(1, true);
            await transaction.wait();

            transaction = await escrow.cancelSale(1);
            await transaction.wait();

            expect(await escrow.getBalance()).to.be.equal(0);
        })
    })
})
