import {
    searchAddress,
    navigate,
    propertyValuation
} from "../src/property";
import RequestQueue from "./queue";

const sessions = new Map<string, any>();
const requestQueue = new RequestQueue(3); 
let symbolCount = 0;
let referencesCount = 0;

const resolvers = {
    Query: {
        symbol: async (_: any, args: { code: string }, context: any) => {
            return requestQueue.enqueue(async () => {
                symbolCount++;
                console.log(`[Symbol] symbol request #${symbolCount} for code: ${args.code}`);

                const sessionId = context.sessionId || `session-${Date.now()}`;
                if (sessions.has(sessionId) && sessions.get(sessionId).browser) {
                    await sessions.get(sessionId).browser.close();
                }
                
                const { candidates, selectedAddress, page, browser, context: browserContext } = await searchAddress(args.code, true);
                sessions.set(sessionId, {
                    page,
                    browser,
                    context: browserContext,
                    selectedAddress,
                    candidates
                });       
                
                const symbols = candidates.map((candidate: any) => ({
                    code: candidate.address,
                    name: `Candidate ID: ${candidate.id.toString()}`,
                    currency: "AUD"
                }));

                console.log(`[Symbol] symbol request completed`);
                return symbols;
            });
        },

        references: async (_: any, args: { symbol: string; startDate?: Date; endDate?: Date; option?: any }, context: any) => {
            return requestQueue.enqueue(async () => {
                referencesCount++;
                console.log(`[References] references request for symbol: ${args.symbol}`);

                const sessionId = context.sessionId;
                const querySymbol = args.symbol;

                if (!sessionId || !sessions.has(sessionId)) {
                    throw new Error(`Session not found. SessionId: ${sessionId}`);
                }
                    
                const session = sessions.get(sessionId);
                    
                if (!session.page || !session.selectedAddress) {
                    throw new Error("No symbol found in session");
                }
                    
                const targetAddress = querySymbol || session.selectedAddress;            
                const hasValuation = await navigate(session.page, targetAddress);
                
                const matchedCandidate = session.candidates.find((candidate: any) => 
                    candidate.address === targetAddress
                );
                const candidateId = matchedCandidate?.id ?? "Unknown";
                
                let rate: any;
                let resultAddress = targetAddress;
                
                if (!hasValuation) {
                    console.log("No valuation found for address:", targetAddress);
                    rate = { message: "No valuation available for the specified address" };
                } else {
                    const result = await propertyValuation(session.page, targetAddress);
                    
                    if (!result || 'error' in result) {
                        console.error("Property valuation failed:", result);
                        await session.browser.close();
                        sessions.delete(sessionId);
                        throw new Error(result?.error || "Failed to get property valuation");
                    }
                    
                    resultAddress = result.address;
                    rate = {
                        low: result.low,
                        high: result.high,
                        confidence: result.confidence
                    };
                }
                
                await session.browser.close();
                sessions.delete(sessionId);
                
                console.log(`[References] property valuation completed`);
                return {
                    total: 1,
                    info: {
                        cursor: null,
                        hasNext: false
                    },
                    nodes: [{
                        symbol: {
                            code: resultAddress,
                            name: `Candidate ID: ${candidateId}`,
                            currency: "AUD"
                        },
                        rate,
                        date: new Date().toISOString()
                    }]
                };
            });
        },
    }
};

export default resolvers;

