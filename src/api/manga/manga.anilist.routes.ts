import { Router } from 'express';
import { anilistService } from '../anilist/anilist.service';

const router = Router();

// Top manga (by SCORE)
router.get('/top', async (req, res) => {
    try {
        const page = req.query.page ? parseInt(req.query.page as string) : 1;
        const perPage = req.query.limit ? parseInt(req.query.limit as string) : 24;
        const data = await anilistService.getTopManga(page, perPage);
        res.json(data);
    } catch (error) {
        console.error('Error in top manga route:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Popular manga (by POPULARITY)
router.get('/popular', async (req, res) => {
    try {
        const page = req.query.page ? parseInt(req.query.page as string) : 1;
        const perPage = req.query.limit ? parseInt(req.query.limit as string) : 24;
        const data = await anilistService.getPopularManga(page, perPage);
        res.json(data);
    } catch (error) {
        console.error('Error in popular manga route:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Top manhwa
router.get('/top/manhwa', async (req, res) => {
    try {
        const page = req.query.page ? parseInt(req.query.page as string) : 1;
        const perPage = req.query.limit ? parseInt(req.query.limit as string) : 24;
        const data = await anilistService.getPopularManhwa(page, perPage);
        res.json(data);
    } catch (error) {
        console.error('Error in top manhwa route:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Trending manga
router.get('/trending', async (req, res) => {
    try {
        const page = req.query.page ? parseInt(req.query.page as string) : 1;
        const perPage = req.query.limit ? parseInt(req.query.limit as string) : 10;
        const data = await anilistService.getTrendingManga(page, perPage);
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch trending manga' });
    }
});

// A-Z list
router.get('/az-list/:letter', async (req, res) => {
    try {
        const { letter } = req.params;
        const page = req.query.page ? parseInt(req.query.page as string) : 1;
        const perPage = req.query.limit ? parseInt(req.query.limit as string) : 18;
        const data = await anilistService.getMangaAZList(letter, page, perPage);
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch Manga A-Z list' });
    }
});

// Search manga
router.get('/search', async (req, res) => {
    try {
        const query = req.query.q as string;
        const page = req.query.page ? parseInt(req.query.page as string) : 1;
        const perPage = req.query.limit ? parseInt(req.query.limit as string) : 24;

        if (!query) {
            res.status(400).json({ error: 'Query parameter "q" is required' });
            return;
        }

        const data = await anilistService.searchManga(query, page, perPage);
        res.json(data);
    } catch (error) {
        console.error('Error in search manga route:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Manga by ID
router.get('/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
            res.status(400).json({ error: 'Invalid ID' });
            return;
        }

        const data = await anilistService.getMangaById(id);
        if (!data) {
            res.status(404).json({ error: 'Manga not found' });
            return;
        }
        res.json(data);
    } catch (error) {
        console.error('Error in manga by ID route:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Manga by genre
router.get('/genre/:name', async (req, res) => {
    try {
        const genre = req.params.name;
        const page = req.query.page ? parseInt(req.query.page as string) : 1;
        const perPage = req.query.limit ? parseInt(req.query.limit as string) : 24;

        const data = await anilistService.getMangaByGenre(genre, page, perPage);
        res.json(data);
    } catch (error) {
        console.error('Error in manga genre route:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Random manga
router.get('/random', async (req, res) => {
    try {
        const data = await anilistService.getRandomManga();
        res.json(data);
    } catch (error) {
        console.error('Error in random manga route:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;