Accounts.onLogin(function(user) {
  init(user.user); //strip out everything but actual user object
})