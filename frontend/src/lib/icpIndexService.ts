import { Actor, HttpAgent } from '@dfinity/agent';
import { Principal } from '@icp-sdk/core/principal';
import { idlFactory } from './icpIndex.did';

const ICP_INDEX_CANISTER_ID = 'qhbym-qaaaa-aaaaa-aaafq-cai';

export interface GetAccountTransactionsArgs {
  max_results: bigint;
  start?: [] | [bigint];
  account_identifier: string;
}

export interface Transaction {
  id: bigint;
  transaction: {
    memo: bigint;
    icrc1_memo?: [] | [Uint8Array];
    operation?: [] | [Operation];
    created_at_time?: [] | [{ timestamp_nanos: bigint }];
  };
}

export type Operation =
  | { Transfer: { to: string; fee: { e8s: bigint }; from: string; amount: { e8s: bigint } } }
  | { Mint: { to: string; amount: { e8s: bigint } } }
  | { Burn: { from: string; amount: { e8s: bigint } } }
  | { Approve: { fee: { e8s: bigint }; from: string; allowance: { e8s: bigint }; spender: string } };

export interface GetTransactionsResult {
  balance: bigint;
  transactions: Transaction[];
  oldest_tx_id?: [] | [bigint];
}

export interface GetTransactionsResponse {
  Ok?: GetTransactionsResult;
  Err?: any;
}

export async function createIcpIndexActor(identity?: any) {
  const agent = new HttpAgent({
    host: 'https://ic0.app',
    identity,
  });

  // Only fetch root key in development
  if (process.env.DFX_NETWORK !== 'ic') {
    await agent.fetchRootKey();
  }

  return Actor.createActor(idlFactory, {
    agent,
    canisterId: ICP_INDEX_CANISTER_ID,
  });
}

export async function getAccountTransactions(
  accountId: string,
  maxResults: number = 100,
  start?: bigint
): Promise<GetTransactionsResult | null> {
  try {
    const actor = await createIcpIndexActor();
    
    const args: GetAccountTransactionsArgs = {
      account_identifier: accountId,
      max_results: BigInt(maxResults),
      start: start !== undefined ? [start] : [],
    };

    const response = await (actor as any).get_account_identifier_transactions(args) as GetTransactionsResponse;
    
    if (response && 'Ok' in response && response.Ok) {
      // Normalize the response to handle null values
      const result = response.Ok;
      
      // Ensure transactions is always an array, never null
      if (!result.transactions || result.transactions === null) {
        result.transactions = [];
      }
      
      // Normalize each transaction to handle optional fields
      result.transactions = result.transactions.map(tx => ({
        ...tx,
        transaction: {
          memo: tx.transaction.memo,
          icrc1_memo: tx.transaction.icrc1_memo || [],
          operation: tx.transaction.operation || [],
          created_at_time: tx.transaction.created_at_time || [],
        }
      }));
      
      return result;
    } else if (response && 'Err' in response) {
      console.error('获取交易记录时出错:', response.Err);
      return null;
    }
    
    return null;
  } catch (error) {
    console.error('获取账户交易记录失败:', error);
    return null;
  }
}
