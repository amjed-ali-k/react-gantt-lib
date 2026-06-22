(function () {
  var key = 'rg-demo-theme';
  var theme = localStorage.getItem(key);
  var root = document.documentElement;
  if (theme === 'light') root.classList.add('demo-theme-light');
  else if (theme === 'dark') root.classList.add('demo-theme-dark');
})();
