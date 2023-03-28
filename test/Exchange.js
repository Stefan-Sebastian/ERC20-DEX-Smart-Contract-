const { ethers } = require('hardhat')
const{ expect } = require('chai')

const tokens = (n) => {
	return ethers.utils.parseUnits(n.toString(), 'ether')
}

describe('Exchange Contract',() => {
	//Use let to be more dinamically 
	let accounts, deployer, feeAccount, exchange, user1, user2

	//We use const because this never changes, it is statically 
	const feePercent = 10

	beforeEach(async () => {
		const Exchange = await ethers.getContractFactory('Exchange')

		//We have to import the token smart contract 
		const Token = await ethers.getContractFactory('Token')

		//We are going to have multiple tokens 
		//we deploy the contract and pass in the token arguments: Name, Symbol, totalSupply
		token1 = await Token.deploy('Dapp University', 'DAPP', '1000000')
		token2 = await Token.deploy('MAD DAI', 'mDAI', '10000000')
		
		 accounts = await ethers.getSigners()
		 deployer = accounts[0]
		 feeAccount = accounts[1]
		 user1 = accounts[2]
		 user2 = accounts[3]

		 let transaction = await token1.connect(deployer).transfer(user1.address, tokens(100))
		 await transaction.wait()
		
		exchange = await Exchange.deploy(feeAccount.address, feePercent)

	})

	describe('Deployment', () => {
		
		it('tracks fee account', async () => {
			expect(await exchange.feeAccount()).to.equal(feeAccount.address)
		})

		it('tracks fee percentage', async () => {
			expect(await exchange.feePercent()).to.equal(feePercent)
		})
	})

	describe('Depositing Tokens', () => {
		let transaction, result
		let amount = tokens(10)

		describe('Success', () => {

			beforeEach(async () => {
			//Approve Tokens
			 transaction = await token1.connect(user1).approve(exchange.address, amount)//Fetch the transaction
			 result = await transaction.wait() //Wait for the transaction to finish and get included into the block
			
			//Deposit tokens 
			 transaction = await exchange.connect(user1).depositTokens(token1.address, amount)
			 result = await transaction.wait()
	})
			
			it('tracks the token deposit', async () => {
				//check if the exchange has some tokens 
				expect(await token1.balanceOf(exchange.address)).to.equal(amount)
				expect(await exchange.tokens(token1.address, user1.address)).to.equal(amount)
				expect(await exchange.balanceOf(token1.address, user1.address)).to.equal(amount)
			})

			it('emits deposit event', async () => {
				const event = result.events[1] //2 events are emitted 
				//console.log(event)
				expect(event.event).to.equal('Deposit')

				const args = event.args
				expect(args.token).to.equal(token1.address)
				expect(args.user).to.equal(user1.address)
				expect(args.amount).to.equal(amount)
				expect(args.balance).to.equal(amount)
			})


		})

		describe('Failure', () => {
			it('fails when no tokens are approved', async () => {
				//Try to transfer tokens before they were approved 
				await expect(exchange.connect(user1).depositTokens(token1.address, amount)).to.be.reverted
			})

		})

	})

	describe('Withdrawing Tokens', () => {
		let transaction, result
		let amount = tokens(100)

		describe('Success', () => {

			beforeEach(async () => {
				
				//----Deposit Tokens Before Withdrawing------
				
				//Approve Tokens
				transaction = await token1.connect(user1).approve(exchange.address, amount)
				result = await transaction.wait
				
				//Deposit Tokens
				transaction = await exchange.connect(user1).depositTokens(token1.address, amount)
				result = await transaction.wait()

				//Withdraw Tokens
				transaction = await exchange.connect(user1).withdrawTokens(token1.address, amount)
				result = await transaction.wait()
			})

			it('withdraws tokens from exchange', async () => {
				//We expect the balance of the exchange to be equal 0 
				expect(await token1.balanceOf(exchange.address)).to.equal(0)
				//Expect to substract the amount from balances
				expect(await exchange.tokens(token1.address, user1.address)).to.equal(0)
				//Check the balances 
				expect(await exchange.balanceOf(token1.address, user1.address)).to.equal(0)
			})

			it('emits withdraw event', async () => {
				const event = result.events[1] //2 events are emitted 
				//console.log(event)
				expect(event.event).to.equal('Withdraw')

				const args = event.args
				expect(args.token).to.equal(token1.address)
				expect(args.user).to.equal(user1.address)
				expect(args.amount).to.equal(amount)
				expect(args.balance).to.equal(0)
			})

		})

		describe('Failure', () => {

			it('rejects insufficient balances', async () => {
				//Attempt to withdraw tokens without depositing any 
				await expect(exchange.connect(user1).withdrawTokens(token1.address, amount)).to.be.reverted
			})
			
		})
	})

	describe('Checking Balances', () => {
		let transaction, result
		let amount = tokens(1)

		beforeEach(async ()  => {
			//Approve Tokens
			transaction = await token1.connect(user1).approve(exchange.address, amount)
			result = await transaction.wait()

			//Deposit tokens
			transaction = await exchange.connect(user1).depositTokens(token1.address, amount)
		})

		it('returns user balance', async () => {
			expect(await exchange.balanceOf(token1.address, user1.address)).to.equal(amount)
		})
	})

	describe('Creating Orders', () => {
		let transaction, result
		let amount = tokens(1)

		describe('Success', () => {
			
			beforeEach(async () => {

				//----------------Approve-Deposit-CreateOrder----------------------

				//Approve
				transaction = await token1.connect(user1).approve(exchange.address, amount)
				result = await transaction.wait()

				//Deposit
				transaction = await exchange.connect(user1).depositTokens(token1.address, amount)
				result = await transaction.wait()

				//Create Order BUY/SELL
				transaction = await exchange.connect(user1).makeOrder(token2.address, amount, token1.address, amount)
				result = await transaction.wait()
			})

			it('checks orders counting', async () => {
				expect(await exchange.countOrders()).to.equal(1)
			})

			it('emits order event', async () => {
				const event = result.events[0]
				expect(event.event).to.equal('Order')

				const args = event.args
				expect(args.id).to.equal(1)
				expect(args.user).to.equal(user1.address)
				expect(args.tokenGet).to.equal(token2.address)
				expect(args.amountGet).to.equal(amount)
				expect(args.tokenGive).to.equal(token1.address)
				expect(args.amountGive).to.equal(amount)
				expect(args.timestamp).to.at.least(1)
			})

		})

		describe('Failure', () => {
			
			it('rejects unxisting tokens', async () => {
				await expect(exchange.connect(user1).makeOrder(token2.address, amount, token1.address, amount)).to.be.reverted
			})
		})
	})

	describe('Orders actions', () => {
		let transaction, result
		let amount = tokens(1)

		beforeEach(async () => {
				//Approve
				transaction = await token1.connect(user1).approve(exchange.address, amount)
				result = await transaction.wait()

				//Deposit
				transaction = await exchange.connect(user1).depositTokens(token1.address, amount)
				result = await transaction.wait()

				//Give tokens to user 2
				transaction = await token2.connect(deployer).transfer(user2.address, tokens(100))
				result = await transaction.wait()

				//User2 must approve before depositing
				transaction = await token2.connect(user2).approve(exchange.address, tokens(2))
				result = transaction.wait()

				//User2 deposits on exchange
				transaction = await exchange.connect(user2).depositTokens(token2.address, tokens(2))

				//Create Order BUY/SELL
				transaction = await exchange.connect(user1).makeOrder(token2.address, amount, token1.address, amount)
				result = await transaction.wait()
		})

		describe('Canceling Orders', () => {

			beforeEach(async() => {

				transaction = await exchange.connect(user1).cancelOrders(1)
				result = await transaction.wait()
				
				})

			describe('Success', () => {
				
				
				it('updates canceled orders', async () => {
					expect(await exchange.canceledOrders(1)).to.equal(true);
				})

				it('emits cancel event', async () => {
					const event = result.events[0]
					expect(event.event).to.equal('Cancel')

					const args = event.args
					expect(args.id).to.equal(1)
					expect(args.user).to.equal(user1.address)
					expect(args.tokenGet).to.equal(token2.address)
					expect(args.amountGet).to.equal(amount)
					expect(args.tokenGive).to.equal(token1.address)
					expect(args.amountGive).to.equal(amount)
					expect(args.timestamp).to.at.least(1)
				})
			})

			describe('Failure', () => {
				
				it('rejects invalid id', async () => {
					const invalidId = 9999
					await expect(exchange.connect(user1).cancelOrders(invalidId)).to.be.reverted
				})

				it('ensures that caller is the owner', async () => {
					await expect(exchange.connect(user2).cancelOrders(1)).to.be.reverted
				})
			})
		})

		describe('Filling orders', () => {

			beforeEach(async () => {
				//Before each test user2 must fill the order

				transaction = await exchange.connect(user2).fillOrder('1')
				result = await transaction.wait() 
			})


			describe('Success', () => {
				
			it('executes the trade and charges the fees', async () => {
				//Ensure trade happens
				//Check user1, user2, feeAccount balances 

				//Token Give
				expect(await exchange.balanceOf(token1.address, user1.address)).to.equal(tokens(0))
				expect(await exchange.balanceOf(token1.address, user2.address)).to.equal(tokens(1))
				expect(await exchange.balanceOf(token1.address, feeAccount.address)).to.equal(tokens(0))

				//Token Get
				expect(await exchange.balanceOf(token2.address, user1.address)).to.equal(tokens(1))
				expect(await exchange.balanceOf(token2.address, user2.address)).to.equal(tokens(0.9))
				expect(await exchange.balanceOf(token2.address, feeAccount.address)).to.equal(tokens(0.1))

				})

			it('checks for filled orders', async () => {
				expect(await exchange.filledOrders(1)).to.equal(true)
			})

			it('emits trade event', async () => {
				const event = result.events[0]
				expect(event.event).to.equal('Trade')

				const args = event.args
				expect(args.id).to.equal(1)
				expect(args.user).to.equal(user2.address)
				expect(args.tokenGet).to.equal(token2.address)
				expect(args.amountGet).to.equal(tokens(1))
				expect(args.tokenGive).to.equal(token1.address)
				expect(args.amountGive).to.equal(tokens(1))
				expect(args.creator).to.equal(user1.address)
				expect(args.timestamp).to.at.least(1)
			})

			})

			describe('Failure', () => {
				it('rejects invalid order Id', async () => {
					const invalidOrderId = 9999
					await expect(exchange.connect(user2).fillOrder(invalidOrderId)).to.be.reverted
			})
				it('rejects already filled orders', async () => {
					await expect(exchange.connect(user2).fillOrder(1)).to.be.reverted
				})

				it('rejects canceled orders', async () => {
					transaction = await exchange.connect(user1).cancelOrders(1)
					result = await transaction.wait()

					await expect(exchange.connect(user2).fillOrder(1)).to.be.reverted
				})
			})

		})
	})
})








