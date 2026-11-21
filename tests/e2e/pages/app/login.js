// The sign-in of the "Relay" test app. The development account is dev@relay.test / trail-dev.
// A session is a cookie and a value in local storage, as apps keep one or the other, or both.
document.getElementById('login').addEventListener('submit', function (event) {
  event.preventDefault();
  var ok = document.getElementById('email').value === 'dev@relay.test' && document.getElementById('password').value === 'trail-dev';
  document.getElementById('error').hidden = ok;
  if (!ok) return;
  document.cookie = 'sid=dev; path=/; SameSite=Lax';
  localStorage.setItem('token', 't-dev');
  location.assign('./');
});
