const c = require('@consumet/extensions');

(async () => {
    const p = new c.ANIME.AnimeKai();
    const info = await p.fetchAnimeInfo('bleach-re3j');
    const ep = info.episodes[0];
    console.log('Full episode ID:', JSON.stringify(ep.id));
    
    // Now test via the API route
    const encoded = encodeURIComponent(ep.id);
    console.log('Encoded:', encoded);
    const url = `http://localhost:3001/api/anime/links/bleach-re3j/${encoded}`;
    console.log('Calling:', url);
    const res = await fetch(url);
    const json = await res.json();
    console.log('API Response:', JSON.stringify(json.data?.slice(0,2), null, 2));
})().catch(console.error);
