Meteor.startup(function() {
    console.log('front end loaded!');
});

Deps.autorun(function(){
  Meteor.subscribe('userData');
});