fetch("http://localhost:3001/api/anime/links/naruto-shippuden-355/naruto-shippuden-355?ep=7822")
  .then(res => res.json())
  .then(data => console.log(JSON.stringify(data, null, 2)))
  .catch(console.error);
