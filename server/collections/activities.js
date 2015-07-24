Activities = new Mongo.Collection("activities");

Activities._ensureIndex({
    "uri": 1
}, {
    unique: true
});

findActivityByURI = function(userId, uri) {
    return Activities.findOne({uri:uri, userId: userId});
}

findAllActivites = function(userId) {
    return Activities.find({'userId': userId});
}