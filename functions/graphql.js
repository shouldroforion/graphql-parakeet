const AWS = require("aws-sdk");
const dynamoDb = new AWS.DynamoDB.DocumentClient();

const {
    graphql,
    GraphQLSchema,
    GraphQLObjectType,
    GraphQLString,
    GraphQLNonNull
} = require("graphql");

// Since the DocumentClient uses a callback pattern, we"ll
// wrap these in promises.
const promisify = foo => new Promise((resolve, reject) => {
    foo((error, result) => {
        if (error) {
            reject(error)
        }
        else {
            resolve(result)
        }
    })
})

// This method just inserts the user's first name into the
// greeting message.
const getGreeting = firstName => promisify(callback =>
    dynamoDb.get({
        TableName: process.env.DYNAMODB_TABLE,
        Key: { firstName },
    }, callback))
    .then(result => {
        if (!result.Item) {
            return firstName
        }
        return result.Item.nickname
    })
    .then(name => `Hello, ${name}.`);

// This method updates user's first name with what is passed.
const changeNickname = (firstName, nickname) => promisify(callback =>
    dynamoDb.update({
        TableName: process.env.DYNAMODB_TABLE,
        Key: { firstName },
        UpdateExpression: "SET nickname = :nickname",
        ExpressionAttributeValues: {
            ":nickname": nickname
        }
    }, callback))
    .then(() => nickname);

// Here we declare the schema and resolvers for the query.
const schema = new GraphQLSchema({
    query: new GraphQLObjectType({
        name: "RootQueryType", // an arbitrary name
        fields: {

            // Query has a field called "greeting".
            greeting: {

                // We need to know the user's name to greet them.
                args: { firstName: { name: "firstName", type: new GraphQLNonNull(GraphQLString) } },

                // Greeting message is a string.
                type: GraphQLString,

                // Resolve to a greeting message.
                resolve: (parent, args) => getGreeting(args.firstName)
            }
        }
    }),

    mutation: new GraphQLObjectType({
        name: "RootMutationType", // An arbitrary name.
        fields: {
            changeNickname: {
                args: {

                    // Need the user's first name as well as a preferred nickname.
                    firstName: { name: "firstName", type: new GraphQLNonNull(GraphQLString) },
                    nickname: { name: "nickname", type: new GraphQLNonNull(GraphQLString) }
                },
                type: GraphQLString,

                // Update the nickname.
                resolve: (parent, args) => changeNickname(args.firstName, args.nickname)
            }
        }
    })
})

/**
 * Main function handler entry point.
 *
 * @param {*} event
 * @param {*} context
 */
let handler = (event, context, callback) =>


    graphql(schema, event.queryStringParameters.query) // @todo Change to accept body
    .then(
        result => callback(null, { statusCode: 200, body: JSON.stringify(result) }),
        err => callback(err)
    );

/**
 * Final export of local scope functions.
 */
module.exports = {
    handler: handler
};
