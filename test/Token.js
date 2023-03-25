const { ethers } = require('hardhat');
//This line will import ethers from hardhat library 
//and asign to a variable so we can perform any ethers function that 
//we want to!!!

const { expect } = require('chai');
//import the expect matcher from chai library 

const tokens = (n) => {
	return ethers.utils.parseUnits(n.toString(), 'ether')
}


describe("Token", ()=> {
	//Tests go inside here 

	let token, accounts, deployer, receiver, exchange //we use this to access the token variable inside the functions 
	//This will let the variable scope to be accesible in every function inside here 

	//let accounts
	//let deployer



	beforeEach(async()=> {
	//we use the code if one or multiple line from our code reapeat
	//code goes in here
		//fetch token from blockchain
		const Token = await ethers.getContractFactory('Token')
		//deply token 
		 token = await Token.deploy('Dapp University', 'DAPP', '1000000')
		 accounts = await ethers.getSigners()
		 deployer = accounts[0]
		 receiver = accounts[1]
		 exchange = accounts[2]//just pretending this is the exchange address 
})

	describe('Deployment', ()=>{
		const name = 'Dapp University'
		const symbol = 'DAPP'
		const decimals = '18'
		const totalSupply = tokens('1000000')

		it("has correct name", async ()=> {
		//Read Token Name and 
		//Check if that name is correct(Use chai)
		expect(await token.name()).to.equal(name)

	})

	it("has correct symbol", async ()=> {
		//Read Token Name and 
		//Check if that name is correct(Use chai)
		expect( await token.symbol()).to.equal(symbol)
})
	it("has correct decimals", async ()=> {
		//Read Token Name and 
		//Check if that name is correct(Use chai)
		expect( await token.decimals()).to.equal(decimals)

})

	it("has correct total supply", async ()=> {
		//Read Token Name and 
		//Check if that name is correct(Use chai)
		//const value = tokens('1000000')
		//this line will transform 100000 ether into wei 1mil * 10^18
		expect( await token.totalSupply()).to.equal(totalSupply)

})

	it('assigns total supply to deployer', async() => { 
		expect(await token.balanceOf(deployer.address)).to.equal(totalSupply)
	})
	})

	describe('Transfer Tokens', () => {
		let amount, transaction, results

		describe('Success', () => {

			beforeEach(async()=>{
			amount = tokens(100)
			transaction = await token.connect(deployer).transfer(receiver.address, amount)//Fetch the transaction and connect the deployer wallet to the smart contract 
			results = await transaction.wait()//Wait for the transaction to be included into the block before movinv to the next step 
		})

		it('transfer token balances', async()=>{
			//Log balance before transfer (spender + receiver)
			//console.log('deployer balance before transfer', await token.balanceOf(deployer.address))
			//console.log('receiver balance before transfer', await token.balanceOf(receiver.address))

			/*Transfer tokens
			amount = tokens(100)
			 let transaction = await token.connect(deployer).transfer(receiver.address, amount)//Fetch the transaction
			 let results = transaction.wait()//Wait for the transaction to be included into the block */
			
			//Log balance after the transfer
			//console.log('deployer balance after transfer', await token.balanceOf(deployer.address))
			//console.log('receiver balance after transfer', await token.balanceOf(receiver.address))
		


			//Ensure that the tokens were transfered (balances changed)
			expect(await token.balanceOf(deployer.address)).to.equal(tokens(999900))
			expect(await token.balanceOf(receiver.address)).to.equal(amount)

		})

		it('emits a Transfer event', async() => {
			const event = results.events[0]
			//console.log(event)
			expect(event.event).to.equal('Transfer')

			const args = event.args
			//spender address
			expect(args.from).to.equal(deployer.address)
			//receiver address
			expect(args.to).to.equal(receiver.address)
			//the amount that was sent 
			expect(args.value).to.equal(amount)
			

			})
		})

	describe('Failure', () => {
			
		it('rejects insuficent balances', async()=> {
			const invalidAmount = tokens(100000000)
				//use waffle library with blockchain spceifications
			await expect(token.connect(deployer).transfer(receiver.address, invalidAmount)).to.be.reverted
			})

		it('rejects invalid recipient', async() => {
			const amount = tokens(100)
			await expect(token.connect(deployer).transfer('0x0000000000000000000000000000000000000000', amount)).to.be.reverted
			})
		})

		
	})

	describe('Aprooving Tokens',  () => {
		let amount, transaction, result

		beforeEach(async () => {
			amount = tokens(100)
			transaction = await token.connect(deployer).approve(exchange.address, amount)
			result = await transaction.wait()

		})

		describe('Success' ,() => {

		it('allocates an allowance for delegated tokens spending', async () => {
			expect(await token.allowance(deployer.address, exchange.address)).to.equal(amount)
		})

		it('emits approval event', async () => {
			const event = result.events[0]
			//console.log(result)
			expect(event.event).to.equal('Approval')

			const args = event.args
			expect(args.owner).to.equal(deployer.address)
			expect(args.spender).to.equal(exchange.address)
			expect(args.value).to.equal(amount)

		})
		})

		describe('Failure', () => {
			it('rejects invalid spenders', async () => {
				await expect(token.connect(deployer).approve('0x0000000000000000000000000000000000000000', amount)).to.be.reverted
			})
		})

		
	})

	describe('Delegated Transfer Tokens', () => {
		
		let amount, transaction, result
		
		//This is for the approval
		beforeEach(async () => {
			//Before transferfrom function takes place, we have to approve the tokens before we spend them 
			amount = tokens(100)
			transaction = await token.connect(deployer).approve(exchange.address, amount)
			result = await transaction.wait()
		})


	describe('Success', () => {
		//This is for spending 
		beforeEach(async () => {
			transaction = await token.connect(exchange).transferFrom(deployer.address, receiver.address, amount)
			//Here we connect the exchange to the smart contract to sign the transaction that calls
			//transfer from 
			result = await transaction.wait()
		})

		it('Transfers Token Balances', async () => {
			//check if the balance of owner goes down
			expect(await token.balanceOf(deployer.address)).to.equal(tokens(999900))
			//check if the balance of receiver goes up 
			expect(await token.balanceOf(receiver.address)).to.equal(amount)
		})

		it('resets the allowance', async () => {
			//after they took out the tokens from our account the allowance mapping should be reset to 0
			expect(await token.allowance(deployer.address, exchange.address)).to.equal(0)
		})

		it('emits transfer event', async () => {
			const event = result.events[0]
			expect(event.event).to.equal('Transfer')

			const args = event.args
			expect(args.from).to.equal(deployer.address)
			expect(args.to).to.equal(receiver.address)
			expect(args.value).to.equal(amount)
		})

		
	})

	describe('Failure', () => {
			//Attempt to transfer to many tokens 
			it('rejects insufficient fund', async () => {
				const invalidAmount = tokens(10000000)
				await expect(token.connect(exchange).transferFrom(deployer.address, receiver.address, invalidAmount)).to.be.reverted
			})
		})
	})


	})
	
	








