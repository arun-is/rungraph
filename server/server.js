Accounts.onCreateUser(function(options, user) {
    user.profile = options.profile;

    var userId = user._id;

    createNewUserJob(userId);
    createNewPeriodicPageJob(userId);

    return user;
});

Meteor.publish('user', function() {
    if (!this.userId) return null;
    return Meteor.users.find(this.userId, {
        fields: {
            totalActivities: 1,
            savedActivities: 1,
            activeJobs: 1
        }
    });
});

Meteor.publish('activities', function() {
    return Activities.find();
})

//Utilities

getUser = function(userId) {
    return user = Meteor.users.findOne({
        _id: userId
    });
}

getActivityCount = function(userId) {
    return Activities.find({
        userId: userId
    }).count();
}