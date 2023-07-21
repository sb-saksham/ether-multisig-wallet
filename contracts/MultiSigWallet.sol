// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

/// Transaction You are trying to approve does not exists!
/// @param transactionIndex Index of transaction
error TxNotExists(uint transactionIndex);

/// Transaction you are trying to approve is already approved!
/// @param transactionIndex Index of transaction
error TxAlreadyApproved(uint transactionIndex);

/// Transaction you are trying to send is already sent!
/// @param transactionIndex Index of transaction
error TxAlreadySent(uint transactionIndex);

contract MultiSigWallet {
    event Deposit(address indexed sender, uint amount, uint balance);

    event CreateWithdrawTx(
        address indexed owner,
        uint indexed transactionIndex,
        address indexed to,
        uint amount
    );

    event ApprovedWithdrawTx(
        address indexed owner,
        uint indexed transactionIndex
    );

    // An array to keep track of owners
    address[] public owners;

    // Particular Address is one of the owners or not
    mapping(address => bool) public isOwner;

    // Total number of quorum required to approve a withdraw transaction
    uint public quorumRequired;

    struct WithdrawTx {
        address to;
        uint amount;
        uint approvals;
        bool sent;
    }

    // Whether a particular withdraw transaction has already been approved by the current caller
    mapping(uint => mapping(address => bool)) public isApproved;

    // List of withdrawal transactions
    WithdrawTx[] public withdrawTxes;

    // Takes in a list of owners for the wallet and the total number of quorum that
    // will be required for withdrawal to be confirmed.
    constructor(address[] memory _owners, uint _quorumReq) {
        require(_owners.length > 0, "Atleast 1 One Owner is Required!");
        require(
            _quorumReq > 0 && _quorumReq <= _owners.length,
            "Invalid Quorum Required Number!"
        );
        for (uint i = 0; i < _owners.length; i++) {
            require(
                _owners[i] != address(0),
                "Invalid Owner Address(Zero address provided)!"
            );
            require(!isOwner[_owners[i]], "Already a Owner!");
            isOwner[_owners[i]] = true;
            owners.push(_owners[i]);
        }
        quorumRequired = _quorumReq;
    }

    // Ensures that the function caller is one of the owners of the wallet
    modifier onlyOwner() {
        require(isOwner[msg.sender], "Only Owner can perform this operation!");
        _;
    }

    // Ensures that transaction exists in the list of withdraw transactions
    modifier transactionExists(uint _transactionIndex) {
        if (_transactionIndex >= withdrawTxes.length) {
            revert TxNotExists(_transactionIndex);
        }
        _;
    }

    // Ensures that transaction has not yet been approved
    modifier transactionNotApproved(uint _transactionIndex) {
        if (isApproved[_transactionIndex][msg.sender] == true) {
            revert TxAlreadyApproved(_transactionIndex);
        }
        _;
    }

    // Ensures that transaction has not yet been sent
    modifier transactionNotSent(uint _transactionIndex) {
        if (withdrawTxes[_transactionIndex].sent == true) {
            revert TxAlreadySent(_transactionIndex);
        }
        _;
    }

    // Used to initiate the withdrawal
    function createWithdrawTx(address _to, uint _amount) public onlyOwner {
        uint txIndex = withdrawTxes.length;
        withdrawTxes.push(
            WithdrawTx({to: _to, amount: _amount, approvals: 0, sent: false})
        );
        emit CreateWithdrawTx(msg.sender, txIndex, _to, _amount);
    }

    //approve the withdraw a particular transaction
    function approveWithdrawTx(
        uint _transactionIndex
    )
        public
        onlyOwner
        transactionExists(_transactionIndex)
        transactionNotApproved(_transactionIndex)
        transactionNotSent(_transactionIndex)
    {
        isApproved[_transactionIndex][msg.sender] = true;
        WithdrawTx storage thisTransaction = withdrawTxes[_transactionIndex];
        thisTransaction.approvals += 1;
        if (thisTransaction.approvals >= quorumRequired) {
            thisTransaction.sent = true;
            (bool sent, ) = thisTransaction.to.call{
                value: thisTransaction.amount
            }("");
            require(sent, "Transaction failed try again!");
        }
        emit ApprovedWithdrawTx(msg.sender, _transactionIndex);
    }

    // receiving of ETH to this multisig wallet
    function deposit() public payable onlyOwner {
        emit Deposit(msg.sender, msg.value, address(this).balance);
    }

    receive() external payable {
        emit Deposit(msg.sender, msg.value, address(this).balance);
    }

    // retrieves the list of owners of the multisig wallet
    function getOwners() public view returns (address[] memory) {
        return owners;
    }

    // retrieves the total number of withdrawal transactions for the multisig  wallet
    function getWithdrawTxCount() public view returns (uint) {
        return withdrawTxes.length;
    }

    // retrieves all the withdraw transactions for the multisig wallet
    function getWithdrawTxes() public view returns (WithdrawTx[] memory) {
        return withdrawTxes;
    }

    // returns the withdraw transaction details according to the transaction index in the array
    function getWithdrawTx(
        uint _transactionId
    ) public view returns (address to, uint amount, uint approvals, bool sent) {
        WithdrawTx storage wtx = withdrawTxes[_transactionId];
        return (wtx.to, wtx.amount, wtx.approvals, wtx.sent);
    }

    // Gets the current amount of ETH in the multisig wallet
    function balanceOf() public view returns (uint) {
        return address(this).balance;
    }
}
