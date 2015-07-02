/*Accounts.onLogin(function(user) {
    init(user.user); //strip out everything but actual user object
});*/
var jobs = JobCollection('jobQueue');

Meteor.startup(function() {
    jobs.startJobServer();

    jobs.processJobs('newUser', {
        pollInterval: 100
    }, function(job, callback) {
        processNewUser(job, callback);
    });

    jobs.processJobs('getPage', {
        pollInterval: 100
    }, function(job, callback) {
        getPage(job, callback);
    });
    
    jobs.processJobs('getActivity', {
        pollInterval: 100
    }, function(job, callback) {
        getActivity(job, callback);
    });
    return;
});

Accounts.onCreateUser(function(options, user) {
    user.profile = options.profile;

    createNewUserJob(user);
    return user;
});

Meteor.publish('userData', function() {
    if (!this.userId) return null;
    return Meteor.users.find(this.userId, {
        fields: {
            totalActivities: 1,
            savedActivities: 1
        }
    });
});

//New Job Functions

function createNewUserJob(user) {
    var job = new Job(jobs, 'newUser', {
        userId: user._id
    });

    job.priority('high')
        .retry({
            retries: 5,
            wait: 30 * 1000
        })
        .save();
}

function createNewGetPageJob(uri, userId) {
    var job = new Job(jobs, 'getPage', {
        uri: uri,
        userId: userId
    });

    job.priority('normal')
        .retry({
            retries: 5,
            wait: 30 * 1000
        })
        .save();
}

function createNewGetActivityJob(stub, userId) {
    var job = new Job(jobs, 'getActivity', {
        stub: stub,
        userId: userId
    });

    job.priority('normal')
        .retry({
            retries: 5,
            wait: 30 * 1000
        })
        .save();
}

//Worker Functions

function processNewUser(job, callback) {
    var userId = job.data.userId;
    var accessToken = getAccessToken(userId);
    var user = Meteor.users.findOne({
        _id: userId
    });
    
    getActivities(accessToken, null, function(result) {
        var savedActivities = getActivityCount(userId);
        Meteor.users.update(user, {
            $set: {
                totalActivities: result.size,
                savedActivities: savedActivities
            }
        });

        createNewGetPageJob(null, userId, accessToken);
        job.done();
        callback();
    });
    
}

function getActivityCount(userId) {
    return Activities.find({
        userId: userId
    }).count();
}

function getPage(job, callback) {
    var uri = job.data.uri;
    var userId = job.data.userId;
    var accessToken = getAccessToken(userId);
    getActivities(accessToken, uri, function(result) {
        for(var i = 0; i < result.items.length; i++) {
            var stub = result.items[i];
            createNewGetActivityJob(stub, userId);
        }
        
        if(result.next) {
            console.log(result.next);
        }
        
        job.done();
        callback();
    });
}

function getActivity(job, callback) {
  var stub = job.data.stub;
  var userId = job.data.userId;
  console.log(stub);
  job.done();
  callback();
}

function getAccessToken(userId) {
    var user = Meteor.users.findOne({
        _id: userId
    });
    
    return user.services.runkeeper.accessToken;;
}