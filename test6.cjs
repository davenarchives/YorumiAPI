const c = require('@consumet/extensions');

(async () => {
    const provider = new c.ANIME.AnimeKai();
    const result = await provider.search('naruto shippuden');
    console.log('Keys:', Object.keys(result));
    console.log('First result:', JSON.stringify(result.results[0], null, 2));
    
    const id = result.results[0].id;
    const info = await provider.fetchAnimeInfo(id);
    console.log('\nInfo keys:', Object.keys(info));
    console.log('Info id:', info.id, '| eps:', info.episodes?.length);
    const ep = info.episodes?.[0];
    console.log('First ep:', JSON.stringify(ep, null, 2));
    
    if (ep) {
        const sources = await provider.fetchEpisodeSources(ep.id);
        console.log('\nSources keys:', Object.keys(sources));
        console.log('Sources:', JSON.stringify(sources.sources?.slice(0, 3), null, 2));
    }
})().catch(console.error);
