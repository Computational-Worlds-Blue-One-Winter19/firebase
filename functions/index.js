const escapeHtml = require('escape-html');

// Get db object from Cloud Firestore
const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

const db = admin.firestore();

// App configuration
const CORS_DOMAIN = '*';
const COLLECTION_NAME = '/scores';
const MAX_RANK = 100;

/**
 * Check if a score qualifies to be on the leaderboard.
 * A score qualifies where rank <= MAX_RANK.
 */
exports.checkScore = functions.https.onRequest((req, res) => {
  // set CORS headers
  res.set('Access-Control-Allow-Origin', CORS_DOMAIN);

  if (req.method === 'OPTIONS') {
    res.set('Access-Control-Allow-Methods', 'GET');
    res.set('Access-Control-Allow-Headers', 'Content-Type');
    res.set('Access-Control-Max-Age', '3600');
    res.status(204).send('');
  } else if (req.method === 'GET') {
  
    // store parameters
    let data = req.query || {};
    let theScore = Number.parseInt(escapeHtml(data.score));
    
    if (theScore) {
      getAllScores().then(data => {
        let result;
        let rank;

        for (let e of data) {
          if (e.score <= theScore) {
            result = e.rank;
            break;
          } else {
            rank = e.rank + 1;
          }
        }

        if (!result) {
          result = rank;
        }

        if (result > MAX_RANK) {
          result = false;
        }
        
        return res.send({ rank: result });
      }).catch(error => {
        // db access error
        console.log({
          error: 'Cloud Firestore access error',
          function: 'checkScore',
          time: Date.UTC(),
          msg: error
        })
        return res.status(500).end();
      });

    } else {
      // handle missing parameters
      return res.status(400).end();
    }
  } else {
    // handle requests other than GET
    return res.status(405).end();
  }
});


/**
 * Adds a given name and score to the database.
 * pre-condition:   request type POST; contains name and score
 * post-condition:  name and score are stored in the db
 */
exports.postScore = functions.https.onRequest((req, res) => {
  // set CORS headers
  res.set('Access-Control-Allow-Origin', CORS_DOMAIN);

  if (req.method === 'OPTIONS') {
    res.set('Access-Control-Allow-Methods', 'POST');
    res.set('Access-Control-Allow-Headers', 'Content-Type');
    res.set('Access-Control-Max-Age', '3600');
    res.status(204).send('');
  } else if (req.method === 'POST') {

    // store parameters
    let data = req.body || {};
    let name = data.name ? escapeHtml(data.name) : undefined;
    let score = Number.parseInt(escapeHtml(data.score));

    if (name && score) {
      //check for existing record to update
      db.collection(COLLECTION_NAME).where('name', '==', name)
        .get()
        .then(snapshot => {
          
          if (snapshot.empty) {
            // insert new record
            let newPlayer = {
              name,
              score
            }
            db.collection(COLLECTION_NAME).add(newPlayer)
              .then(() => {
                return res.send({ result: 'success '});
              })
          } else {
            // update old record
            let docName = COLLECTION_NAME + '/' + snapshot.docs[0].id;
            let doc = db.doc(docName);

            doc.update({ score })
              .then(() => {
                return res.send({ result: 'success '});
              })
          }
          
        });
    } else {
      // handle missing parameters
      return res.status(400).end();
    }
  } else {
      // handle requests other than POST
      return res.status(405).end();
  }
});


// function to get scores
exports.getScores = functions.https.onRequest((req, res) => {
  // set CORS headers
  res.set('Access-Control-Allow-Origin', CORS_DOMAIN);

  if (req.method === 'OPTIONS') {
    res.set('Access-Control-Allow-Methods', 'GET');
    res.set('Access-Control-Allow-Headers', 'Content-Type');
    res.set('Access-Control-Max-Age', '3600');
    res.status(204).send('');
  } else if (req.method === 'GET') {  
  
    // store parameters
    let data = req.query || {};
    let name = data.name ? escapeHtml(data.name) : undefined;
    
    let result = {};
    result.userRank = {};
    
    getAllScores().then(data => {
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
      // db access error
      console.log({
        error: 'Cloud Firestore access error',
        function: 'getScores',
        time: Date.UTC(),
        msg: error
      })
      return res.status(500).end();
    });

  } else {
    // handle requests other than GET
    return res.status(405).end();
  }
});


/**
 * Get all scores from db and assign rank
 */
function getAllScores() {
  return db.collection(COLLECTION_NAME).orderBy('score', 'desc').limit(MAX_RANK).get()
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
  })
}
