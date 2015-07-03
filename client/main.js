Meteor.startup(function() {
    console.log('front end loaded!');
});

Deps.autorun(function() {
    Meteor.subscribe('userData');
});

Template.progress.helpers({
    percentage: function() {
        var user = Meteor.user();
        if (user && !testNullUndefined(user.savedActivities) && !testNullUndefined(user.totalActivities)) {
            return (user.totalActivities === 0 ? 0 : ((user.savedActivities / user.totalActivities) * 100).toFixed(0)) + '%';
        } else {
            console.error("stuff isn't defined yet or something");
            return null;
        }
    }
});

function testNullUndefined(number) {
    return number === null || number === undefined;
}