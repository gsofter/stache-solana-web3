import * as anchor from "@project-serum/anchor";
import { Keypair } from "@solana/web3.js";
import { createStache, getStache } from "../stache";
import { airdropSol } from "../utils";

// eslint-disable-next-line @typescript-eslint/no-var-requires
require('dotenv').config({
  path: '.env',
});



function randomName() {
  return (
    Math.random().toString(36).substring(2, 5) +
    Math.random().toString(36).substring(2, 5)
  );
}

// for setting up the keychaink
const domain = randomName();
const renameCost = new anchor.BN(anchor.web3.LAMPORTS_PER_SOL * 0.01);
const username = randomName(); // used as the keychain + stache name
const provider = anchor.AnchorProvider.env();
const adminWallet = Keypair.fromSecretKey(
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

console.log("adminWallet => ", adminWallet.publicKey.toBase58())
console.log("provider.wallet.publicKey => ", provider.wallet.publicKey.toBase58())
console.log("treasurey.publicKey => ", treasury.publicKey.toBase58())

describe('stache', () => {

  beforeAll(async () => {
    // const connection = provider.connection
    // await airdropSol(connection, provider.wallet.publicKey, 1)
    // await airdropSol(connection, adminWallet.publicKey, 1)
  }, 10000)

  it('createStache', async () => {
    await createStache(provider, domain, username)

    const stache = await getStache(provider, domain, username)

    expect(stache).not.toBe(null)
    expect(stache.stacheId).toBe(username)
  }, 10000);
});
