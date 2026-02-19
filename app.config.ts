import { ConfigContext, ExpoConfig } from "expo/config";

export default ({ config }: ConfigContext): ExpoConfig => {
    return {
        ...config,
        name: 'MyApp',
        slug: 'my-app',
        version: '1.0.0',
        extra: {
            // Put your "environment variables" here
            apiUrl: process.env.API_URL || 'http://10.0.2.2:4000',
            graphqlEndpoint: process.env.GRAPHQL_ENDPOINT || '/graphql',
            someKey: process.env.SOME_KEY || 'defaultKey',
        },
    };
};