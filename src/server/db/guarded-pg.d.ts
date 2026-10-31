import pg from "pg";

export declare class GuardedPool extends pg.Pool {}
export declare class GuardedClient extends pg.Client {}
export declare const Pool: typeof GuardedPool;
export declare const Client: typeof GuardedClient;

declare const guardedPg: typeof pg & {
  Pool: typeof GuardedPool;
  Client: typeof GuardedClient;
};

export default guardedPg;

