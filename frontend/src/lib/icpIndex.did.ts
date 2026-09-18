export const idlFactory = ({ IDL }: any) => {
  const GetAccountTransactionsArgs = IDL.Record({
    max_results: IDL.Nat64,
    start: IDL.Opt(IDL.Nat64),
    account_identifier: IDL.Text,
  });

  const Tokens = IDL.Record({ e8s: IDL.Nat64 });

  const Operation = IDL.Variant({
    Approve: IDL.Record({
      fee: Tokens,
      from: IDL.Text,
      allowance: Tokens,
      spender: IDL.Text,
    }),
    Burn: IDL.Record({
      from: IDL.Text,
      amount: Tokens,
    }),
    Mint: IDL.Record({
      to: IDL.Text,
      amount: Tokens,
    }),
    Transfer: IDL.Record({
      to: IDL.Text,
      fee: Tokens,
      from: IDL.Text,
      amount: Tokens,
    }),
  });

  const TimeStamp = IDL.Record({
    timestamp_nanos: IDL.Nat64,
  });

  // TransactionInfo with optional/nullable fields to match mainnet ICP Index Canister
  const TransactionInfo = IDL.Record({
    memo: IDL.Nat64,
    icrc1_memo: IDL.Opt(IDL.Vec(IDL.Nat8)),
    operation: IDL.Opt(Operation),
    created_at_time: IDL.Opt(TimeStamp),
  });

  const Transaction = IDL.Record({
    id: IDL.Nat64,
    transaction: TransactionInfo,
  });

  const GetTransactionsResult = IDL.Record({
    balance: IDL.Nat64,
    transactions: IDL.Vec(Transaction),
    oldest_tx_id: IDL.Opt(IDL.Nat64),
  });

  const GetTransactionsResponse = IDL.Variant({
    Ok: GetTransactionsResult,
    Err: IDL.Text,
  });

  return IDL.Service({
    get_account_identifier_transactions: IDL.Func(
      [GetAccountTransactionsArgs],
      [GetTransactionsResponse],
      ['query']
    ),
  });
};
