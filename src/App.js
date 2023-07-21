import Button from 'react-bootstrap/Button'
import Col from 'react-bootstrap/Col'
import Container from 'react-bootstrap/Container'
import Form from 'react-bootstrap/Form'
import ListGroup from 'react-bootstrap/ListGroup'
import Row from 'react-bootstrap/Row'
import Table from 'react-bootstrap/Table'
import { useEffect, useState } from "react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import {
  useContractWrite, useContractRead,
  useAccount, usePrepareContractWrite
} from "wagmi";
import { ethers } from "ethers";

import useDebounce from './hooks/useDebounce';
import MultiSigWallet from './artifacts/contracts/MultiSigWallet.sol/MultiSigWallet.json';

const App = () => {
  
  // MultisigWallet Smart contract handling
  const [scBalance, setScBalance] = useState(0)
  const [scPendingTransactions, setScPendingTransactions] = useState([])
  const [scTotalTransactionCount, setScTotalTransactionCount] = useState(0)
  const [ethToUseForDeposit, setEthToUseForDeposit] = useState(0)
  const debouncedEthToUseForDeposit = useDebounce(ethToUseForDeposit, 500);
  const [ethToUseForWithdrawal, setEthToUseForWithdrawal] = useState(0n);
  const debouncedEthToUseForWithdrawl = useDebounce(ethToUseForWithdrawal, 500);
  const [ethAddrToUseForWithdrawal, setEthAddrToUseForWithdrawal] = useState(0)
  const contractAddress = "0xdfC02Df3500A2777F1bf6547bC84B0a2d721caC6";
  const multiSigWalletDetails = {
    address: contractAddress,
    abi: MultiSigWallet.abi
  }
  // Get the list of owners of the multisig
  const { data: scOwners } = useContractRead({
    ...multiSigWalletDetails,
    functionName: 'getOwners',
  })
  // Get the total number of withdraw transactions
  const { data: withdrawTxCount, isLoading: wthTxCountIsLoading, error: wthTxCountError, } = useContractRead({
    ...multiSigWalletDetails,
    functionName: 'getWithdrawTxCount',
    watch: true,
  });
  // Get the current balance of the multisig wallet
  const { data: contractBalance } = useContractRead({
    ...multiSigWalletDetails,
    functionName: 'balanceOf',
    watch: true,
  })
  // Get the list of transactions
  const { data: withdrawTxes } = useContractRead({
    ...multiSigWalletDetails,
    functionName: 'getWithdrawTxes',
    watch: true,
  })

  useEffect(() => {
    if (contractBalance) {
      let temp = ethers.utils.formatEther(contractBalance);
      setScBalance(temp)
    }
    if (withdrawTxCount) {
      setScTotalTransactionCount(parseInt(withdrawTxCount))
    }
    if (withdrawTxes) {
      let pendingTxes = []
      console.log("wth Txns", withdrawTxes);
      for (let i = 0; i <= withdrawTxes.length - 1; i++) {
        if (!withdrawTxes[i].sent) {
          pendingTxes.push({
            transactionIndex: i,
            to: withdrawTxes[i].to,
            amount: ethers.utils.formatEther(withdrawTxes[i].amount),
            approvals: parseInt(withdrawTxes[i].approvals),
          })
        }
      }
      setScPendingTransactions(pendingTxes)
    }
  }, [contractBalance, withdrawTxCount, withdrawTxes])

  // Deposit ETH to the MultisigWallet smart contract
  const { config: depositConfig } = usePrepareContractWrite({
    ...multiSigWalletDetails,
    functionName: 'deposit',
    value: debouncedEthToUseForDeposit ? ethers.utils.parseEther(debouncedEthToUseForDeposit) :
      0
  });
  const {
    data: depositData,
    isLoading: depositIsLoading,
    error: depositError,
    isSuccess: depositIsSuccess,
    writeAsync: depositWrite
  } = useContractWrite(depositConfig);
  
  // Create Withdraw ETH tx in the MultisigWallet smart contract
  const { config: withdrawConfig } = usePrepareContractWrite({
    ...multiSigWalletDetails,
    functionName: "createWithdrawTx",
    args: [
      ethAddrToUseForWithdrawal,
      debouncedEthToUseForWithdrawl ? ethers.utils.parseEther(debouncedEthToUseForWithdrawl) : 0n,
    ],
    gas: 1_000_000n,
  })
  const {
    data: withdrawData,
    isLoading: withdrawIsLoading,
    error: withdrawError,
    isSuccess: withdrawIsSuccess,
    writeAsync: withdrawWrite,
  } = useContractWrite(withdrawConfig);

  // Approve pending withdraw tx in the MultisigWallet smart contract
  // const { config: approveConfig } = usePrepareContractWrite({
      
  //     args: [],
  // });

  const {
    data: approvePendingData,
    isLoading: approvePendingIsLoading,
    isSuccess: approveIsSuccess,
    error: approveError,
    writeAsync: approvePendingTransaction,
  } = useContractWrite({
    ...multiSigWalletDetails,
    functionName: "approveWithdrawTx"
  });
  return (
    <div className='container flex flex-col  items-center mt-10'>
      <div className='flex mb-6'>
        <ConnectButton />
      </div>

      <Container>
        <Row>
          <h3 className='text-5xl font-bold mb-20'>{'Multisig Wallet Info'}</h3>
        </Row>
        <Row>
          <Col md='auto'>Address:</Col>
          <Col>{contractAddress}</Col>
        </Row>
        <Row>
          <Col md='auto'>Balance:</Col>
          <Col>{scBalance} ETH</Col>
        </Row>
        <Row>
          <Col md='auto'>Total Withdraw Transactions:</Col>
          <Col>{scTotalTransactionCount}</Col>
        </Row>
        <Row>
          <Col md='auto'>Owners:</Col>
          <Col>
            <ListGroup>
              {scOwners && scOwners.map((scOwner, i) => {
                return <ListGroup.Item key={i}>{scOwner}</ListGroup.Item>
              })}
            </ListGroup>
          </Col>
        </Row>
      </Container>

      <Container>
        <Row>
          <h3 className='text-5xl font-bold mb-20'>
            {'Deposit to EtherWallet Smart Contract'}
          </h3>
        </Row>
        <Row>
          <Form>
            <Form.Group className='mb-3' controlId='numberInEthDeposit'>
              <Form.Control
                type='text'
                placeholder='Enter the amount in ETH'
                onChange={(e) => setEthToUseForDeposit(e.target.value)}
              />
              <Button variant='primary'
                onClick={async () => {
                  await depositWrite?.();
                  if (depositIsSuccess) {
                    setEthToUseForDeposit(0);
                  }
                }}
                disabled={!depositWrite || depositIsLoading || depositError}
              >
                Deposit
              </Button>
              <h3>{depositError}</h3>
            </Form.Group>
          </Form>
        </Row>
      </Container>

      <Container>
        <Row>
          <h3 className='text-5xl font-bold mb-20'>
            {'Withdraw from EtherWallet Smart Contract'}
          </h3>
        </Row>
        <Row>
          <Form>
            <Form.Group className='mb-3' controlId='numberInEthWithdraw'>
              <Form.Control
                type='text'
                placeholder='Enter the amount in ETH'
                onChange={(e) => setEthToUseForWithdrawal(e.target.value)}
              />
              <Form.Control
                type='text'
                placeholder='Enter the ETH address to withdraw to'
                onChange={(e) => setEthAddrToUseForWithdrawal(e.target.value)}
              />

              <Button
                variant='primary'
                disabled={!withdrawWrite || withdrawError || withdrawIsLoading}
                onClick={async () => {
                  withdrawWrite?.();
                  if (withdrawIsSuccess) {
                    setEthToUseForWithdrawal(0);
                    setEthAddrToUseForWithdrawal("")
                  }
                }}
              >
                Withdraw
              </Button>
            </Form.Group>
          </Form>
        </Row>
      </Container>

     <Container>
        <Row>
          <h3 className='text-5xl font-bold mb-20'>
            {'Pending Withdraw Transactions'}
          </h3>
        </Row>
        <Row>
          <Table striped hover>
            <thead>
              <tr>
                <th>#</th>
                <th>Receiver</th>
                <th>Amount</th>
                <th>Number of Approvals</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {scPendingTransactions.map((tx, i) => {
                return (
                  <tr key={i}>
                    <td>{i}</td>
                    <td>{tx.to}</td>
                    <td>{tx.amount} ETH</td>
                    <td>{tx.approvals}</td>
                    <td>
                      <Button
                        variant='success'
                        disabled={!approvePendingTransaction || approvePendingIsLoading || approveError}
                        onClick={async () => {
                          await approvePendingTransaction?.({args:[tx.transactionIndex]});
                          if (approveIsSuccess) {
                            console.log("Approved");
                          }  
                        }}
                      >
                        Approve
                      </Button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </Table>
        </Row>
      </Container>
    </div>
  )
}

export default App
