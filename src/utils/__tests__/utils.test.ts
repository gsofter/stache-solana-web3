import * as anchor from "@project-serum/anchor";
import { clusterApiUrl, Keypair, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { airdropSol } from "../utils";

// eslint-disable-next-line @typescript-eslint/no-var-requires
require('dotenv').config({
    path: '.env',
});



describe('Utils', () => {

    it('airdropSol: should airdrop 1 sol to admin wallet', async () => {
        const connection = new anchor.web3.Connection(clusterApiUrl('devnet'), "confirmed")
        const wallet = anchor.web3.Keypair.generate();
        await airdropSol(connection, wallet.publicKey, 2)
        const adminBalance = await connection.getBalance(wallet.publicKey)
        expect(adminBalance).toBe(LAMPORTS_PER_SOL * 2)
    }, 10000);
});
