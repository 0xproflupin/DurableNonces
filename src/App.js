import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";
import { PhantomWalletAdapter } from "@solana/wallet-adapter-phantom";
import {
  ConnectionProvider,
  useWallet,
  useConnection,
  WalletProvider,
} from "@solana/wallet-adapter-react";
import {
  WalletModalProvider,
  WalletMultiButton,
} from "@solana/wallet-adapter-react-ui";
import { useMemo, useState } from "react";
import "./App.css";
import "@solana/wallet-adapter-react-ui/styles.css";
import { NonceAccount, Keypair, SystemProgram, PublicKey, LAMPORTS_PER_SOL, Transaction } from "@solana/web3.js";
import * as bs58 from "bs58";

import React, { useCallback } from 'react';

const noncePubKey = new PublicKey("NonfEsHXptEug78ffmryABmCiHsnbXdZvQJCXBWbNoc");
const nonceAuthKP = Keypair.fromSecretKey(
  Uint8Array.from([
    24,58,95,211,152,100,106,160,161,192,179,195,141,102,68,26,
    70,140,199,91,168,193,58,141,160,162,183,47,141,224,231,161,
    30,213,62,103,145,154,118,179,247,7,187,52,169,135,184,250,
    47,226,52,255,251,111,202,104,182,238,46,220,116,178,47,197
  ])
);

const Context = ({ children }) => {
  const network = WalletAdapterNetwork.Mainnet;

  const endpoint = "https://rpc.helius.xyz/?api-key=402f3e20-991a-4e36-9e2b-5f3d375aaec0";

  const wallets = useMemo(
    () => [new PhantomWalletAdapter()], // confirmed also with `() => []` for wallet-standard only
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [network]
  );

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
};

const Content = () => {
  const { publicKey, signTransaction } = useWallet();
  const { connection } = useConnection();
  const [signature, setSignature] = useState(null);

  const sendTransaction = useCallback(async () => {
    try {
      const nonceAccountInfo = await connection.getAccountInfo(noncePubKey);
      if (!nonceAccountInfo){
          console.log("ERROR: couldn't get nonce account info")
          return;
      }
      const nonceAccount = NonceAccount.fromAccountData(nonceAccountInfo.data);      
      console.log("Nonce: ", nonceAccount.nonce);
      console.log("Connected PubKey: ", publicKey.toString());

      const ix = SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: publicKey,
          lamports: 0.001 * LAMPORTS_PER_SOL,
      })

      const advanceIX = SystemProgram.nonceAdvance({
          authorizedPubkey: nonceAuthKP.publicKey,
          noncePubkey: noncePubKey
      })

      const tx = new Transaction();
      tx.add(advanceIX);
      tx.add(ix);

      tx.recentBlockhash = nonceAccount.nonce;
      tx.feePayer = publicKey;
      
      tx.sign(nonceAuthKP);
      const signedtx = await signTransaction(tx);
      
      console.log(bs58.encode(signedtx.serialize({requireAllSignatures: false})));
      const sig = await connection.sendRawTransaction(signedtx.serialize({requireAllSignatures: false}));
      console.log("Signed durable transaction: ", sig);
      setSignature(sig);
    } catch (error) {
      console.warn(error);
    }
}, [connection, publicKey, signTransaction]);

  return (
    <div className="App">
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          marginTop: 30,
          marginBottom: 30,
        }}
      >
        <WalletMultiButton />
      </div>
      {publicKey ? (
        <>
          <button onClick={sendTransaction}>
            sign durable tx
          </button>
          <h3>Result</h3>
          <p>
            {signature
              ? signature
              : "Awaiting signature"}
          </p>
        </>
      ) : (
        <p>Please connect your wallet</p>
      )}
    </div>
  );
};

const App = () => {
  return (
    <Context>
      <Content />
    </Context>
  );
};
export default App;
