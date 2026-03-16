// End-to-end test of new AnimeKai scraper via API
(async () => {
    // 1. Search
    const search = await fetch('http://localhost:3001/api/anime/search/scraper?q=naruto+shippuden').then(r => r.json());
    const first = search.data[0];
    console.log('Search first result:', JSON.stringify(first, null, 2));
    
    if (!first) { console.error('No results!'); process.exit(1); }
    
    // 2. Get episodes
    const eps = await fetch(`http://localhost:3001/api/anime/episodes/${encodeURIComponent(first.session)}`).then(r => r.json());
    const ep = eps.episodes?.[0];
    console.log('\nFirst episode:', JSON.stringify(ep, null, 2));
    
    if (!ep) { console.error('No episodes!'); process.exit(1); }
    
    // 3. Get links
    const links = await fetch(`http://localhost:3001/api/anime/links/${encodeURIComponent(first.session)}/${encodeURIComponent(ep.session)}`).then(r => r.json());
    console.log('\nStream links:', JSON.stringify(links.data?.slice(0, 3), null, 2));
})().catch(console.error);
