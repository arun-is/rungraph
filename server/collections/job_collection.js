Jobs = JobCollection('jobQueue');

findInProgressJobs = function(userId) {
    return Jobs.find({
        'data.userId': userId,
        'status': {
            $ne: 'completed'
        }
    });
}

findInProgressActivityJobs = function(userId) {
    return Jobs.find({
        'data.userId': userId,
        'status': {
            $ne: 'completed'
        },
        type: 'processActivity'
    })
}

findJobByURI = function(userId, uri) {
    return Jobs.findOne({
        'data.userId': userId,
        'data.uri': uri
    });
}

findAllJobs = function(userId, type) {
    return Jobs.find({
        'data.userId': userId,
        'status': {
            $ne: 'completed'
        },
        'type': type
    });
}