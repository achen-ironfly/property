import {
    searchAddress,
    navigate,
    propertyValuation
} from "../src/property";

const sessions = new Map<string, any>();
const requestQueue: Array<{
    resolve: (value: any) => void;
    reject: (reason?: any) => void;
    execute: () => Promise<any>;
}> = [];
let activeRequests = 0;
const MAX_ACTIVE_REQUESTS = 3;

const processQueue = async () => {
    if (activeRequests >= MAX_ACTIVE_REQUESTS || requestQueue.length === 0) {
        return;
    }

    activeRequests++;
    const { resolve, reject, execute } = requestQueue.shift()!;
    console.log(`[Queue] processing request active: ${activeRequests}, queue length: ${requestQueue.length}`);

    try {
        const result = await execute();
        resolve(result);
    } catch (error) {
        reject(error);
    } finally {
        activeRequests--;
        console.log(`[Queue] request completed, active: ${activeRequests}, queue length: ${requestQueue.length}`);
        processQueue();
    }
};

const queueRequest = async (execute: () => Promise<any>): Promise<any> => {
    return new Promise((resolve, reject) => {
        console.log(`[Queue] new request enqueued, active: ${activeRequests}, queue length: ${requestQueue.length + 1}`);
        requestQueue.push({ resolve, reject, execute });
        processQueue();
    });
};

const resolvers = {
    Query: {
        search: async (_: any, args: { address: string }, context: any) => {
            return queueRequest(async () => {
                const sessionId = context.sessionId || `session-${Date.now()}`;
                if (sessions.has(sessionId) && sessions.get(sessionId).browser) {
                    await sessions.get(sessionId).browser.close();
                }
                
                const { candidates, selectedAddress, page, browser, context: browserContext } = await searchAddress(args.address, true);
                sessions.set(sessionId, {
                    page,
                    browser,
                    context: browserContext,
                    selectedAddress,
                    candidates
                });       
                const addresses = candidates.map((candidate: any) => ({
                    id: candidate.id.toString(),
                    address: candidate.address
                }));

                return addresses;
            });
        },

        valuation: async (_: any, args: { address: string }, context: any) => {
            return queueRequest(async () => {
                const sessionId = context.sessionId;
                const queryAddress = args.address;

                if (!sessionId || !sessions.has(sessionId)) {
                    throw new Error(`Session not found. SessionId: ${sessionId}`);
                }
                    
                const session = sessions.get(sessionId);
                    
                if (!session.page || !session.selectedAddress) {
                    throw new Error("No address found in session");
                }
                    
                const targetAddress = queryAddress || session.selectedAddress;            
                await navigate(session.page, targetAddress);
                const result = await propertyValuation(session.page, targetAddress);
                await session.browser.close();
                sessions.delete(sessionId);
                    
                return result || {
                    address: targetAddress,
                    low: "N/A",
                    high: "N/A",
                    confidence: "N/A"
                };
            });
        } 
    }
};

export default resolvers;

