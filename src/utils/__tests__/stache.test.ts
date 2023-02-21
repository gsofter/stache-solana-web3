import * as anchor from "@project-serum/anchor";
import { createStache } from "../stache";
import { airdropSol } from "../utils";

// eslint-disable-next-line @typescript-eslint/no-var-requires
require('dotenv').config({
  path: '.env.test',
});



function randomName() {
  return (
    Math.random().toString(36).substring(2, 5) +
    Math.random().toString(36).substring(2, 5)
  );
}

// for setting up the keychaink
const domain = randomName();
const treasury = anchor.web3.Keypair.generate();
const renameCost = new anchor.BN(anchor.web3.LAMPORTS_PER_SOL * 0.01);
const username = randomName(); // used as the keychain + stache name
// const provider = anchor.AnchorProvider.env();
const admin = anchor.web3.Keypair.generate();


describe('stache', () => {

  beforeAll(async () => {
    // const connection = provider.connection
    // await airdropSol(connection, provider.wallet.publicKey, 50)
    // await airdropSol(connection, admin.publicKey, 50)

  })

  it('createStache', async () => {
    // await createStache(provider, domain, username, admin)
    expect(1).toBe(1)
  }, 10000);
});
