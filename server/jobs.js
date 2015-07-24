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

var Jobs = JobCollection('jobQueue');

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

    Jobs.processJobs('processActivity', {
        pollInterval: 100
    }, function(job, callback) {
        processActivity(job, callback);
    });
    
    Jobs.processJobs('periodicPage', {
        pollInterval: 100
    }, function(job, callback) {
        processPage(job, callback);
    });
    return;
});

createNewUserJob = function(userId) {
    var job = new Job(Jobs, 'processNewUser', {
        userId: userId
    });

    job.priority('high')
        .retry({
            retries: 5,
            wait: 30 * 1000
        })
        .save();
}

function createNewPageJob(uri, userId) {
    var job = new Job(Jobs, 'processPage', {
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

createNewPeriodicPageJob = function(userId) {
    var job = new Job(Jobs, 'periodicPage', {
        userId: userId
    });
    
    var date = new Date();
    date.setHours(date.getHours() + 1);
    
    job.priority('normal')
        .retry({
            retries: 5,
            wait: 30 * 1000
        })
        .after(date)
        .repeat({
          schedule: Jobs.later.parse.text('every 30 minutes')
        })
        .save();
}

function createNewActivityJob(uri, userId) {
    var job = new Job(Jobs, 'processActivity', {
        uri: uri,
        userId: userId
    });

    job.priority('normal')
        .retry({
            retries: 5,
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
    });

}

function processPage(job, callback) {
    var uri = job.data.uri;
    var userId = job.data.userId;
    var user = getUser(userId);
    
    var inProgress = user.savedActivities + user.activeJobs;
    
    //if activites are saved, then do nothing
    //if jobs + saved is higher than total, then something went wrong
    if(user.totalActivities < inProgress) {
        console.log('Somehow in progress is greater than total for user: ' + userId);
    } else if (user.totalActivities > inProgress) {
        getPage(user, uri, function(result) {
            _pageCallback(job, callback, result);
        });
        console.log('page job ran. new items found');
    } else {
        console.log('page job ran. nothing new');
    }
}

function processActivity(job, callback) {
    var uri = job.data.uri;
    var userId = job.data.userId;
    var user = getUser(userId);
    
    getActivity(user, uri, function(result) {
        result.userId = userId;
        
            Activities.insert(result);
            Meteor.users.update(user, {
                $inc: {
                    savedActivities: 1,
                    activeJobs: -1
                }
            });
    
        console.log('activity processed!');
        
        job.done();
        callback();
    });
    
}

function _pageCallback(job, callback, result) {
    var userId = job.data.userId;
    for (var i = 0; i < result.items.length; i++) {
        var uri = result.items[i].uri;
        
        //don't do anthing if this activity exists
        //or if a job exists for it 
        var activityExists = Activities.findOne({uri:uri, userId: userId});
        var jobExists = Jobs.findOne({'data.userId': userId, 'status':{$ne:'completed'}, 'data.uri': uri});
        if(activityExists || jobExists) {
            return;
        }
        createNewActivityJob(uri, userId);
    }
    
    Meteor.users.update(user, {
        $set: {
            totalActivities: result.size
        }
    });

    if (result.next) {
        createNewPageJob(result.next, userId);
    }
    
    console.log('page processed!');

    job.done();
    callback();
}