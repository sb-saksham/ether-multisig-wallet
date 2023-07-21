const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { ethers } = require("hardhat");
const { expect } = require("chai");

describe("MultiSigWallet", () => {
    async function deployLoadFixtureMultiSigWallet() {
        let owners = await ethers.getSigners();
        const signers = owners.slice(0, 3);
        const otherSigner = owners[3];
        owners = signers.map((own) => own.address);
        const quorumRequired = 2;
        const MultiSigWallet = await ethers.getContractFactory('MultiSigWallet');
        const multiSigWallet = await MultiSigWallet.deploy(owners, quorumRequired);
        await multiSigWallet.deployed();
        return { owners, quorumRequired, multiSigWallet, otherSigner, signers };
    }
    describe("Deployment", () => {
        it("deploys the contract with correct owners and quorumRequired", async () => {
            const { owners, quorumRequired, multiSigWallet } = await loadFixture(deployLoadFixtureMultiSigWallet);
            const contractOwners = await multiSigWallet.getOwners();
            expect(...contractOwners).to.equals(...owners);
            expect(await multiSigWallet.quorumRequired()).to.equal(quorumRequired);
        });
        it("isOwners is working properly", async () => {
            const { owners, multiSigWallet } = await loadFixture(deployLoadFixtureMultiSigWallet);
            const ownersFromC = await Promise.all(owners.map((own) => multiSigWallet.isOwner(own)));
            expect(ownersFromC.every(el => el === true)).equal(true);
        });
    });
    describe("Deposit", () => {
        it("deposits ETHer from owner and fallback receive is working", async () => {
            const { multiSigWallet, otherSigner } = await loadFixture(deployLoadFixtureMultiSigWallet);
            const sentAmount = 100;
            expect(await multiSigWallet.deposit({ value: sentAmount })).to.changeEtherBalance(multiSigWallet, sentAmount);
            expect(await otherSigner.sendTransaction({from: otherSigner.address, to: multiSigWallet.address, value: sentAmount})).to.changeEtherBalance(multiSigWallet, sentAmount);
            expect(await multiSigWallet.balanceOf()).to.equal(2 * sentAmount);
        });
    });
    describe("Withdraw Transaction", () => {
        it("creates withdraw transaction with given parameters", async () => {
            const { multiSigWallet, otherSigner, owners } = await loadFixture(deployLoadFixtureMultiSigWallet);
            const amount = 100;
            expect(await multiSigWallet.createWithdrawTx(owners[0], amount)).to.emit(multiSigWallet, 'CreateWithdrawTx')
                .withArgs(owners[0], 1, owners[0], amount);
            await expect(multiSigWallet.connect(otherSigner)
                .createWithdrawTx(owners[1], amount)).to.be.revertedWith('Only Owner can perform this operation!');
        });
        it("Only owners can approve transaction and approveWithdrawTx fucntion", async () => {
            const { multiSigWallet, otherSigner, signers,owners } = await loadFixture(deployLoadFixtureMultiSigWallet);
            const amount = 100;
            await multiSigWallet.createWithdrawTx(owners[0], amount);
            await expect(multiSigWallet.connect(otherSigner).approveWithdrawTx(0)).to.be.revertedWith('Only Owner can perform this operation!');
            expect(await multiSigWallet.connect(signers[0]).approveWithdrawTx(0)).to.emit(multiSigWallet, 'ApproveWithdrawTx')
                .withArgs(owners[0], 0);
        });
        it("deposits the withdraw amount if enough approvals are given(quorumRequired)", async () => {
            const { multiSigWallet, signers, owners } = await loadFixture(deployLoadFixtureMultiSigWallet);
            const amount = 100;
            await multiSigWallet.deposit({ value: amount });
            await multiSigWallet.createWithdrawTx(owners[0], amount);
            await multiSigWallet.connect(signers[0]).approveWithdrawTx(0)
            expect(await multiSigWallet.connect(signers[1]).approveWithdrawTx(0)).to
                .changeEtherBalances([multiSigWallet, signers[0]], [-amount, amount]);
        });
        // it("", );
    });
});


