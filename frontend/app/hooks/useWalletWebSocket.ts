// Stub WebSocket hook for MVP
export function useWalletWebSocket(address?: string | null, horizonUrl?: string | null) {
    return {
        balances: [],
        status: 'disconnected',
        error: null,
        connected: false,
        connect: () => { },
        disconnect: () => { },
    };
}
