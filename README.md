# graphHistory

This is a nodejs application that retrieves attribute history. Be sure to change the following in the getHistory.js:

`const username = 'USERNAME';` \
`const password = 'PASSWORD';` \
`const url = 'https://YOURDOMAIN.collibra.com/graphql';` \

To run, modify `runMe.js` line 2: \
`fetchHistory("Alias");` \
You can run with empty attribute type like this: `fetchHistory();` \

Make sure you have nodejs installed \
Donwload and unzip code \
run `npm install -y` \

To execute: `node ./runMe.js`
