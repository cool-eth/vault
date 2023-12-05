# Vault

## Specifications

#### There should be a ‘deposit’, and ‘withdraw’ function that any user can use to deposit and withdraw any whitelisted ERC-20 token on the contract.

#### There should also be three additional functions that only admins can call. 

- `pause`
  prevents new deposits or withdrawals from occurring.

- `unpause`
  enables new deposits or withdrawals from occurring.

- `whitelistToken` 
  admins call to whitelist tokens.

#### The code repository should contain testing for the contract as well. 

- The repository should also contain instructions in the readme for running tests.

#### The vault should be usable by any number of users.

## Smart Contract Functions

### Admin functions

- `pause()`
  Pause new deposits / withdraws.

- `unpause()`
  Enables new deposits / withdraws.

- `whitelistToken(address token, bool whitelist)`
  Add/remove token from whitelist.

### User functions

- `deposit(address token, uint256 amount)`
  Deposits ERC20 token.

- `withdraw(address token, uint256 amount)`
  Withdraws ERC20 token.

### Query functions

- `isWhitelistedToken(address token)`
  Returns if token is whitelisted or not.

- `allWhitelistedTokens()`
  Returns all whitelisted tokens in array.
  

## How to run the tests

#### Install

```
yarn install
```

#### Compile

```
yarn compile
```

#### Run test

```
yarn test
```

#### Run coverage test

```
yarn coverage
```