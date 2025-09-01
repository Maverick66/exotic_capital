import { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';

const VISTA_TOKEN_MINT = new PublicKey('4c6C2AiAc91BZuHUKme6Rj9ZFfVV61f9ALWe1i29pump'); // Your $VISTA token mint
const ENTRY_FEE_USD = 5; // $5 entry fee
const ADMIN_WALLET = new PublicKey('6coEmLd2GVUHNuwn3Cc3RjBMXqi8gYwRoAcv9ryjXfhj'); // Replace with your Solana address
const COINGECKO_API = 'https://api.coingecko.com/api/v3/simple/price?ids=vista-token&vs_currencies=usd';

let provider = null;
let userPublicKey = null;

async function getVistaPrice() {
    try {
        const response = await fetch(COINGECKO_API);
        const data = await response.json();
        return data['vista-token']?.usd || 0.0001; // Fallback price if API fails
    } catch (error) {
        console.error('Error fetching $VISTA price:', error);
        return 0.0001; // Fallback price
    }
}

async function connectPhantom() {
    if ('solana' in window) {
        provider = window.solana;
        if (provider.isPhantom) {
            try {
                await provider.connect();
                userPublicKey = provider.publicKey;
                document.getElementById('join-now').innerText = 'Pay $5 in $VISTA';
                document.getElementById('join-now').onclick = payEntryFee;
                document.getElementById('status').innerText = `Connected: ${userPublicKey.toString()}`;
            } catch (error) {
                document.getElementById('status').innerText = 'Connection failed. Please try again.';
                console.error('Connection error:', error);
            }
        } else {
            document.getElementById('status').innerText = 'Please install Phantom Wallet.';
        }
    } else {
        document.getElementById('status').innerText = 'Please install Phantom Wallet.';
        window.open('https://phantom.app/', '_blank');
    }
}

async function payEntryFee() {
    if (!provider || !userPublicKey) {
        document.getElementById('status').innerText = 'Please connect your Phantom wallet first.';
        return;
    }

    try {
        const connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');
        const vistaPrice = await getVistaPrice();
        const vistaAmount = (ENTRY_FEE_USD / vistaPrice) * 1_000_000; // Assuming 6 decimals for $VISTA

        const transaction = new Transaction().add(
            SystemProgram.transfer({
                fromPubkey: userPublicKey,
                toPubkey: ADMIN_WALLET,
                lamports: 0, // No SOL transfer, only token
            })
        );

        // Add token transfer instruction (simplified, requires SPL token setup)
        const tokenInstruction = {
            keys: [
                { pubkey: userPublicKey, isSigner: true, isWritable: true },
                { pubkey: ADMIN_WALLET, isSigner: false, isWritable: true },
                { pubkey: VISTA_TOKEN_MINT, isSigner: false, isWritable: false },
            ],
            programId: TOKEN_PROGRAM_ID,
            data: Buffer.from([3, ...new Uint8Array(new BigInt(vistaAmount).toString(16).padStart(16, '0'))]),
        };
        transaction.add(tokenInstruction);

        const { blockhash } = await connection.getRecentBlockhash();
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = userPublicKey;

        const signed = await provider.signTransaction(transaction);
        const txid = await connection.sendRawTransaction(signed.serialize());
        await connection.confirmTransaction(txid);

        document.getElementById('status').innerText = 'Payment successful! You have access to the ecosystem.';
        document.getElementById('join-now').style.display = 'none';
        document.getElementById('whitepaper').style.display = 'block';
        document.getElementById('staking').style.display = 'block';
        localStorage.setItem('ecosystemAccess', userPublicKey.toString());
    } catch (error) {
        document.getElementById('status').innerText = 'Payment failed. Please try again.';
        console.error('Payment error:', error);
    }
}

window.onload = () => {
    if (localStorage.getItem('ecosystemAccess')) {
        document.getElementById('join-now').style.display = 'none';
        document.getElementById('whitepaper').style.display = 'block';
        document.getElementById('staking').style.display = 'block';
        document.getElementById('status').innerText = 'Welcome back to the ecosystem!';
    }
    document.getElementById('join-now').onclick = connectPhantom;

};
