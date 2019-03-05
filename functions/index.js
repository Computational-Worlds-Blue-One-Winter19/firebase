// used to parse HTML POST requests
const escapeHtml = require('escape-html');

// The Firebase Functions and Admin SDK
const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

const db = admin.firestore();

// App configuration
const COLLECTION_NAME = '/scores';
const MAX_RANK = 100;

/**
 * Adds a given name and score to the database.
 * pre-condition:   request type POST; contains name and score
 * post-condition:  name and score are stored in the db
 */
exports.postScore = functions.https.onRequest((req, res) => {
  // validate request type
  if (req.method !== 'POST') {
    return res.status(405).end();
  }

  // store parameters
  let data = req.body || {};
  let name = escapeHtml(data.name);
  let score = Number.parseInt(escapeHtml(data.score));

  // add parameters to database
  if (name && score) {

    let existing = db.collection(COLLECTION_NAME)

    db.collection(COLLECTION_NAME).add({
      name,
      score
    })
    .then(() => {
      return res.send({ result: 'success' });
    }).catch(err => {
      return res.status(500).end();
    });
  
  } else {
    return res.status(400).end();
  }

});


// function to get scores
exports.getScores = functions.https.onRequest((req, res) => {
  // validate request type
  if (req.method !== 'GET') {
    return res.status(405).end();
  }

  // store parameters
  let data = req.query || {};
  let name = escapeHtml(data.name);

  // get all leaderboard data
  let leaderboard = [];
  let userRank = {};

  let rank = 0;
  let previousScore = Infinity;
  let currentCount = 1;

  db.collection(COLLECTION_NAME).orderBy('score', 'desc').get()
  .then(snapshot => {
    snapshot.forEach(doc => {
      let row = doc.data();
            
      // advance rank counter
      if (previousScore > row.score) {
        previousScore = row.score;
        rank += currentCount;
        currentCount = 1;
      } else {
        currentCount += 1;
      }

      // add row to data
      if (rank <= MAX_RANK) {
        row.rank = rank;
        leaderboard.push(row);
      }

      // if user match then add to user data
      if (name === row.name) {
        userRank.rank = row.rank;
        userRank.score = row.score;
      }
    })
    return res.send({ leaderboard, userRank });
  }).catch(err => {
    return res.status(500).end();
  });

});


// // examples
// exports.getMessage = functions.https.onRequest((req, res) => {
  
//   db.collection('messages').get()
//   .then(snapshot => {
//     let data = [];

//     snapshot.forEach(doc => {
//       data.push(doc.data());
//     })
//     return res.send({ data });
//   }).catch(err => {
//     return res.send({ error: err });
//   });

// });

// exports.addMessage = functions.https.onRequest((req, res) => {
//   let original = escapeHtml(req.body.text);
  
//   db.collection('messages').add({
//     original: original
//   })
//   .then(() => {
//     return res.send({ result: 'success', message: original })
//   }).catch(err => {
//     return res.status(500).end();
//   });
  
// });