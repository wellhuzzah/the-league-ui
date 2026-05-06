import axios from 'axios'

// Single Axios instance for all API calls
// Change this one URL to point anywhere — dev, prod, doesn't matter
const client = axios.create({
    baseURL: 'http://192.168.1.4:8001',
    headers: {
        'Content-Type': 'application/json'
    }
})

export default client
