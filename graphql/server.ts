import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { readFileSync } from 'fs';
import path from 'path';
import resolvers from './resolvers';

export async function createGraphQLServer(app: any) {
    const typeDefs = readFileSync(
        path.join(__dirname, 'schema.graphql'),
        'utf8'
    );

    const server = new ApolloServer({
        typeDefs,
        resolvers,
    });

    const { url } = await startStandaloneServer(server, { 
        listen: { port: 4000 },
        context: async ({ req }) => {
            const sessionId = req.headers['session-id'] as string || req.headers['sessionid'] as string;
            // console.log(`[HTTP] Incoming request: ${req.method} ${req.url}, sessionId: ${sessionId}`);
            return { 
                sessionId: sessionId,
                userId: req.headers['userid'] as string,
                userSecret: req.headers['usersecret'] as string
            };
          },
        });
    console.log(`GraphQL Server running at ${url}`);
}
createGraphQLServer({}).catch(console.error);
