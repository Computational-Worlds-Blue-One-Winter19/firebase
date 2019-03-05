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
 * Check if a score qualifies where rank <= MAX_RANK
 */
exports.checkScore = functions.https.onRequest((req, res) => {




});


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

  let result = {};
  result.userRank = {};
  
  db.collection(COLLECTION_NAME).orderBy('score', 'desc').limit(MAX_RANK).get()
  .then(snapshot => {
    let scores = [];

    let rank = 0;
    let previousScore = Infinity;
    let currentCount = 1;
    
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
        scores.push(row);
      }
    });

    return scores;
  }).then(data => {
    result.leaderboard = data || new Array();

    if (name) {
      // check for name within data
      for (let e of result.leaderboard) {
        if (e.name === name) {
          result.userRank.rank = e.rank;
          result.userRank.score = e.score;
        }
      }
    }

    return res.send(result);
  }).catch(error => {
    console.log(error);
    return res.status(500).end();
    
  });
});


// examples
exports.getMessage = functions.https.onRequest((req, res) => {
  
  db.collection('/messages').get()
  .then(snapshot => {
    let data = [];

    snapshot.forEach(doc => {
      data.push(doc.data());
    })
    return res.send({ data });
  }).catch(err => {
    return res.send({ error: err });
  });

});

exports.addMessage = functions.https.onRequest((req, res) => {
  let original = escapeHtml(req.body.text);
  
  db.collection('/messages').add({
    original: original
  })
  .then(() => {
    return res.send({ result: 'success', message: original })
  }).catch(err => {
    return res.status(500).end();
  });
  
});
