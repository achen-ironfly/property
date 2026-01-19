import {
    searchAddress,
    navigate,
    propertyValuation
} from "../src/property";


const sessions = new Map<string, any>();

const resolvers = {
  Query: {
    search: async (_: any, args: { address: string }, context: any) => {
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
    },

    valuation: async (_: any, args: { address: string }, context: any) => {
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
    } 
  }
};

export default resolvers;

