import * as anchor from "@project-serum/anchor";
import { Idl, Program, web3 } from "@project-serum/anchor";

import { execSync } from "child_process";

import kcidl from "../idls/keychain.json";
import stidl from '../idls/stashe.json'

import { Keypair, PublicKey, sendAndConfirmTransaction, SystemProgram, Transaction } from "@solana/web3.js";
import {
    createNFTMint, createTokenMint,
    findStachePda,
    findDomainPda,
    findDomainStatePda,
    findKeychainKeyPda,
    findKeychainPda,
    findKeychainStatePda
} from "./utils";
import * as assert from "assert";
import {
    ASSOCIATED_TOKEN_PROGRAM_ID,
    createAssociatedTokenAccount,
    createAssociatedTokenAccountInstruction,
    getOrCreateAssociatedTokenAccount,
    createMint,
    createMintToCheckedInstruction,
    createTransferCheckedInstruction,
    createTransferCheckedWithFeeInstruction, createTransferInstruction,
    getAssociatedTokenAddress,
    getAssociatedTokenAddressSync,
    mintToChecked, TOKEN_PROGRAM_ID,
    transferChecked
} from "@solana/spl-token";

// eslint-disable-next-line @typescript-eslint/no-var-requires
require('dotenv').config({
    path: '.env',
});


const KeychainIdl = kcidl as Idl;
const StacheIdl = stidl as Idl;

const renameCost = new anchor.BN(anchor.web3.LAMPORTS_PER_SOL * 0.01);

const admin = Keypair.fromSecretKey(
    Buffer.from(
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        JSON.parse(require("fs").readFileSync(process.env.ADMIN_WALLET, {
            encoding: 'utf-8'
        }))
    )
)
const treasury = Keypair.fromSecretKey(
    Buffer.from(
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        JSON.parse(require("fs").readFileSync(process.env.TREASURY_WALLET, {
            encoding: 'utf-8'
        }))
    )
)

export const getKeychain = async (provider: anchor.AnchorProvider, domain: string, username: string) => {
    const keychainProgram = new Program(KeychainIdl, KeychainIdl.metadata.address, provider);
    const [userKeychainPda] = findKeychainPda(username, domain, keychainProgram.programId);
    const keychain = await keychainProgram.account.currentKeyChain.fetchNullable(userKeychainPda);

    return keychain
}

export const createKeychain = async (provider: anchor.AnchorProvider, domain: string, username: string) => {
    const keychainProgram = new Program(KeychainIdl, KeychainIdl.metadata.address, provider);
    const [domainPda] = findDomainPda(domain, keychainProgram.programId);
    const [domainStatePda, domainStatePdaBump] = findDomainStatePda(domain, keychainProgram.programId);

    const domainAcc = await keychainProgram.account.currentDomain.fetchNullable(domainPda);
    if (domainAcc) {
        console.log(`domain ${domain} already exist`)
    } else {
        console.log(`creating keychain domain: ${domain}...`);
        // first create the domain
        const txid = await keychainProgram.methods.createDomain(domain, renameCost).accounts({
            domain: domainPda,
            domainState: domainStatePda,
            authority: provider.wallet.publicKey,
            systemProgram: SystemProgram.programId,
            treasury: treasury.publicKey
        }).rpc();

        console.log(`created keychain domain tx: ${txid}`);
    }

    const [userKeychainPda] = findKeychainPda(username, domain, keychainProgram.programId);
    const [userKeychainStatePda] = findKeychainStatePda(userKeychainPda, domain, keychainProgram.programId);
    const [userKeychainKeyPda] = findKeychainKeyPda(provider.wallet.publicKey, domain, keychainProgram.programId);

    const keychainAcc = await keychainProgram.account.currentKeyChain.fetch(userKeychainPda);
    if (keychainAcc) {
        console.log(`keychain ${domain}.${username} already exist`)
    } else {
        console.log(`creating keychain for : ${username}...`);
        // then create the keychain
        const txid = await keychainProgram.methods.createKeychain(username).accounts({
            keychain: userKeychainPda,
            keychainState: userKeychainStatePda,
            key: userKeychainKeyPda,
            domain: domainPda,
            authority: provider.wallet.publicKey,
            wallet: provider.wallet.publicKey,
            systemProgram: SystemProgram.programId,
        }).rpc();
        console.log(`created keychain for ${username}. tx: ${txid}`);
    }
}

/**
 * Create stache
 * 
 * @param provider 
 * @param domain 
 * @param username 
 */
export const createStache = async (
    provider: anchor.AnchorProvider,
    domain: string,
    username: string,
) => {

    const stacheProgram = new Program(StacheIdl, StacheIdl.metadata.address, provider);
    const keychainProgram = new Program(KeychainIdl, KeychainIdl.metadata.address, provider);
    const [domainPda] = findDomainPda(domain, keychainProgram.programId);

    const [userKeychainPda] = findKeychainPda(username, domain, keychainProgram.programId);

    const [stachePda, stachePdaBump] = findStachePda(username, domainPda, stacheProgram.programId);

    const txid = await stacheProgram.methods.createStache().accounts({
        stache: stachePda,
        keychain: userKeychainPda,
        keychainProgram: keychainProgram.programId,
        systemProgram: SystemProgram.programId,
    }).rpc();

    const stache = await stacheProgram.account.currentStache.fetch(stachePda);
}


/**
 * 
 * Stache
 * @param provider AnchorProvider
 * @param mint Minted Token Account
 * @param userAta 
 * @param domain
 * @param username
 */
export const stach = async (provider: anchor.AnchorProvider, mint: Keypair, userAta: PublicKey, amount: number, domain: string, username: string) => {
    const connection = provider.connection;
    const stacheProgram = new Program(StacheIdl, StacheIdl.metadata.address, provider);
    const keychainProgram = new Program(KeychainIdl, KeychainIdl.metadata.address, provider);

    const [domainPda] = findDomainPda(domain, keychainProgram.programId);
    const [stachePda, stachePdaBump] = findStachePda(username, domainPda, stacheProgram.programId);

    const stacheMintAta = getAssociatedTokenAddressSync(mint.publicKey, stachePda, true);

    // now let's stash via the stash instruction
    const tx = await stacheProgram.methods.stash(new anchor.BN(amount * 1e9)).accounts({
        stache: stachePda,
        stacheAta: stacheMintAta,
        mint: mint.publicKey,
        owner: provider.wallet.publicKey,
        fromToken: userAta,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
    }).transaction();

    const txid = await provider.sendAndConfirm(tx);

    console.log(`called > stash: stash 500 more tokens, txid: ${txid}`);
    let tokenAmount = await connection.getTokenAccountBalance(stacheMintAta);
    console.log(`new stache mint ata balance: ${tokenAmount.value.uiAmount}`);
    tokenAmount = await connection.getTokenAccountBalance(userAta);
    console.log(`new user ata balance: ${tokenAmount.value.uiAmount}`);
}

/**
 * 
 * Unstache 
 * @param provider 
 * @param mint 
 * @param userAta 
 * @param amount 
 * @param domain 
 * @param username 
 */

export const unstach = async (provider: anchor.AnchorProvider, mint: Keypair, userAta: PublicKey, amount: number, domain: string, username: string) => {

    const stacheProgram = new Program(StacheIdl, StacheIdl.metadata.address, provider);
    const keychainProgram = new Program(KeychainIdl, KeychainIdl.metadata.address, provider);
    const [domainPda] = findDomainPda(domain, keychainProgram.programId);

    const [stachePda, stachePdaBump] = findStachePda(username, domainPda, stacheProgram.programId);

    const stacheMintAta = getAssociatedTokenAddressSync(mint.publicKey, stachePda, true);

    const tx = await stacheProgram.methods.unstash(new anchor.BN(amount * 1e9)).accounts({
        stache: stachePda,
        stacheAta: stacheMintAta,
        mint: mint.publicKey,
        owner: provider.wallet.publicKey,
        toToken: userAta,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
    }).transaction();

    const txid = await provider.sendAndConfirm(tx);
}

/**
 * Destroy Stache
 * @param provider 
 * @param domain 
 * @param username 
 */

export const destroyStache = async (provider: anchor.AnchorProvider, domain: string, username: string) => {
    const stacheProgram = new Program(StacheIdl, StacheIdl.metadata.address, provider);
    const keychainProgram = new Program(KeychainIdl, KeychainIdl.metadata.address, provider);
    const [domainPda] = findDomainPda(domain, keychainProgram.programId);

    const [stachePda, stachePdaBump] = findStachePda(username, domainPda, stacheProgram.programId);
    const [userKeychainPda] = findKeychainPda(username, domain, keychainProgram.programId);

    const tx = await stacheProgram.methods.destroyStache().accounts({
        stache: stachePda,
        keychain: userKeychainPda,
        authority: provider.wallet.publicKey,
        keychainProgram: keychainProgram.programId,
        systemProgram: SystemProgram.programId,
    }).rpc();

    console.log(`destroyed stache for ${username} in tx: ${tx}`);
}

export const getStache = async (provider: anchor.AnchorProvider, domain: string, username: string) => {
    const stacheProgram = new Program(StacheIdl, StacheIdl.metadata.address, provider);
    const keychainProgram = new Program(KeychainIdl, KeychainIdl.metadata.address, provider);
    const [domainPda] = findDomainPda(domain, keychainProgram.programId);
    const [stachePda, stachePdaBump] = findStachePda(username, domainPda, stacheProgram.programId);

    const stache = await stacheProgram.account.currentStache.fetchNullable(stachePda);

    return stache
}