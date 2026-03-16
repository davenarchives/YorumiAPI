const c = require('@consumet/extensions');

const providers = ['AnimeKai', 'AnimeSama', 'AnimeUnity', 'KickAssAnime'];

(async () => {
    for (const name of providers) {
        try {
            const provider = new c.ANIME[name]();
            const result = await Promise.race([
                provider.search('naruto'),
                new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 8000))
            ]);
            if (result && result.results && result.results.length > 0) {
                console.log(`\n✅ ${name} WORKS! First result:`, JSON.stringify(result.results[0], null, 2));
                // Try to get episode sources
                const id = result.results[0].id;
                const info = await provider.fetchAnimeInfo(id);
                const ep = info.episodes?.[0];
                console.log('First ep:', JSON.stringify(ep, null, 2));
                if (ep) {
                    const sources = await provider.fetchEpisodeSources(ep.id);
                    console.log('Sources (first 2):', JSON.stringify(sources.sources?.slice(0, 2), null, 2));
                }
            } else {
                console.log(`❌ ${name} returned empty results`);
            }
        } catch (e) {
            console.log(`❌ ${name} errored: ${e.message}`);
        }
    }
})();
