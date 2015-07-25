/*Accounts.onLogin(function(user) {
    init(user.user); //strip out everything but actual user object
});*/

/*                                                                                                                         
                                                                 
Basic Job Flow                                                   
                                                                 
                                                                 
╔═══════════════════════════╗      processNewUser is run when a  
║processNewUser             ║      new user is created. It mainly
║---------------------------║      initializes some counters.    
║page = getPage()           ║                                    
║                           ║      future: move to using db table
║total = page.size          ║      counts instead of maintaining 
║saved = 0                  ║      counters                      
║active = 0                 ║                                    
║                           ║                                    
║for page.items ●───────────╬───┐                                
║                           ║   │                                
║if(page.next) ●────────────╬─┐ │                                
╚═══════════════════════════╝ │ │                                
                              │ │                                
 every                        │ │                                
 hour                         │ │                                
   ●                          │ │                                
   │                          │ │                                
   └──────────┬───────────────┤ │                                
              │               │ │                                
              ▼               │ │                                
╔═══════════════════════════╗ │ │  getPage processes a page worth
║processPage                ║ │ │  of information                
║---------------------------║ │ │                                
║if(total > saved + active) ║ │ │  for new user, this is called  
║    page = getPage()       ║ │ │  repeatedly to download all    
║                           ║ │ │  pages worth of activities     
║    for page.items ●───────╬─┼─┤                                
║                           ║ │ │                                
║    if(page.next) ●────────╬─┘ │                                
╚═══════════════════════════╝   │                                
                                │                                
              ┌─────────────────┘                                
              ▼                                                  
╔═══════════════════════════╗      checks if there is an activity
║processActivity(uri)       ║      or job for a given uri        
║---------------------------║                                    
║if(!activity(uri) &&       ║      if there isn't either, then it
║!activeJob(uri))           ║      downloads new info and saves  
║    createJob(uri)         ║      it to the db                  
║    active++               ║                                    
╚═══════════════════════════╝                                    

*/



Meteor.startup(function() {
    Jobs.startJobServer();

    Jobs.processJobs('processNewUser', {
        pollInterval: 100
    }, function(job, callback) {
        processNewUser(job, callback);
    });

    Jobs.processJobs('processPage', {
        pollInterval: 100
    }, function(job, callback) {
        processPage(job, callback);
    });
    
    Jobs.processJobs('periodicPage', {
        pollInterval: 100
    }, function(job, callback) {
        processPeriodicPage(job, callback);
    });

    Jobs.processJobs('processActivity', {
        pollInterval: 100
    }, function(job, callback) {
        processActivity(job, callback);
    });
    
    
    return;
});

createNewUserJob = function(userId) {
    var job = new Job(Jobs, 'processNewUser', {
        userId: userId
    });

    job.priority('high')
        .retry({
            wait: 30 * 1000
        })
        .save();
}

var createNewPageJob = function(uri, userId) {
    var job = new Job(Jobs, 'processPage', {
        uri: uri,
        userId: userId
    });

    job.priority('normal')
        .retry({
            wait: 30 * 1000
        })
        .save();
}

createNewPeriodicPageJob = function(userId) {
    var job = new Job(Jobs, 'periodicPage', {
        userId: userId
    });
    
    job.priority('normal')
        .delay(60*30*1000)
        .repeat({
            wait: 60*30*1000
        })
        .save();
}

var createNewActivityJob = function(uri, userId) {
    var job = new Job(Jobs, 'processActivity', {
        uri: uri,
        userId: userId
    });

    job.priority('normal')
        .retry({
            wait: 30 * 1000
        })
        .save();
        
    Meteor.users.update(user, {
        $inc: {
            activeJobs: 1
        }
    });
}

// workers

function processNewUser(job, callback) {
    var userId = job.data.userId;
    var user = getUser(job.data.userId);

    getPage(user, null, function(result) {
        Meteor.users.update(user, {
            $set: {
                totalActivities: result.size,
                savedActivities: 0,           //TODO: get rid of this stuff 
                activeJobs: 0                 //TODO: get rid of this stuff
            }
        });
        
        _pageCallback(job, callback, result);
    }, function() {
        console.log('page failed. retrying');
        failJob(job, callback)
    });

}

function processPage(job, callback) {
    var uri = job.data.uri;
    var userId = job.data.userId;
    var user = getUser(userId);
    
    var inProgress = user.savedActivities + user.activeJobs;
    getPage(user, uri, function(result) {
        //if activites are saved, then do nothing
        //if jobs + saved is higher than total, then something went wrong
        if(result.size === inProgress) {
            console.log('page job. nothing to download');
        } else if (user.totalActivities > inProgress) {
            _pageCallback(job, callback, result);
            console.log('page job. new items found');
        } else {
            console.log('page job. inProgress greater than total');
        }
    }, function() {
        console.log('page failed. retrying');
        failJob(job, callback)
    });
    
}

function processPeriodicPage(job, callback) {
    console.log('periodic page.');
    var userId = job.data.userId;
    completeJob(job, callback)
    if(findInProgressJobs(userId) > 1) {
        job.done();
        callback();
        return;
    } else {
        processPage(job, callback);
    }
}

function processActivity(job, callback) {
    var uri = job.data.uri;
    var userId = job.data.userId;
    var user = getUser(userId);
    
    getActivity(user, uri, function(result) {
        result.userId = userId;
        
        Activities.insert(result);
        console.log('activity processed!');
        
        completeJob(job, callback)
    }, function() {
        console.log('activity failed. retrying');
        failJob(job, callback)
    });
    
    Meteor.users.update(user, {
        $set: {
            savedActivities: findAllActivites(userId).count(),
            activeJobs: findInProgressActivityJobs(userId).count()
        }
    });
    
}

function _pageCallback(job, callback, result) {
    var userId = job.data.userId;
    for (var i = 0; i < result.items.length; i++) {
        var uri = result.items[i].uri;
        
        //don't do anthing if this activity exists
        //or if a job exists for it 
        var activityExists = findActivityByURI(userId, uri);
        var jobExists = findJobByURI(userId, uri);
        if(!activityExists && !jobExists) {
            createNewActivityJob(uri, userId);
        }
    }
    
    Meteor.users.update(user, {
        $set: {
            totalActivities: result.size
        }
    });

    if (result.next) {
        createNewPageJob(result.next, userId);
    }

    completeJob(job, callback);
}

function completeJob(job, callback) {
    job.done();
    callback();
}

function failJob(job, callback) {
    job.fail();
    callback();
}