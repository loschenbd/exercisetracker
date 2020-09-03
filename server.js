'use strict'

const express = require('express')
const app = express()
const bodyParser = require('body-parser')
require('dotenv').config()

const cors = require('cors')
var { MongoClient } = require('mongodb')
const mongoose = require('mongoose')
mongoose.connect("mongodb+srv://"+ process.env.MONGO_USER +":"+ process.env.MONGO_PASS +"@cluster0.nlxxb.mongodb.net/" +process.env.MONGO_DB,
  {useNewUrlParser: true,
  useUnifiedTopology: true
  });

//Check mongodb connection
var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function() {
  console.log("we're connected!");
});
// test for improper connections
mongoose.set('bufferCommands', false);
//
app.use(cors())

app.use(bodyParser.urlencoded({extended: false}))


app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});


//exercise schema
let workoutSchema = new mongoose.Schema({
  description: {type: String, required: true},
  duration: {type: Number, required: true},
  date: String
});

//user schema
let userSchema = new mongoose.Schema({
  username: {type: String, required: true},
  log: [workoutSchema]
});

//Declare models
let Workout = mongoose.model('Workout', workoutSchema);
let User = mongoose.model('User', userSchema);

//Writes user to db
const urlencodedParser = bodyParser.urlencoded({ extended: false});
app.post('/api/exercise/new-user', urlencodedParser, (req, res) => {
  let newUser = new User({ username: req.body.username });
  newUser.save((error, savedUser) => {
    if(!error){
      let resObj = {};
      resObj['_id'] = savedUser.id;
      resObj['username'] = savedUser.username;
      res.json(resObj);
    }
  })
});

// Post exercises to user
app.post('/api/exercise/add', urlencodedParser, (req, res) => {
  let newWorkout = new Workout({
    description: req.body.description,
    duration: parseInt(req.body.duration),
    date: req.body.date
  })
  //Return current date if input left empty.
  if(newWorkout.date === ''){
    newWorkout.date = new Date().toISOString().substring(0, 10);
  }
  //modify user log
  User.findByIdAndUpdate(req.body.userId, {$push: {log: newWorkout}}, {new: true, useFindAndModify: false },
    (error, result) => {
      if(!error) {
        let resObj = {};
        resObj['_id'] = result.id;
        resObj['username'] = result.username;
        resObj['date'] = new Date(newWorkout.date).toDateString();
        resObj['description'] = newWorkout.description;
        resObj['duration'] = newWorkout.duration;
        res.json(resObj);
      }
  }
  )
})

// Get array of users
app.get('/api/exercise/users', (req, res) => {
  User.find({}, (error, result) => {
    if(!error){
      res.json(result);
    }
  })
})

//View exercise log by ID
app.get('/api/exercise/log', (req, res) => {
  User.findById(req.query.userId, (error, result) => {
    if(!error){
      let resObj = result;
      resObj['count'] = result.log.length;
      res.json(resObj)
    }
  })
});



// Not found middleware
app.use((req, res, next) => {
  return next({status: 404, message: 'not found1'})
})

// Error Handling middleware
app.use((err, req, res, next) => {
  let errCode, errMessage

  if (err.errors) {
    // mongoose validation error
    errCode = 400 // bad request
    const keys = Object.keys(err.errors)
    // report the first validation error
    errMessage = err.errors[keys[0]].message
  } else {
    // generic or custom error
    errCode = err.status || 500
    errMessage = err.message || 'Internal Server Error'
  }
  res.status(errCode).type('txt')
    .send(errMessage)
})

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening at http://localhost:' + listener.address().port)
});


