var mainUrl = "http://api.runkeeper.com";

var userURI = "/user";
var userType = "application/vnd.com.runkeeper.User+json";

var fitnessActivitiesURI = "/fitnessActivities";
var fitnessActivityType = "application/vnd.com.runkeeper.FitnessActivityFeed+json";

function getUser(accessToken) {
    _get(accessToken, mainUrl + userURI, userType, function(result) {
        console.log(result);
        //getActivities(accessToken);
    });

};

function getActivities(accessToken) {
    _get(accessToken, mainUrl + fitnessActivitiesURI, fitnessActivityType, function(result) {
        console.log(result)
    });
}

function _get(accessToken, url, type, callback) {
    HTTP.get(url, {
        headers: {
            Accept: type,
            Authorization: 'Bearer ' + accessToken
        }
    }, function(error, result) {
        if (result && callback) {
            callback(JSON.parse(result.content));
        }
        if (error) {
            console.error(result);
        }
    });
}

init = function(user) {
    if (user && user.services && user.services.runkeeper) {
        accessToken = user.services.runkeeper.accessToken;
        getUser(accessToken);
    }
}

Meteor.methods({

});