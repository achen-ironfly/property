import {
    searchAddress,
    navigate,
    propertyValuation
} from "../src/property";
import RequestQueue from "./queue";

const sessions = new Map<string, any>();
const requestQueue = new RequestQueue(3); 
let searchCount = 0;
let valuationCount = 0;

const resolvers = {
    Query: {
        search: async (_: any, args: { address: string }, context: any) => {
            return requestQueue.enqueue(async () => {
                searchCount++;
                console.log(`[Stats] search request #${searchCount} for address: ${args.address}`);

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
            return requestQueue.enqueue(async () => {
                valuationCount++;
                console.log(`[Stats] valuation request #${valuationCount} for address: ${args.address}`);

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
                const hasValuation = await navigate(session.page, targetAddress);
                
                if (!hasValuation) {
                    await session.browser.close();
                    sessions.delete(sessionId);
                    return {
                        address: targetAddress,
                        low: null,
                        high: null,
                        confidence: null,
                        message: "No valuation available for the specified address"
                    };
                }
                
                const result = await propertyValuation(session.page, targetAddress);
                await session.browser.close();
                sessions.delete(sessionId);
                
                return result;
            });
        },
    }
};

export default resolvers;

