// SPDX-License-Identifier: UNLICENSED

//This is a special comment that indicates the license under which 
//the code is distributed. In this case, it is not licensed, 
//as indicated by "UNLICENSED".

pragma solidity ^0.8.0;

import "hardhat/console.sol";
/*This is a commented-out import statement for a library called "console.sol" 
that would allow the code to do console logging and see values 
that come into the project.*/



//ERC-20 TOKEN STANDARD
contract Token{
	string public name;
	//This line declares a public string variable 
	//name for the token's name.

	//symbol
	string public symbol;
	//This line declares a public string variable symbol for the token's symbol.

	//decimals
	uint256 public decimals = 18;
	//This line declares a public uint256 variable decimals and sets it to 18.

	//totalSupply
	uint256 public totalSupply; //1,000,000 * 10^18
	//This line declares a public uint256 variable totalSupply and leaves it uninitialized.

	//Track Balance
	mapping(address => uint256) public balanceOf;
	//This line declares a public mapping that maps addresses to uint256 values for tracking the balance of each address.

	mapping(address => mapping(address => uint256)) public allowance;
	//This line declares a public mapping that maps an address to another mapping, which maps 
	//addresses to uint256 values. This mapping tracks how many tokens a particular 
	//owner has approved for a particular spender.


	/*This line declares an event named Transfer that takes in three arguments: 
	the address that the tokens are transferred from, 
	the address that the tokens are transferred to, and the amount of tokens transferred. 
	The indexed keyword is used to make these arguments searchable.*/
	event Transfer(
	address indexed from, 
	address indexed to, 
	uint256 value
	);

	/*This line declares an event named Approval that takes in three arguments: the address that approves the tokens, 
	the address that the tokens are approved for, and the amount of tokens approved. 
	The indexed keyword is used to make these arguments searchable. */
	event Approval
	(
		address indexed owner, 
		address indexed spender, 
		uint256 value
	);
	

	/* This is the constructor function for the Token contract. It takes in three arguments: 
	the name of the token, the symbol of the token, and the total supply of the token. 
	It initializes the name and symbol variables with the passed-in values, 
	sets the totalSupply variable to the passed-in value times 10^18, and sets 
	the balance of the contract creator (msg.sender) to the totalSupply.*/
	constructor(string memory _name, string memory _symbol, uint256 _totalSupply) {
		name = _name;
		symbol = _symbol;
		totalSupply = _totalSupply * (10**decimals);
		balanceOf[msg.sender] = totalSupply;
	}

	//we wrote this because it just moves tokens around and emits Transfer event which both the transferFrom and 
	//Transfer functions need 
	function _transfer(address _from, address _to, uint256 _value) internal{
		require(_to != address(0));

		balanceOf[_from] = balanceOf[_from] - _value;
		balanceOf[_to] = balanceOf[_to] + _value;

		emit Transfer(_from, _to, _value );
	}

	function transfer(address _to, uint256 _value) public returns(bool success){

		//require that sender has enough tokens to spend 
		require(balanceOf[msg.sender] >= _value);

		_transfer(msg.sender, _to, _value);
		//In this case the _from form _transfer is the msg.sender
		
		/*Deduct tokens form spender
		balanceOf[msg.sender] = balanceOf[msg.sender] - _value;
		//The current balance of the spender equals to the old balance of the spender but minus the value that was sent!!
		
		//Credit tokens to receiver
		balanceOf[_to] = balanceOf[_to] + _value;
		//The cuurent balance of receiver equals the old balance + the value that the address receive

		//Emit Event
		emit Transfer(msg.sender, _to, _value);*/

		return true;
	} 

	

	function approve(address _spender, uint256 _value) public returns(bool success){

		require(_spender != address(0));

		allowance[msg.sender][_spender] = _value;

		emit Approval(msg.sender, _spender, _value);

		return true;
	}

	//create the ability for someone to spend our tokens on our behalf 
	//for exmaple on cryptocurrency exchange 
	function transferFrom(address _from, address _to, uint256 _value) public returns(bool success){
		//check approval
		require(balanceOf[_from] >= _value);
		//Check if the person approvin has enough tokens in his balance 
		
		require(allowance[_from][msg.sender] >= _value);
		//You cannot transfer more value than you have approved 
		
		//Reset allowance to prevent double-spending
		allowance[_from][msg.sender] = allowance[_from][msg.sender] - _value;


		//spend tokens
		_transfer(_from, _to, _value);
		//_from is the owner 
		//msg.sender is the spender 


		return true;
	}


}








