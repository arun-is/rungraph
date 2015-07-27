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
            .delay(60 * 30 * 1000)
            .repeat({
                wait: 60 * 30 * 1000
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
    }

    // workers

    function processNewUser(job, callback) {
        var user = getUser(job.data.userId);

        getPage(user, null, function(result) {
            Meteor.users.update(user, {
                $set: {
                    totalActivities: result.size
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
        var user = getUser(job.data.userId);

        var inProgress = user.savedActivities + user.activeJobs;
        getPage(user, uri, function(result) {
            //if activites are saved, then do nothing
            //if jobs + saved is higher than total, then something went wrong
            if (result.size === inProgress) {
                console.log('page job. nothing to download');
                completeJob(job, callback);
            } else if (result.size > inProgress) {
                console.log('page job. new items found');
                _pageCallback(job, callback, result);
            } else {
                console.log('page job. inProgress greater than total');
                completeJob(job, callback);
            }
        }, function() {
            console.log('page failed. retrying');
            failJob(job, callback)
        });

    }

    function processPeriodicPage(job, callback) {
        console.log('periodic page.');
        var userId = job.data.userId;
        if (findInProgressJobs(userId) > 1) {
            completeJob(job, callback);
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
    }

    function _pageCallback(job, callback, result) {
        var userId = job.data.userId;
        var user = getUser(userId);

        for (var i = 0; i < result.items.length; i++) {
            var uri = result.items[i].uri;

            //don't do anthing if this activity exists
            //or if a job exists for it 
            var activityExists = findActivityByURI(userId, uri);
            var jobExists = findJobByURI(userId, uri);
            if (!activityExists && !jobExists) {
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

        //calculate counts after job is finished to make sure current job is correctly counted
        var userId = job.data.userId;
        var user = getUser(userId);
        Meteor.users.update(user, {
            $set: {
                savedActivities: findAllActivites(userId).count(),
                activeJobs: findInProgressActivityJobs(userId).count()
            }
        });
    }

    function failJob(job, callback) {
        job.fail();
        callback();
    }
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
        .delay(60 * 30 * 1000)
        .repeat({
            wait: 60 * 30 * 1000
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
}

// workers

function processNewUser(job, callback) {
    var user = getUser(job.data.userId);

    getPage(user, null, function(result) {
        Meteor.users.update(user, {
            $set: {
                totalActivities: result.size,
                savedActivities: 0,
                activeJobs: 0
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
    var user = getUser(job.data.userId);
    
    var inProgress = user.savedActivities + user.activeJobs;
    getPage(user, uri, function(result) {
        //if activites are saved, then do nothing
        //if jobs + saved is higher than total, then something went wrong
        if(result.size === inProgress) {
            console.log('page job. nothing to download');
            completeJob(job, callback);
        } else if (result.size > inProgress) {
            console.log('page job. new items found');
            _pageCallback(job, callback, result);
        } else {
            console.log('page job. inProgress greater than total' + user.savedActivities + ' ' + user.activeJobs + ' ' + result.size);
            completeJob(job, callback);
        }
    }, function() {
        console.log('page failed. retrying');
        failJob(job, callback)
    });
    
}

function processPeriodicPage(job, callback) {
    console.log('periodic page.');
    var userId = job.data.userId;
    if(findInProgressJobs(userId) > 1) {
        completeJob(job, callback);
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
}

function _pageCallback(job, callback, result) {
    var userId = job.data.userId;
    var user = getUser(userId);
    
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
    
    //calculate counts after job is finished to make sure current job is correctly counted
    var userId = job.data.userId;
    var user = getUser(userId);
    Meteor.users.update(user, {
        $set: {
            savedActivities: findAllActivites(userId).count(),
            activeJobs: findInProgressActivityJobs(userId).count()
        }
    });
}

function failJob(job, callback) {
    job.fail();
    callback();
}