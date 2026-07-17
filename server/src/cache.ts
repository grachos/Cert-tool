import NodeCache from 'node-cache';

const cache = new NodeCache({ stdTTL: 300 }); // Default TTL: 5 minutes

export default cache;
