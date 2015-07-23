/*Accounts.onLogin(function(user) {
    init(user.user); //strip out everything but actual user object
});*/

/*                                       
                                                                 
Basic Job Flow                                                   
                                                                 
                                                                 
╔═══════════════════════════╗      processNewUser is run when a  
║processNewUser             ║      new user is created. It mainly
║---------------------------║      initializes some counters.    
║total = 0                  ║                                    
║saved = 0                  ║      future: move to using db table
║active = 0                 ║      counts instead of maintaining 
╚═══════════════════════════╝      counters                      
              │                                                  
 every       get                                                 
 hour        first                                               
   ●         page                                                
   │          │        get                                       
   └──────────┼────────next───┐                                  
              │        page   │                                  
              ▼               │                                  
╔═══════════════════════════╗ │    getPage processes a page worth
║getPage                    ║ │    of information                
║---------------------------║ │                                  
║if(total > saved + active) ║ │    for new user, this is called  
║    page = getPage()       ║ │    repeatedly to download all    
║                           ║ │    pages worth of activities     
║    for page.items ●───────╬─┼─┐                                
║                           ║ │ │                                
║    if(page.next) ●────────╬─┘ │                                
║                           ║   │                                
╚═══════════════════════════╝   │                                
                                │                                
              ┌─────────────────┘                                
              ▼                                                  
╔═══════════════════════════╗      checks if there is an activity
║getActivity(uri)           ║      or job for a given uri        
║---------------------------║                                    
║if(!activity(uri) &&       ║      if there isn't either, then it
║!activeJob(uri))           ║      downloads new info and saves  
║    createJob(uri)         ║      it to the db                  
║    active++               ║                                    
╚═══════════════════════════╝                                                            
  
*/

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

Meteor.publish('user', function() {
    if (!this.userId) return null;
    return Meteor.users.find(this.userId, {
        fields: {
            totalActivities: 1,
            savedActivities: 1
        }
    });
});

Meteor.publish('activities', function() {
    return Activities.find();
})

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

function createNewGetActivityJob(uri, userId) {
    var job = new Job(jobs, 'getActivity', {
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

//Worker Functions

function processNewUser(job, callback) {
    var userId = job.data.userId;
    var user = getUser(userId);
    var accessToken = getAccessToken(user);

    getActivities(accessToken, null, function(result) {
        Meteor.users.update(user, {
            $set: {
                totalActivities: result.size,
                savedActivities: 0,
                activeJobs: 0
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
    var user = getUser(userId);
    var accessToken = getAccessToken(user);
    getActivities(accessToken, uri, function(result) {
        for (var i = 0; i < result.items.length; i++) {
            var uri = result.items[i].uri;
            createNewGetActivityJob(uri, userId);
        }

        if (result.next) {
            createNewGetPageJob(result.next, userId);
        }

        job.done();
        callback();
    });
}

function getActivity(job, callback) {
    var uri = job.data.uri;
    var userId = job.data.userId;
    var user = getUser(userId);
    var accessToken = getAccessToken(user);
    if(!Activities.findOne({uri:uri, userId: userId})) {
        
    }
    getActivityByUri(accessToken, uri, function(result) {
        result.userId = userId;
        
            Activities.insert(result);
            Meteor.users.update(user, {
                $inc: {
                    savedActivities: 1
                }
            });
        
        job.done();
        callback();
    });
    
}

function getUser(userId) {
    return user = Meteor.users.findOne({
        _id: userId
    });
}

function getAccessToken(user) {
    return user.services.runkeeper.accessToken;;
}

