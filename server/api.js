var mainUrl = "http://api.runkeeper.com";

var userURI = "/user";
var userType = "application/vnd.com.runkeeper.User+json";

var fitnessActivitiesURI = "/fitnessActivities";
var fitnessActivityFeedType = "application/vnd.com.runkeeper.FitnessActivityFeed+json";


var fitnessActivityType = "application/vnd.com.runkeeper.FitnessActivity+json";

getUser = function(accessToken, callback) {
    _get(accessToken, mainUrl + userURI, userType, function(result) {
        callback(result);
    });

};

getActivities = function(accessToken, uri, callback) {
    var url = mainUrl + (uri ? uri : fitnessActivitiesURI);
    _get(accessToken, url, fitnessActivityFeedType, function(result) {
        callback(result);
    });
}

getActivityByUri = function(accessToken, uri, callback) {
    var url =  mainUrl + uri;
    _get(accessToken, url, fitnessActivityType, function(result) {
        callback(result);
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