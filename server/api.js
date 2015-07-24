var mainUrl = "http://api.runkeeper.com";

var userURI = "/user";
var userType = "application/vnd.com.runkeeper.User+json";

var fitnessActivitiesURI = "/fitnessActivities";
var fitnessActivityFeedType = "application/vnd.com.runkeeper.FitnessActivityFeed+json";


var fitnessActivityType = "application/vnd.com.runkeeper.FitnessActivity+json";

getUser = function(user,callback, error) {
    _get(getAccessToken(user), mainUrl + userURI, userType, function(result) {
        callback(result);
    }, error);

};

getPage = function(user, uri, callback, error) {
    var url = mainUrl + (uri ? uri : fitnessActivitiesURI);
    _get(getAccessToken(user), url, fitnessActivityFeedType, function(result) {
        callback(result);
    }, error);
}

getActivity = function(user, uri, callback, error) {
    var url =  mainUrl + uri;
    _get(getAccessToken(user), url, fitnessActivityType, function(result) {
        callback(result);
    }, error);
}

function _get(accessToken, url, type, callback, errorCallback) {
    HTTP.get(url, {
        headers: {
            Accept: type,
            Authorization: 'Bearer ' + accessToken
        }
    }, function(error, result) {
        if (result && callback) {
            callback(JSON.parse(result.content));
        }
        if (error && errorCallback) {
            errorCallback();
        }
    });
}

function getAccessToken(user) {
    return user.services.runkeeper.accessToken;
}