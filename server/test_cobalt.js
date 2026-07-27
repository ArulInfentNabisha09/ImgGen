const axios = require('axios');
axios.post('https://api.cobalt.tools/api/json', { url: 'https://www.instagram.com/p/Dax2J2LEl5G/' }, {
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    'User-Agent': 'Mozilla/5.0'
  }
}).then(r => console.log(JSON.stringify(r.data, null, 2)))
  .catch(e => console.log(e.response ? e.response.data : e.message));
