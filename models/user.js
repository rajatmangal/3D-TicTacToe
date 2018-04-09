var mongoose = require('mongoose');
var passportLocalMongoose = require('passport-local-mongoose');

var UserSchema = new mongoose.Schema({
  firstName: String,
  lastName: String,
  username: String,
  age: Number,
  gender: String,
  email: String,
  password: String,
  gamesWon: Number,
  gamesLost: Number,
  totalPoints: Number,
  games: [{
    gameStart: Date,
    gameEnd: Date,
    result: String,
    moves: Number
  }]
});

// This adds some methods to the UserSchema
UserSchema.plugin(passportLocalMongoose);

module.exports = mongoose.model("User", UserSchema);
