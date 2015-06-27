var mainUrl = "http://api.runkeeper.com";
var userURI = "/user";

var accessToken;
var user;

function getUser() {
  HTTP.get(mainUrl + userURI, {
    headers: {
      Accept: 'application/vnd.com.runkeeper.User+json',
      Authorization: 'Bearer ' + accessToken
    }
  },function(error, result) {
    if(result) {
      user = JSON.parse(result.content);
      console.log(user)
      getActivities();
    }
    if(error) {
      console.error(result);
    }
  })
};

function getActivities() {
  HTTP.get(mainUrl + user["fitness_activities"], {
    headers: {
      Accept: 'application/vnd.com.runkeeper.FitnessActivityFeed+json',
      Authorization: 'Bearer ' + accessToken
    }
  },function(error, result) {
    if(result) {
      console.log(result);
    }
    if(error) {
      console.error(result);
    }
  })
}

init = function(user) {
  if(user && user.services && user.services.runkeeper) {
    accessToken = user.services.runkeeper.accessToken;
    getUser();
  }
}

Meteor.methods({
  
});


