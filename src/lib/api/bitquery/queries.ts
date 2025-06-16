// GraphQL queries for Bitquery Solana API

export const GET_TOKEN_TRANSFERS = `
  query GetTokenTransfers($mintAddress: String!, $limit: Int = 50, $offset: Int = 0) {
    Solana {
      Transfers(
        where: {
          Transfer: {
            Currency: { MintAddress: { is: $mintAddress } }
          }
          Transaction: {
            Result: { Success: { is: true } }
          }
        }
        orderBy: { descending: Transaction_Block_Time }
        limit: { count: $limit }
      ) {
        Transaction {
          Signature
          Result {
            Success
          }
        }
        Transfer {
          Amount
          Currency {
            Symbol
            Name
            MintAddress
          }
          Sender {
            Address
          }
          Receiver {
            Address
          }
        }
      }
    }
  }
`;

export const GET_TOP_HOLDERS = `
  query GetTopHolders($mintAddress: String!, $limit: Int = 10) {
    Solana {
      BalanceUpdates(
        where: {
          BalanceUpdate: {
            Currency: { MintAddress: { is: $mintAddress } }
          }
        }
        orderBy: { descending: Balance_Amount }
        limit: { count: $limit }
      ) {
        Balance {
          Amount
        }
        BalanceUpdate {
          Account {
            Address
          }
          Currency {
            Symbol
            Name
            MintAddress
          }
        }
      }
    }
  }
`;

export const GET_DEX_TRADES = `
  query GetDexTrades($mintAddress: String!, $limit: Int = 100, $offset: Int = 0) {
    Solana {
      DEXTrades(
        where: {
          or: [
            { Trade: { Buy: { Currency: { MintAddress: { is: $mintAddress } } } } }
            { Trade: { Sell: { Currency: { MintAddress: { is: $mintAddress } } } } }
          ]
          Transaction: {
            Result: { Success: { is: true } }
          }
        }
        orderBy: { descending: Transaction_Block_Time }
        limit: { count: $limit }
      ) {
        Transaction {
          Signature
        }
        Trade {
          Buy {
            Amount
            Currency {
              Symbol
              MintAddress
            }
            Account {
              Address
            }
          }
          Sell {
            Amount
            Currency {
              Symbol
              MintAddress
            }
            Account {
              Address
            }
          }
          Dex {
            ProgramAddress
            ProtocolName
            ProtocolFamily
          }
        }
      }
    }
  }
`;

export const GET_CREATOR_TRANSACTIONS = `
  query GetCreatorTransactions($creatorAddress: String!, $limit: Int = 100) {
    Solana {
      Instructions(
        where: {
          Transaction: {
            Signer: { is: $creatorAddress }
            Result: { Success: { is: true } }
          }
        }
        orderBy: { ascending: Transaction_Block_Time }
        limit: { count: $limit }
      ) {
        Transaction {
          Signature
          Result {
            Success
          }
          Signer
        }
        Instruction {
          Program {
            Address
            Name
          }
          InstructionType
        }
      }
    }
  }
`;

export const GET_TOKEN_METADATA = `
  query GetTokenMetadata($mintAddress: String!) {
    Solana {
      BalanceUpdates(
        where: {
          BalanceUpdate: {
            Currency: { MintAddress: { is: $mintAddress } }
          }
        }
        limit: { count: 1 }
      ) {
        Currency {
          Symbol
          Name
          MintAddress
          Decimals
          Uri
        }
        BalanceUpdate {
          Account {
            Address
          }
        }
      }
    }
  }
`;

export const GET_LIQUIDITY_POOLS = `
  query GetLiquidityPools($mintAddress: String!, $limit: Int = 50) {
    Solana {
      Instructions(
        where: {
          Instruction: {
            Program: {
              Address: {
                in: [
                  "675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8"
                  "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM"
                  "27haf8L6oxUeXrHrgEgsexjSY5hbVUWEmvv9Nyxg8vQv"
                ]
              }
            }
          }
          BalanceUpdate: {
            Currency: { MintAddress: { is: $mintAddress } }
          }
        }
        orderBy: { descending: Transaction_Block_Time }
        limit: { count: $limit }
      ) {
        Transaction {
          Signature
        }
        Instruction {
          Program {
            Address
            Name
          }
          InstructionType
          Data
        }
        BalanceUpdate {
          Account {
            Address
          }
          Amount
          Currency {
            Symbol
            MintAddress
          }
        }
      }
    }
  }
`;

export const GET_TOKEN_CREATION_INFO = `
  query GetTokenCreationInfo($mintAddress: String!) {
    Solana {
      Instructions(
        where: {
          Instruction: {
            Program: {
              Address: { is: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA" }
            }
            InstructionType: { is: "initializeMint" }
          }
          BalanceUpdate: {
            Currency: { MintAddress: { is: $mintAddress } }
          }
        }
        limit: { count: 1 }
        orderBy: { ascending: Transaction_Block_Time }
      ) {
        Transaction {
          Signature
          Signer
        }
        Instruction {
          Program {
            Address
            Name
          }
          InstructionType
          Data
        }
        BalanceUpdate {
          Account {
            Address
          }
          Currency {
            Symbol
            Name
            MintAddress
            Decimals
          }
        }
      }
    }
  }
`;

export const GET_RECENT_ACTIVITY = `
  query GetRecentActivity($mintAddress: String!, $hours: Int = 24) {
    Solana {
      Transfers(
        where: {
          Transfer: {
            Currency: { MintAddress: { is: $mintAddress } }
          }
          Transaction: {
            Result: { Success: { is: true } }
          }
        }
        orderBy: { descending: Transaction_Block_Time }
        limit: { count: 100 }
      ) {
        Transaction {
          Signature
        }
        Transfer {
          Amount
          Sender {
            Address
          }
          Receiver {
            Address
          }
        }
      }
    }
  }
`;

export const GET_WALLET_TOKEN_CREATIONS = `
  query GetWalletTokenCreations($walletAddress: String!, $limit: Int = 50) {
    Solana {
      Instructions(
        where: {
          Transaction: {
            Signer: { is: $walletAddress }
          }
          Instruction: {
            Program: {
              Address: { is: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA" }
            }
            InstructionType: { is: "initializeMint" }
          }
        }
        orderBy: { descending: Transaction_Block_Time }
        limit: { count: $limit }
      ) {
        Transaction {
          Signature
          Signer
        }
        BalanceUpdate {
          Currency {
            Symbol
            Name
            MintAddress
          }
        }
      }
    }
  }
`;

export const GET_DEX_VOLUME_24H = `
  query GetDexVolume24h($mintAddress: String!) {
    Solana {
      DEXTrades(
        where: {
          or: [
            { Trade: { Buy: { Currency: { MintAddress: { is: $mintAddress } } } } }
            { Trade: { Sell: { Currency: { MintAddress: { is: $mintAddress } } } } }
          ]
          Transaction: {
            Result: { Success: { is: true } }
          }
        }
      ) {
        Trade {
          Buy {
            Amount
            Currency {
              Symbol
            }
          }
          Sell {
            Amount
            Currency {
              Symbol
            }
          }
          Dex {
            ProtocolName
          }
        }
      }
    }
  }
`; 