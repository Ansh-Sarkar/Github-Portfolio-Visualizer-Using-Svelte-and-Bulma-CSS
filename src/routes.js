import Home from './routes/Home.svelte';
import UserStats from './routes/UserStats.svelte';

export const routes = {
    '/': Home,
    '/users/:username': UserStats,
}