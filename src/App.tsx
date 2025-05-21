import { useState, useEffect, useCallback } from 'react';
import { ConnectKitButton } from 'connectkit';
import { useAccount, useContractRead, useWalletClient, usePublicClient } from 'wagmi';
import { formatUnits } from 'viem';
import axios from 'axios';
import { CheckCircle } from 'lucide-react';

import { parseUnits } from 'viem';

const GHO_CONTRACT = {
  address: '0x40D16FC0246aD3160Ccc09B8D0D3A2cD28aE6C2f' as `0x${string}`,
  abi: [
    {
      name: "balanceOf",
      type: "function",
      stateMutability: "view",
      inputs: [{ name: "account", type: "address" }],
      outputs: [{ name: "", type: "uint256" }],
    },
  ],
};

function BridgeModal({ open, step, txHash, error, onClose, onRetry, explorerBaseUrl }: {
  open: boolean;
  step: string;
  txHash?: string;
  error?: string | null;
  onClose: () => void;
  onRetry: () => void;
  explorerBaseUrl: string;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-sm flex flex-col items-center">
        {!error && !txHash && (
          <>
            <div className="mb-4 animate-spin text-blue-500">
              <svg width="40" height="40" viewBox="0 0 40 40" fill="none"><circle cx="20" cy="20" r="18" stroke="#6366f1" strokeWidth="4" strokeDasharray="90 60" /></svg>
            </div>
            <div className="text-lg font-semibold mb-2">Processing bridge transaction</div>
            <div className="text-blue-700 text-sm text-center">{step}</div>
          </>
        )}
        {txHash && !error && (
          <>
            <div className="mb-4 text-green-500">
              <svg width="48" height="48" fill="none"><circle cx="24" cy="24" r="22" stroke="#22c55e" strokeWidth="4" /><path d="M16 24l6 6 10-10" stroke="#22c55e" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </div>
            <div className="text-lg font-semibold mb-2">Bridge Successful!</div>
            <div className="mb-4 text-blue-700 text-sm text-center">Your transaction was confirmed.</div>
            <div className="mb-2 text-center text-base">
              You just scored <span className="font-semibold text-[#2f44df]">100</span> wink points!
            </div>
            <a href={`${explorerBaseUrl}${txHash}`} target="_blank" rel="noopener noreferrer" className="w-full bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-4 rounded-xl shadow-lg transition-colors duration-200 text-center block mb-2">View Transaction</a>
            <button onClick={onClose} className="w-full bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold py-2 px-4 rounded-xl">Close</button>
          </>
        )}
        {error && (
          <>
            <div className="mb-4 text-red-500">
              <svg width="48" height="48" fill="none"><circle cx="24" cy="24" r="22" stroke="#ef4444" strokeWidth="4" /><path d="M16 16l16 16M32 16L16 32" stroke="#ef4444" strokeWidth="4" strokeLinecap="round" /></svg>
            </div>
            <div className="text-lg font-semibold mb-2">Transaction Failed</div>
            <div className="mb-4 text-red-700 text-sm text-center">{error}</div>
            <button onClick={onRetry} className="w-full bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-4 rounded-xl mb-2">Try Again</button>
            <button onClick={onClose} className="w-full bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold py-2 px-4 rounded-xl">Close</button>
          </>
        )}
      </div>
    </div>
  );
}

function SuccessModal({ open, txHash, onClose, explorerBaseUrl }: {
  open: boolean;
  txHash?: string;
  onClose: () => void;
  explorerBaseUrl: string;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-sm flex flex-col items-center relative">
        <button
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-700"
          onClick={onClose}
          aria-label="Close"
        >
          <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
        </button>
        <div className="mb-4 text-green-500">
          <CheckCircle size={48} />
        </div>
        <div className="text-lg font-semibold mb-2">Bridge Transaction Successful</div>
        <div className="mb-2 text-center text-base">
          You earned <span className="font-semibold text-[#2f44df]">100</span> wink points!
        </div>
        {txHash && (
          <a
            href={`${explorerBaseUrl}${txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-4 rounded-xl shadow-lg transition-colors duration-200 text-center block mb-2"
          >
            View on Block Explorer
          </a>
        )}
      </div>
    </div>
  );
}

// Component to create the bridge card UI
function BridgeCard() {
  const [amount, setAmount] = useState<string>('');
  const [quote, setQuote] = useState<any>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalStep, setModalStep] = useState('');
  const [modalTxHash, setModalTxHash] = useState<string | undefined>(undefined);
  const [modalError, setModalError] = useState<string | null>(null);
  const { isConnected, address } = useAccount();

  const [winkpoints, setWinkpoints] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [successModalOpen, setSuccessModalOpen] = useState(false);

  const [minDeposit, setMinDeposit] = useState<string | null>(null);
  const [maxDeposit, setMaxDeposit] = useState<string | null>(null);
  const [limitsLoading, setLimitsLoading] = useState(false);
  const [amountError, setAmountError] = useState<string | null>(null);

  const { data: ghoRaw, isLoading: ghoLoading } = useContractRead({
    address: GHO_CONTRACT.address,
    abi: GHO_CONTRACT.abi,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
  });
  const ghoBalance = ghoRaw ? formatUnits(ghoRaw as bigint, 18) : '0';
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  const explorerBaseUrl = 'https://etherscan.io/tx/';

  useEffect(() => {
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0 || !address) {
      setQuote(null);
      return;
    }

    let cancelled = false;
    setQuoteLoading(true);

    // Debounce: only fire after user stops typing for 400ms
    const timeout = setTimeout(async () => {
      try {
        const amountWei = parseUnits(amount, 18).toString();
        const { data } = await axios.get('https://app.across.to/api/suggested-fees', {
          params: {
            inputToken: '0x1ff1dC3cB9eeDbC6Eb2d99C03b30A05cA625fB5a',
            outputToken: '0x6bDc36E20D267Ff0dd6097799f82e78907105e2F',
            originChainId: 1,
            destinationChainId: 232,
            recipient: address,
            amount: amountWei,
            skipAmountLimit: true,
            allowUnmatchedDecimals: true,
          },
        });
        if (!cancelled) setQuote(data);
      } catch (e) {
        if (!cancelled) setQuote(null);
      } finally {
        if (!cancelled) setQuoteLoading(false);
      }
    }, 400);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [amount, address]);

  useEffect(() => {
    if (isConnected && address) {
      fetchWinkpoints();
      // Fetch min/max deposit limits
      setLimitsLoading(true);
      axios.get('https://app.across.to/api/limits', {
        params: {
          inputToken: '0x1ff1dC3cB9eeDbC6Eb2d99C03b30A05cA625fB5a',
          outputToken: '0x6bDc36E20D267Ff0dd6097799f82e78907105e2F',
          originChainId: 1,
          destinationChainId: 232,
          allowUnmatchedDecimals: true,
        },
      })
        .then(res => {
          setMinDeposit(res.data.minDeposit);
          setMaxDeposit(res.data.maxDeposit);
        })
        .catch(() => {
          setMinDeposit(null);
          setMaxDeposit(null);
        })
        .finally(() => setLimitsLoading(false));
    }
  }, [isConnected, address]);

  useEffect(() => {
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      setAmountError(null);
      return;
    }
    if (minDeposit && maxDeposit) {
      const min = Number(formatUnits(BigInt(minDeposit), 18));
      const max = Number(formatUnits(BigInt(maxDeposit), 18));
      const amt = Number(amount);
      if (amt < min || amt > max) {
        setAmountError(`The amount entered should be minimum ${min.toFixed(3)} and maximum ${max.toFixed(3)} GHO.`);
      } else {
        setAmountError(null);
      }
    } else {
      setAmountError(null);
    }
  }, [amount, minDeposit, maxDeposit]);

  function handleModalClose() {
    setModalOpen(false);
    setModalStep('');
    setModalTxHash(undefined);
    setModalError(null);
  }

  function handleModalRetry() {
    setModalOpen(false);
    setTimeout(() => {
      handleBridge();
    }, 300);
  }

  const handleBridge = async () => {
    try {
      if (!walletClient || !address) throw new Error('Wallet not connected');
      const amountInWei = parseUnits(amount.toString(), 18).toString();
      setModalOpen(true);
      setModalStep('Preparing bridge transaction...');
      setModalTxHash(undefined);
      setModalError(null);
      setSuccessModalOpen(false);
      setModalStep('Fetching bridge quote...');
      const { data } = await axios.get('https://app.across.to/api/swap/approval', {
        params: {
          amount: amountInWei,
          inputToken: "0x40D16FC0246aD3160Ccc09B8D0D3A2cD28aE6C2f",
          originChainId: 1,
          outputToken: '0x0000000000000000000000000000000000000000',
          destinationChainId: 232,
          depositor: address,
          recipient: address,
          tradeType: 'exactInput',
          slippageTolerance: 0.5
        }
      });
      setModalStep('Checking approval...');
      if (data.approvalTxns) {
        for (const approvalTxn of data.approvalTxns) {
          setModalStep('Waiting for approval transaction...');
          const tx = await walletClient?.sendTransaction({
            to: approvalTxn.to,
            data: approvalTxn.data,
          });
          setModalStep('Waiting for approval confirmation...');
          if (tx && publicClient) {
            await publicClient.waitForTransactionReceipt({ hash: tx });
          }
        }
      }
      setModalStep('Sending bridge transaction...');
      const swapTx = await walletClient?.sendTransaction({
        to: data.swapTx.to,
        data: data.swapTx.data,
        value: data.swapTx.value ? BigInt(data.swapTx.value) : undefined,
      });
      setModalStep('Waiting for bridge confirmation...');
      if (swapTx && publicClient) {
        await publicClient.waitForTransactionReceipt({ hash: swapTx });
      }
      setModalOpen(false);
      setSuccessModalOpen(true);
      setModalStep('Bridge transaction successful!');
      setModalTxHash(swapTx);
      await updatePoints();
    } catch (error: any) {
      setModalError(error.message || 'Bridge failed');
    }
  };

  const fetchWinkpoints = useCallback(async () => {
    if (!address) return 0;

    try {
      setIsProcessing(true);
      const response = await fetch(
        `https://inner-circle-seven.vercel.app/api/action/getPoints?address=${address}`,
        { method: "GET" }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.statusText}`);
      }

      const data = await response.json();
      console.log("Winkpoints data:", data);

      if (data && data.points !== undefined) {
        setWinkpoints(data.points);
        return data.points;
      } else {
        console.warn("Invalid data format received:", data);
        setWinkpoints(0);
        return 0;
      }
    } catch (error) {
      console.error("Error fetching winkpoints:", error);
      setWinkpoints(0);
      return 0;
    } finally {
      setIsProcessing(false);
    }
  }, [address]);

  const updatePoints = async () => {
    try {
      const response = await fetch(
        "https://inner-circle-seven.vercel.app/api/action/setPoints",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            to: address,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to update points");
      }

      const data = await response.json();
      console.log("Points updated:", data);

      setWinkpoints(0);
      fetchWinkpoints();
    } catch (error) {
      console.error("Error updating points:", error);
    }
  };

  function handleSuccessModalClose() {
    setSuccessModalOpen(false);
    setModalStep('');
    setModalTxHash(undefined);
    setModalError(null);
    setModalOpen(false);
  }

  return (
    <div className="">
      <BridgeModal
        open={modalOpen}
        step={modalStep}
        txHash={modalTxHash}
        error={modalError}
        onClose={handleModalClose}
        onRetry={handleModalRetry}
        explorerBaseUrl={explorerBaseUrl}
      />
      <SuccessModal
        open={successModalOpen}
        txHash={modalTxHash}
        onClose={handleSuccessModalClose}
        explorerBaseUrl={explorerBaseUrl}
      />
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-violet-50">
        <div className="w-full max-w-[450px]">
          {/* Main Card */}
          <div className="bg-white rounded-2xl shadow-2xl overflow-hidden p-4 px-5 space-y-2 border border-blue-100">
            <div className="flex justify-between">
              <div className="flex items-center gap-2">
                <p className="text-gray-700">Wink Points:</p>
                {isProcessing ? (
                  <div className="animate-pulse h-4 w-8 bg-gray-200 rounded"></div>
                ) : (
                  <p className="text-gray-800">{winkpoints}</p>
                )}
              </div>
              <div className="flex flex-col items-end">
                <ConnectKitButton.Custom>
                  {({ show, isConnected }) => (
                    <button
                      className="w-fit bg-gradient-to-r from-blue-500 to-violet-500 hover:from-blue-600 hover:to-violet-600 text-white font-semibold p-2 px-4 rounded-xl shadow-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-200"
                      onClick={() => { if (!isConnected && typeof show === 'function') show(); }}
                      disabled={isConnected}
                    >
                      {isConnected && address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "Connect Wallet"}
                    </button>
                  )}
                </ConnectKitButton.Custom>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <p className="text-gray-600 border w-full text-sm flex justify-center items-center border-[#2f44df] rounded-full px-2 py-1">
                ✓ Attested with Sign Protocol
                <a
                  href="https://sepolia.basescan.org/tx/0xe41df2467ed5313534c3b31d9b41f5641a79604f960551c739e1f0c1920facf5"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#2f44df] rounded-full px-2 py-1 underline"
                >
                  View Attestation
                </a>
              </p>
            </div>
            {/* Send Amount Section */}
            <div className="space-y-2">
              <div className="text-blue-500 text-sm font-semibold flex items-center justify-between">Send
                <span className="text-blue-700 font-semibold text-base">
                  {ghoLoading ? '...' : `${parseFloat(ghoBalance).toLocaleString(undefined, { maximumFractionDigits: 4 })}`} GHO
                </span>
              </div>
              <div className="flex items-center bg-blue-50 border border-blue-100 rounded-xl overflow-hidden">
                <input
                  type="text"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Enter amount"
                  className="flex-grow bg-transparent px-4 text-blue-900 placeholder-gray-400 focus:outline-none"
                />
                <button className="bg-gradient-to-r from-blue-400 to-violet-400 text-xs text-white border-none rounded px-3 py-1 mx-2 font-semibold shadow hover:opacity-90 transition" onClick={() => setAmount(ghoBalance)}>
                  MAX
                </button>
                {/* Token selector */}
                <div className="flex items-center bg-white border-l border-blue-100 px-4 py-2">
                  <img
                    src="/images/gho_logo.webp"
                    alt="ETH"
                    className="w-5 h-5 mr-2"
                  />
                  <span className="font-medium text-blue-700">GHO</span>
                </div>
              </div>
              {amountError && (
                <div className="text-red-500 text-xs mt-1">{amountError}</div>
              )}
            </div>

            {/* From Chain Section */}
            <div className="space-y-2">
              <div className="text-blue-500 text-sm font-semibold">From</div>
              <div className="flex items-center bg-blue-50 border border-blue-100 rounded-xl px-4 py-2">
                <div className="w-6 h-6 mr-3 flex-shrink-0">
                  <img
                    src="/images/eth-logo.svg"
                    alt="Ethereum"
                    className="w-full h-full"
                  />
                </div>
                <span className="flex-grow font-medium text-blue-700">Ethereum Mainnet</span>
              </div>
            </div>
            {/* To Chain Section */}
            <div className="space-y-2">
              <div className="text-blue-500 text-sm font-semibold">To</div>
              <div className=" flex items-center justify-between bg-blue-50 border border-blue-100 rounded-xl">
                <div className="flex items-center  px-4">
                  <div className="w-6 h-6 mr-3 flex-shrink-0">
                    <img
                      src="/images/lens-logo.png"
                      alt="Lens chain"
                      className="w-full h-full"
                    />
                  </div>
                  <span className="flex-grow font-medium text-blue-700">Lens</span>
                </div>
                <div className="flex items-center bg-white border-l border-blue-100 px-4 py-2 rounded-r-xl">
                  <img
                    src="/images/gho_logo.webp"
                    alt="GHO"
                    className="w-5 h-5 mr-2"
                  />
                  <span className="font-medium text-blue-700">
                    {quoteLoading ? (
                      <div className="animate-pulse h-6 w-20 bg-gray-200 rounded" />
                    ) : quote && quote.outputAmount ? (
                      <div className="text-blue-700 text-sm font-semibold">
                        ~<span className="font-bold">{Number(formatUnits(BigInt(quote.outputAmount), 18)).toFixed(3)} GHO</span>
                      </div>
                    ) : null}
                  </span>
                </div>
              </div>
            </div>

            <div className="w-full">
              {isConnected ? (
                <button onClick={handleBridge}
                  disabled={!amount || isNaN(Number(amount)) || Number(amount) <= 0 || !!amountError || limitsLoading}
                  className="w-full bg-gradient-to-r from-blue-500 to-violet-500 hover:from-blue-600 hover:to-violet-600 text-white font-semibold py-3 px-4 rounded-xl shadow-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  Bridge
                </button>
              ) : (
                "Connect Wallet"
              )}
            </div>
            <p className="text-center text-xs text-gray-500">Powered by <span className=' text-violet-700'>winks.fun</span></p>
          </div>
        </div>
      </div>
    </div>
  );
}

function App() {
  return (
    <div className="bg-gradient-to-br from-blue-50 via-white to-violet-50 min-h-screen">
      <BridgeCard />
    </div>
  );
}

export default App;
