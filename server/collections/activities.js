Activities = new Mongo.Collection("activities");
Activities._ensureIndex({
    "uri": 1
}, {
    unique: true
});