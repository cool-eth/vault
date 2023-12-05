import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { Vault, Vault__factory, ERC20Mock, ERC20Mock__factory } from "../types";
import { ethers } from "hardhat";
import { expect } from "chai";

describe("Vault test", () => {
    let vault: Vault;
    let owner: SignerWithAddress;
    let users: SignerWithAddress[] = [];
    let tokens: ERC20Mock[] = [];

    beforeEach(async () => {
        const allSigners = await ethers.getSigners();
        owner = allSigners[0];

        let _users: SignerWithAddress[] = [];
        let _tokens: ERC20Mock[] = [];
        for (let i = 0; i < 5; i++) {
            _users.push(allSigners[i + 1]);

            const token = await new ERC20Mock__factory(owner).deploy("Mock Token", "MT");
            await token.deployTransaction.wait();
            _tokens.push(token);
        }
        users = _users;
        tokens = _tokens;

        vault = await new Vault__factory(owner).deploy();
        await vault.deployTransaction.wait();
    });

    it("Initialize", async () => {
        expect(await vault.owner()).to.equal(owner.address);
        expect(await vault.paused()).to.equal(false);
    });

    describe("Pause", () => {
        it("Admin can pause", async () => {
            expect(await vault.paused()).to.equal(false);
            await vault.pause();
            expect(await vault.paused()).to.equal(true);
        });

        it("Users can't pause", async () => {
            await expect(vault.connect(users[0]).pause()).to.revertedWith('Ownable: caller is not the owner');
        });

        it("Admin can't call pause when paused already", async () => {
            await vault.pause();
            await expect(vault.pause()).to.revertedWith('Pausable: paused');
        });
    });

    describe("Unpause", () => {
        beforeEach(async () => {
            await vault.pause();
        });

        it("Admin can unpause", async () => {
            expect(await vault.paused()).to.equal(true);
            await vault.unpause();
            expect(await vault.paused()).to.equal(false);
        });

        it("Users can't unpause", async () => {
            await expect(vault.connect(users[0]).unpause()).to.revertedWith('Ownable: caller is not the owner');
        });

        it("Admin can't call unpause when not pause", async () => {
            await vault.unpause();
            await expect(vault.unpause()).to.revertedWith('Pausable: not paused');
        });
    });

    describe("whitelist tokens", () => {
        it("Admin can whitelist token", async () => {
            expect(await vault.isWhitelistedToken(tokens[0].address)).to.equal(false);
            await vault.whitelistToken(tokens[0].address, true);
            expect(await vault.isWhitelistedToken(tokens[0].address)).to.equal(true);
        });

        it("Admin can remove token from whitelist", async () => {
            await vault.whitelistToken(tokens[0].address, true);

            expect(await vault.isWhitelistedToken(tokens[0].address)).to.equal(true);
            await vault.whitelistToken(tokens[0].address, false);
            expect(await vault.isWhitelistedToken(tokens[0].address)).to.equal(false);
        });

        it("Users can't call whitelist token", async () => {
            await expect(vault.connect(users[0]).whitelistToken(tokens[0].address, true)).to.revertedWith('Ownable: caller is not the owner');
        });

        it("Admin can't call whitelist for same token", async () => {
            await vault.whitelistToken(tokens[0].address, true);
            await expect(vault.whitelistToken(tokens[0].address, true)).to.revertedWith('TokenAlreadyWhitelisted()');

            await vault.whitelistToken(tokens[0].address, false);
            await expect(vault.whitelistToken(tokens[0].address, false)).to.revertedWith('TokenNotWhitelisted()');
        });

        it("Admin can't remove token from whitelist if any deposits available", async () => {
            await vault.whitelistToken(tokens[0].address, true);

            const amount = ethers.utils.parseEther("100");
            await tokens[0].mint(users[0].address, amount);
            await tokens[0].connect(users[0]).approve(vault.address, amount);
            await vault.connect(users[0]).deposit(tokens[0].address, amount);

            await expect(vault.whitelistToken(tokens[0].address, false)).to.revertedWith('TokenDepositsAvailable()');
        });

        it("Can query all whitelisted tokens", async () => {
            for (let i = 0; i < tokens.length; i++) {
                await vault.whitelistToken(tokens[i].address, true);
            }

            const whitelistedTokens = await vault.allWhitelistedTokens();
            expect(whitelistedTokens.length).to.equal(tokens.length);
        });
    });

    describe("Deposit / Withdraw", () => {
        it("User can't deposit when paused", async () => {
            await vault.pause();

            const amount = ethers.utils.parseEther("100");
            await tokens[0].mint(users[0].address, amount);
            await tokens[0].connect(users[0]).approve(vault.address, amount);
            await expect(vault.deposit(tokens[0].address, amount)).to.revertedWith('Pausable: paused');
        });

        it("User can't deposit when token is not whitelisted", async () => {
            const amount = ethers.utils.parseEther("100");
            await tokens[0].mint(users[0].address, amount);
            await tokens[0].connect(users[0]).approve(vault.address, amount);
            await expect(vault.deposit(tokens[0].address, amount)).to.revertedWith('TokenNotWhitelisted');
        });

        it("User can deposit whitelisted token", async () => {
            await vault.whitelistToken(tokens[0].address, true);

            const amount = ethers.utils.parseEther("100");
            await tokens[0].mint(users[0].address, amount);
            await tokens[0].connect(users[0]).approve(vault.address, amount);
            await vault.connect(users[0]).deposit(tokens[0].address, amount);

            expect(await vault.userDeposits(users[0].address, tokens[0].address)).to.equal(amount);
            expect(await vault.totalDeposits(tokens[0].address)).to.equal(amount);
        });

        it("User can deposit more", async () => {
            await vault.whitelistToken(tokens[0].address, true);

            const amount = ethers.utils.parseEther("100");
            await tokens[0].mint(users[0].address, amount);
            await tokens[0].connect(users[0]).approve(vault.address, amount);
            await vault.connect(users[0]).deposit(tokens[0].address, amount);

            expect(await vault.userDeposits(users[0].address, tokens[0].address)).to.equal(amount);
            expect(await vault.totalDeposits(tokens[0].address)).to.equal(amount);

            await tokens[0].mint(users[0].address, amount);
            await tokens[0].connect(users[0]).approve(vault.address, amount);
            await vault.connect(users[0]).deposit(tokens[0].address, amount);

            expect(await vault.userDeposits(users[0].address, tokens[0].address)).to.equal(amount.mul(2));
            expect(await vault.totalDeposits(tokens[0].address)).to.equal(amount.mul(2));
        });

        it("All users can deposit any whitelisted tokens", async () => {
            for (let i = 0; i < tokens.length; i++) {
                await vault.whitelistToken(tokens[i].address, true);

                for (let j = 0; j < users.length; j++) {

                    const userDepositsBefore = await vault.userDeposits(users[j].address, tokens[i].address);
                    const totalDepositsBefore = await vault.totalDeposits(tokens[i].address);

                    const amount = ethers.utils.parseEther("100");
                    await tokens[i].mint(users[j].address, amount);
                    await tokens[i].connect(users[j]).approve(vault.address, amount);
                    await vault.connect(users[j]).deposit(tokens[i].address, amount);

                    expect(await vault.userDeposits(users[j].address, tokens[i].address)).to.equal(userDepositsBefore.add(amount));
                    expect(await vault.totalDeposits(tokens[i].address)).to.equal(totalDepositsBefore.add(amount));
                }
            }
        });

        it("User can't withdraw when paused", async () => {
            const amount = ethers.utils.parseEther("100");

            await vault.pause();
            await expect(vault.withdraw(tokens[0].address, amount)).to.revertedWith('Pausable: paused');
        });

        it("User can't withdraw when token not whitelisted", async () => {
            const amount = ethers.utils.parseEther("100");

            await expect(vault.withdraw(tokens[0].address, amount)).to.revertedWith('TokenNotWhitelisted');
        });

        it("User can't withdraw more than deposits", async () => {
            await vault.whitelistToken(tokens[0].address, true);

            const amount = ethers.utils.parseEther("100");
            await tokens[0].mint(users[0].address, amount);
            await tokens[0].connect(users[0]).approve(vault.address, amount);
            await vault.connect(users[0]).deposit(tokens[0].address, amount);

            await expect(vault.connect(users[0]).withdraw(tokens[0].address, amount.add(1))).to.revertedWith('NotEnoughDeposits');
        });

        it("User can withdraw", async () => {
            await vault.whitelistToken(tokens[0].address, true);

            const amount = ethers.utils.parseEther("100");
            await tokens[0].mint(users[0].address, amount);
            await tokens[0].connect(users[0]).approve(vault.address, amount);
            await vault.connect(users[0]).deposit(tokens[0].address, amount);

            expect(await vault.userDeposits(users[0].address, tokens[0].address)).to.equal(amount);
            expect(await vault.totalDeposits(tokens[0].address)).to.equal(amount);
            await vault.connect(users[0]).withdraw(tokens[0].address, amount);
            expect(await vault.userDeposits(users[0].address, tokens[0].address)).to.equal(0);
            expect(await vault.totalDeposits(tokens[0].address)).to.equal(0);
        });

        it("User can withdraw twice", async () => {
            await vault.whitelistToken(tokens[0].address, true);

            const amount = ethers.utils.parseEther("100");
            await tokens[0].mint(users[0].address, amount.mul(2));
            await tokens[0].connect(users[0]).approve(vault.address, amount.mul(2));
            await vault.connect(users[0]).deposit(tokens[0].address, amount.mul(2));

            expect(await vault.userDeposits(users[0].address, tokens[0].address)).to.equal(amount.mul(2));
            expect(await vault.totalDeposits(tokens[0].address)).to.equal(amount.mul(2));
            await vault.connect(users[0]).withdraw(tokens[0].address, amount);
            expect(await vault.userDeposits(users[0].address, tokens[0].address)).to.equal(amount);
            expect(await vault.totalDeposits(tokens[0].address)).to.equal(amount);
            await vault.connect(users[0]).withdraw(tokens[0].address, amount);
            expect(await vault.userDeposits(users[0].address, tokens[0].address)).to.equal(0);
            expect(await vault.totalDeposits(tokens[0].address)).to.equal(0);
        });

        it("All users can withdraw for any whitelisted tokens", async () => {
            for (let i = 0; i < tokens.length; i++) {
                await vault.whitelistToken(tokens[i].address, true);

                for (let j = 0; j < users.length; j++) {

                    const userDepositsBefore = await vault.userDeposits(users[j].address, tokens[i].address);
                    const totalDepositsBefore = await vault.totalDeposits(tokens[i].address);

                    const amount = ethers.utils.parseEther("100");
                    await tokens[i].mint(users[j].address, amount);
                    await tokens[i].connect(users[j]).approve(vault.address, amount);
                    await vault.connect(users[j]).deposit(tokens[i].address, amount);

                    expect(await vault.userDeposits(users[j].address, tokens[i].address)).to.equal(userDepositsBefore.add(amount));
                    expect(await vault.totalDeposits(tokens[i].address)).to.equal(totalDepositsBefore.add(amount));
                }

                for (let j = 0; j < users.length; j++) {
                    const userDepositsBefore = await vault.userDeposits(users[j].address, tokens[i].address);
                    const totalDepositsBefore = await vault.totalDeposits(tokens[i].address);

                    const amount = ethers.utils.parseEther("50");
                    await vault.connect(users[j]).withdraw(tokens[i].address, amount);

                    expect(await vault.userDeposits(users[j].address, tokens[i].address)).to.equal(userDepositsBefore.sub(amount));
                    expect(await vault.totalDeposits(tokens[i].address)).to.equal(totalDepositsBefore.sub(amount));
                }

                for (let j = 0; j < users.length; j++) {
                    const userDepositsBefore = await vault.userDeposits(users[j].address, tokens[i].address);
                    const totalDepositsBefore = await vault.totalDeposits(tokens[i].address);

                    const amount = ethers.utils.parseEther("50");
                    await vault.connect(users[j]).withdraw(tokens[i].address, amount);

                    expect(await vault.userDeposits(users[j].address, tokens[i].address)).to.equal(userDepositsBefore.sub(amount));
                    expect(await vault.totalDeposits(tokens[i].address)).to.equal(totalDepositsBefore.sub(amount));
                }
            }
        });
    });
});
