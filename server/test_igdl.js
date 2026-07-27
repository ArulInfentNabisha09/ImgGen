const instagramDl = require('instagram-url-direct');

instagramDl('https://www.instagram.com/p/Dax2J2LEl5G/')
  .then(res => console.log(JSON.stringify(res, null, 2)))
  .catch(err => console.error(err));
