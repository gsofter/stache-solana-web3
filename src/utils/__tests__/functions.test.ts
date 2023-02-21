
// eslint-disable-next-line @typescript-eslint/no-var-requires
require('dotenv').config({
  path: '.env.test',
});

describe('stashe', () => {
  it('stash', async () => {
    expect(1).toBe(1)
  }, 10000);
});
