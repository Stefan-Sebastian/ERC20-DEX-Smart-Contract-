//SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "hardhat/console.sol";
//Import ERC-20 Token
//Meaning:
// './' -> look in the current directory
// Token.sol -> name of the file that we want to import 
// import -> keyword that lets us import the file we want 
import "./Token.sol";

contract Exchange{

	//1. Track the fee account
	address public feeAccount;

	//2.Determine the percentage of the fees for the feeAccount
	uint256 public feePercent;

	uint256 public countOrders; //This is a state variable that is 0 by default and is incremented everytime someone calls makeOrder function 

	mapping(uint256 => _Order ) public orders;
	mapping(uint256 => bool) public canceledOrders;
	mapping(uint256 => bool) public filledOrders;


	mapping(address => mapping(address => uint256)) public tokens;
	//Address1 -> Token
	//Address2 -> User
	//Uint256 -> Amount of tokens the user has 
	//Logic: For each token we check how many users there are and how many tokens
	//each user has!!!!!
	//We want to see how many tokens each person has on the exchange 
	//This one keeps track of the 


	event Deposit
	(
		address token, 
		address user, 
		uint256 amount, 
		uint256 balance
	);

	event Withdraw
	(
		address token, 
		address user, 
		uint256 amount, 
		uint256 balance
	);

	event Order
	(
		uint256 id,
		address user,
		address tokenGet,
		uint256 amountGet,
		address tokenGive,
		uint256 amountGive,
		uint256 timestamp
	);

	event Cancel
	(
		uint256 id,
		address user,
		address tokenGet,
		uint256 amountGet,
		address tokenGive,
		uint256 amountGive,
		uint256 timestamp
	);

	event Trade
	(
		uint256 id,
		address user,
		address tokenGet,
		uint256 amountGet,
		address tokenGive,
		uint256 amountGive,
		address creator,
		uint256 timestamp
	);

	struct _Order
	{
		
		uint256 id; //Unique identifier for the order
		address user; //User who created the order
		address tokenGet; // Address of the token they receive
		uint256 amountGet; //Amount of tokens they receive
		address tokenGive; // Address of token they give
		uint256 amountGive; //Amount of tokens they give
		uint256 timestamp; //When order was created 
	}

	

	constructor(address _feeAccount, uint256 _feePercent){
		feeAccount = _feeAccount;
		feePercent = _feePercent;
	}

	// ---------------------------------------------------------------------------------------------------------------
	//Deposit & Withdraw Tokens
	

	function depositTokens(address _token, uint256 _amount) public {
		//Transfer tokens into the exchange to be traded
		// !!! Remember that the token keeps track of how many tokens the exchange acctually posses
		require(Token(_token).transferFrom(msg.sender, address(this), _amount));
		//Require offers us prottection at the exchange level so if we get an error we can see where the problem is 
		//Meaning: Token(_token) -> calling our ERC-20 smart contract and passing the _token address
		//transferFrom -> bring in the function that transfer tokens from owner to the exchange
		//msg.sender -> owner
		//address(this) -> the Exchange smart contract itself(this is how we get the address inside of the smart contract)
		//_amount -> the amount of tokens we approve to transfer 
		
		//Update user balance
		//!!! This is a quick reference
		//If there are no tokens the default value will be 0 
		//Here we add tokens to the user on the exchange balance
		tokens[_token][msg.sender] = tokens[_token][msg.sender] +  _amount;


		//Emit an event that lets us know when a deposit happens and also check the history of it 
		emit Deposit(_token, msg.sender, _amount, tokens[_token][msg.sender]);

	}

	function withdrawTokens(address _token, uint256 _amount) public {
		//Ensure that user has enough tokens to withdraw 
		//The have to have more tokens than they want to withdraw or equal to the amount
		require(tokens[_token][msg.sender] >= _amount);

		//1.Transfer tokens back to the user 
		//Token keeps track on how many tokens are on the exchange
		Token(_token).transfer(msg.sender, _amount);
		
		//2.Update the balances
		//Here the tokens are already off the exchange but we make a quick reference that 
		//is telling the exchange how many tokens exists on that platform 
		tokens[_token][msg.sender] = tokens[_token][msg.sender] -  _amount;

		//3.Emit withdraw event 
		emit Withdraw(_token, msg.sender, _amount, tokens[_token][msg.sender]);

		
	}

	//Check balances of the tokens users have deposited 
	//Function wrapper that checks the value from mapping 
	//This is another way for checking the values and reading them from mapping 
	function balanceOf(address _token, address _user) public view returns(uint256){
		return tokens[_token][_user];
	}

	function makeOrder
	(
		address _tokenGet, 
		uint256 _amountGet, 
		address _tokenGive, 
		uint256 _amountGive
	) 

		public {

		//Prevent orders of tokens aren't on the exchange 
		require(balanceOf(_tokenGive, msg.sender) >= _amountGive);

		//countOrders = countOrders + 1; -> this is one way to increment whatever countOrders value is 
		countOrders ++; //You can add ++ to increment directly whatever the value of the countOrders is 


		orders[countOrders] = _Order
		(
			countOrders,
			msg.sender,
			_tokenGet,
			_amountGet,
			_tokenGive,
			_amountGive,
			block.timestamp
		);

		emit Order
		(
			countOrders,
			msg.sender,
			_tokenGet,
			_amountGet,
			_tokenGive,
			_amountGive,
			block.timestamp

		);


	}

	function cancelOrders(uint256 _id) public {
		
		//Fetch Order
		//When you pull out something from the mapping you have to use "storage" keyword
		_Order storage _order = orders[_id];

		//Ensure that the caller of  this function is the owner of the order 
		require(address(_order.user) == msg.sender);
		//!!! one "=" -> assign things
		// two "==" -> comparison 

		//Orders must exist
		require(_order.id == _id);

		
		//Cancel Order
		canceledOrders[_id] = true;


		emit Cancel
		
		(
			_order.id,
			msg.sender,
			_order.tokenGet,
			_order.amountGet,
			_order.tokenGive,
			_order.amountGive,
			block.timestamp
		);

	}

	//-------------------------------------------------------------------------------
	//EXECUTING ORDERS

	function fillOrder(uint256 _id) public {
		//Write validations
		//1. Must be valid orderId
		require(_id > 0 && _id <= countOrders, 'Order does not exist');

		//2. Order can't be filled if it's already filled 
		require(!filledOrders[_id]);

		//3. Order can't be cancelled
		require(!canceledOrders[_id]);
		// "!" means oposite -> ex: use the oposite of the this value is 

		//Fetch the order from library 
		_Order storage _order = orders[_id];

		//Execute the trade 
		_trade
		(
			_order.id,
			_order.user,
			_order.tokenGet,
			_order.amountGet,
			_order.tokenGive,
			_order.amountGive
		);

		//Mark order as filled 
		filledOrders[_order.id] = true;
	}

	function _trade
	(
		uint256 _orderId, 
		address _user, 
		address _tokenGet, 
		uint256 _amountGet, 
		address _tokenGive, 
		uint256 _amountGive 
	) 

	internal {

		//Fee is paid by the user wh0 filled the order(msg.sender)
		//Fee is deducted from _amountget
		uint256 _feeAmount = (_amountGet * feePercent) / 100;

		//1. Fill the order with the caller of the function and update the balances
		//This user2 the one who fills the order created by user1 
		//Substract tokenGet from user2
		tokens[_tokenGet][msg.sender] = tokens[_tokenGet][msg.sender] - (_amountGet + _feeAmount);

		//Increment tokenGet to user1
		tokens[_tokenGet][_user] = tokens[_tokenGet][_user] + _amountGet;

		//Charge Fees 
		tokens[_tokenGet][feeAccount] = tokens[_tokenGet][feeAccount] + _feeAmount; 

		//Deduct tokenGive from user1 and credit to user2
		tokens[_tokenGive][_user] = tokens[_tokenGive][_user] - _amountGive;
		tokens[_tokenGive][msg.sender] = tokens[_tokenGive][msg.sender] + _amountGive;

		emit Trade
		(
			_orderId,
			msg.sender, // the taker
			_tokenGet,
			_amountGet,
			_tokenGive,
			_amountGive,
			_user,
			block.timestamp
		);


	}
}







