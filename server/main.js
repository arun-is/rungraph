Accounts.onLogin(function(user) {
    init(user.user); //strip out everything but actual user object
})


Meteor.startup(function () {
    
});

function init(user) {
    if (user && user.services && user.services.runkeeper) {
        accessToken = user.services.runkeeper.accessToken;
        getActivities(accessToken, function(result) {
            var toDownload = result.size - getActivityCount(user);
            if (toDownload) {
                console.log("Need to download " + toDownload + " more activities");
                downloadActivities(user, result);
            }
        });
    }
}

function getActivityCount(user) {
  return Activities.find({userId: user._id}).count();
}

function downloadActivities(user, result) {
    var items = result.items;
    for(var i = 0; i < items.length; i++) {
    }
}

downloadFullActivity = function(user, stubs) {
    
}