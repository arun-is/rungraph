var mainUrl = "http://api.runkeeper.com";

var userURI = "/user";
var userType = "application/vnd.com.runkeeper.User+json";

var fitnessActivitiesURI = "/fitnessActivities";
var fitnessActivityFeedType = "application/vnd.com.runkeeper.FitnessActivityFeed+json";


var fitnessActivityType = "application/vnd.com.runkeeper.FitnessActivity+json";

getUser = function(user,callback) {
    _get(getAccessToken(user), mainUrl + userURI, userType, function(result) {
        callback(result);
    });

};

getPage = function(user, uri, callback) {
    var url = mainUrl + (uri ? uri : fitnessActivitiesURI);
    _get(getAccessToken(user), url, fitnessActivityFeedType, function(result) {
        callback(result);
    });
}

getActivity = function(user, uri, callback) {
    var url =  mainUrl + uri;
    _get(getAccessToken(user), url, fitnessActivityType, function(result) {
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

function getAccessToken(user) {
    return user.services.runkeeper.accessToken;
}